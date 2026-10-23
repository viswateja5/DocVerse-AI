import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_upload_unauthorized(client: AsyncClient):
    """
    Tests upload endpoint returns 401 Unauthorized if no token is provided.
    """
    # Create empty dummy file contents
    files = {"file": ("test.pdf", b"dummy content", "application/pdf")}
    response = await client.post("/upload", files=files)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_query_unauthorized(client: AsyncClient):
    """
    Tests query endpoint returns 401 Unauthorized if no token is provided.
    """
    payload = {
        "question": "What is RAG?",
        "session_id": "test_session_id"
    }
    response = await client.post("/query", json=payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_sessions_unauthorized(client: AsyncClient):
    """
    Tests sessions listing endpoint returns 401 if unauthorized.
    """
    response = await client.get("/sessions")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_query_without_retrieval_or_web_results_does_not_call_llm(
    client: AsyncClient, monkeypatch
):
    await client.post(
        "/signup",
        json={"username": "empty_rag_user", "password": "ragpassword123"},
    )
    login = await client.post(
        "/login",
        data={"username": "empty_rag_user", "password": "ragpassword123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    upload = await client.post(
        "/upload",
        data={"session_id": "empty-rag-session"},
        files={"file": ("document.txt", b"Local RAG test document.", "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 201

    monkeypatch.setattr(
        "services.rag_engine.get_cached",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "services.rag_engine.set_cached",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "services.rag_engine.get_embeddings_model",
        MagicMock(return_value=MagicMock()),
    )
    monkeypatch.setattr(
        "services.rag_engine.load_vector_store",
        MagicMock(side_effect=RuntimeError("vector store unavailable")),
    )
    monkeypatch.setattr(
        "services.rag_engine.search_tavily",
        AsyncMock(
            side_effect=AssertionError(
                "Document-only retrieval must not fall back to web search"
            )
        ),
        raising=False,
    )
    monkeypatch.setattr(
        "services.rag_engine.get_llm",
        MagicMock(side_effect=AssertionError("LLM must not run without context")),
    )

    async with client.stream(
        "POST",
        "/query",
        json={
            "question": "What is in my uploaded document?",
            "session_id": "empty-rag-session",
        },
        headers=headers,
    ) as response:
        body = (await response.aread()).decode()

    assert response.status_code == 200
    assert "Local document retrieval is unavailable" in body
    assert "LLM must not run without context" not in body


def test_missing_local_faiss_index_fails_clearly(tmp_path, monkeypatch):
    from utils import faiss_store

    monkeypatch.setattr(faiss_store, "_cached_vector_store", None)

    with pytest.raises(FileNotFoundError, match="Upload documents or rebuild"):
        faiss_store.load_vector_store(str(tmp_path / "missing-vector-store"), object())

@pytest.mark.asyncio
async def test_admin_stats_flow(client: AsyncClient):
    """
    Tests registering, logging in, and retrieving admin statistics.
    """
    # 1. Signup and login to get token
    signup_payload = {
        "username": "admin_test",
        "password": "adminpassword123"
    }
    await client.post("/signup", json=signup_payload)
    
    login_payload = {
        "username": "admin_test",
        "password": "adminpassword123"
    }
    login_res = await client.post("/login", data=login_payload)
    token = login_res.json()["access_token"]
    
    # 2. Get stats with Bearer Token
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/admin/stats", headers=headers)
    assert response.status_code == 200
    
    stats = response.json()
    assert "total_users" in stats
    assert "total_chats" in stats
    assert "uploaded_documents" in stats
    assert "number_of_chunks" in stats
    assert "query_count" in stats
    assert "cache_hits" in stats
    assert "average_response_time" in stats
    
    # Verify we have at least 1 user in stats (our admin_test user)
    assert stats["total_users"] >= 1
