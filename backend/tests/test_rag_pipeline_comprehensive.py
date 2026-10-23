import json
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace

from langchain_core.documents import Document
from cache import redis_cache
from utils.loaders import load_document
from utils.search import filter_documents_by_ids


def test_redis_unavailable_fallback():
    """Verify local cache works seamlessly when Redis is offline."""
    orig_client = redis_cache.redis_client
    try:
        redis_cache.redis_client = None
        redis_cache.local_cache.clear()

        import asyncio
        asyncio.run(redis_cache.set_cached("test_key", {"foo": "bar"}))
        result = asyncio.run(redis_cache.get_cached("test_key"))
        assert result == {"foo": "bar"}
    finally:
        redis_cache.redis_client = orig_client


def test_document_extraction_and_empty_validation(tmp_path):
    """Test text extraction and validation for empty and unsupported files."""
    # 1. Valid TXT
    txt_file = tmp_path / "valid.txt"
    txt_file.write_text("Project Orion budget is ₹12 lakh.")
    docs = load_document(str(txt_file))
    assert len(docs) == 1
    assert "₹12 lakh" in docs[0].page_content

    # 2. Empty file rejection
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("")
    with pytest.raises(ValueError, match="empty or contains no extractable text"):
        load_document(str(empty_file))

    # 3. Unsupported file rejection
    bad_file = tmp_path / "archive.zip"
    bad_file.write_bytes(b"PK00fakezip")
    with pytest.raises(ValueError, match="Unsupported file extension"):
        load_document(str(bad_file))


def test_filter_documents_by_ids():
    """Ensure document isolation filtering correctly selects only allowed document IDs."""
    docs = [
        Document(page_content="Allowed A", metadata={"document_id": "doc_1"}),
        Document(page_content="Not allowed B", metadata={"document_id": "doc_2"}),
        Document(page_content="Allowed C", metadata={"document_id": "doc_3"}),
    ]
    allowed = {"doc_1", "doc_3"}
    filtered = filter_documents_by_ids(docs, allowed)
    assert len(filtered) == 2
    assert [d.page_content for d in filtered] == ["Allowed A", "Allowed C"]


@pytest.mark.asyncio
async def test_general_knowledge_stream_without_documents(client: AsyncClient, monkeypatch):
    """General knowledge query when no documents are uploaded routes directly to LLM."""
    signup = await client.post("/signup", json={"username": "gk_user", "password": "gkpassword123"})
    login = await client.post("/login", data={"username": "gk_user", "password": "gkpassword123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    class MockStreamLLM:
        async def astream(self, prompt):
            yield SimpleNamespace(content="Mukesh Ambani is an Indian businessman.")

    monkeypatch.setattr("routers.agent_router.get_llm", lambda **kwargs: MockStreamLLM())

    query_payload = {
        "question": "Who is Mukesh Ambani?",
        "session_id": "gk_session_1",
        "global_search": False,
    }

    content_received = ""
    decision_received = ""
    sources_received = []

    async with client.stream("POST", "/agent/query", json=query_payload, headers=headers) as response:
        assert response.status_code == 200
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if data.get("type") == "content":
                    content_received += data.get("data", "")
                elif data.get("type") == "decision":
                    decision_received = data.get("data", "")
                elif data.get("type") == "sources":
                    sources_received = data.get("data", [])

    assert decision_received == "llm"
    assert "Mukesh Ambani is an Indian businessman" in content_received
    assert sources_received == []


@pytest.mark.asyncio
async def test_document_grounded_answer_and_citations(client: AsyncClient, monkeypatch, mock_vector_store_dir):
    """Document fact query retrieves relevant chunks, cites sources, and answers factually."""
    signup = await client.post("/signup", json={"username": "rag_grounded_user", "password": "ragpassword123"})
    login = await client.post("/login", data={"username": "rag_grounded_user", "password": "ragpassword123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # Upload test document
    doc_text = "Project Orion has a budget of ₹12 lakh. The project deadline is 30 December 2026. The project lead is Priya Sharma."
    upload = await client.post(
        "/upload",
        data={"session_id": "orion_session"},
        files={"file": ("project_orion.txt", doc_text.encode("utf-8"), "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 201
    doc_id = upload.json()["document_id"]

    # Seed into vector store
    from utils.faiss_store import save_or_update_vector_store
    from utils.embeddings import get_embeddings_model
    doc = Document(
        page_content=doc_text,
        metadata={
            "session_id": "orion_session",
            "document_id": doc_id,
            "document_name": "project_orion.txt",
            "source": "project_orion.txt",
            "page": 0,
        }
    )
    save_or_update_vector_store([doc], get_embeddings_model(), mock_vector_store_dir)

    class MockGroundedLLM:
        async def astream(self, prompt):
            assert "₹12 lakh" in prompt
            assert "project_orion.txt" in prompt
            yield SimpleNamespace(content="Project Orion has a budget of ₹12 lakh.")

    monkeypatch.setattr("routers.agent_router.get_llm", lambda **kwargs: MockGroundedLLM())

    query_payload = {
        "question": "What is the budget for Project Orion?",
        "session_id": "orion_session",
        "global_search": False,
    }

    content_received = ""
    sources_received = []

    async with client.stream("POST", "/agent/query", json=query_payload, headers=headers) as response:
        assert response.status_code == 200
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if data.get("type") == "content":
                    content_received += data.get("data", "")
                elif data.get("type") == "sources":
                    sources_received = data.get("data", [])

    assert "Project Orion has a budget of ₹12 lakh." in content_received
    assert len(sources_received) > 0
    assert sources_received[0]["file"] == "project_orion.txt"


@pytest.mark.asyncio
async def test_insufficient_context_handling(client: AsyncClient, monkeypatch, mock_vector_store_dir):
    """When question is unknown in document, LLM clearly states insufficient info."""
    signup = await client.post("/signup", json={"username": "unknown_fact_user", "password": "ragpassword123"})
    login = await client.post("/login", data={"username": "unknown_fact_user", "password": "ragpassword123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    doc_text = "Project Orion has a budget of ₹12 lakh. The project deadline is 30 December 2026. The project lead is Priya Sharma."
    upload = await client.post(
        "/upload",
        data={"session_id": "unknown_fact_session"},
        files={"file": ("project_orion.txt", doc_text.encode("utf-8"), "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 201
    doc_id = upload.json()["document_id"]

    from utils.faiss_store import save_or_update_vector_store
    from utils.embeddings import get_embeddings_model
    doc = Document(
        page_content=doc_text,
        metadata={
            "session_id": "unknown_fact_session",
            "document_id": doc_id,
            "document_name": "project_orion.txt",
            "source": "project_orion.txt",
            "page": 0,
        }
    )
    save_or_update_vector_store([doc], get_embeddings_model(), mock_vector_store_dir)

    class MockInsufficientLLM:
        async def astream(self, prompt):
            yield SimpleNamespace(
                content="The uploaded documents do not contain information regarding Project Orion's office address."
            )

    monkeypatch.setattr("routers.agent_router.get_llm", lambda **kwargs: MockInsufficientLLM())

    query_payload = {
        "question": "What is Project Orion's office address?",
        "session_id": "unknown_fact_session",
        "global_search": False,
    }

    content_received = ""
    async with client.stream("POST", "/agent/query", json=query_payload, headers=headers) as response:
        assert response.status_code == 200
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if data.get("type") == "content":
                    content_received += data.get("data", "")

    assert "do not contain information" in content_received.lower() or "insufficient" in content_received.lower()


@pytest.mark.asyncio
async def test_empty_file_upload_rejected(client: AsyncClient):
    """Uploading an empty file returns 422 Unprocessable Entity."""
    signup = await client.post("/signup", json={"username": "empty_uploader", "password": "ragpassword123"})
    login = await client.post("/login", data={"username": "empty_uploader", "password": "ragpassword123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    upload = await client.post(
        "/upload",
        data={"session_id": "empty_session"},
        files={"file": ("empty.txt", b"", "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 422

