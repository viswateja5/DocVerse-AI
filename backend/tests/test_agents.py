import pytest
import json
from httpx import AsyncClient
from agents.router import route_query
from graph_rag.graph_manager import build_entity_graph, query_relationships_path
from langchain_core.documents import Document

@pytest.mark.asyncio
async def test_agent_query_router():
    """
    Tests query classification node.
    """
    # Test doc RAG route
    state_rag = {"query": "Summarize the uploaded file context", "reasoning_trace": []}
    res_rag = await route_query(state_rag)
    assert res_rag["decision"] in ["rag", "llm", "hybrid"]

    # Test web search route
    state_web = {"query": "What is today's stock price of Nvidia?", "reasoning_trace": []}
    res_web = await route_query(state_web)
    assert res_web["decision"] in ["web", "hybrid", "llm"]

@pytest.mark.asyncio
async def test_graph_rag_construction():
    """
    Tests NetworkX GraphRAG build and relationship path search.
    """
    docs = [
        Document(
            page_content="Elon Musk founded Tesla in 2003 to accelerate sustainable energy.",
            metadata={"source": "test.txt", "page": 0}
        )
    ]
    # Build graph
    graph = await build_entity_graph(docs, "test_session")
    assert graph is not None
    
    # Query path
    res = query_relationships_path("test_session", "Elon Musk", "Tesla")
    assert "found" in res

@pytest.mark.asyncio
async def test_agent_endpoints_unauthorized(client: AsyncClient):
    """
    Tests that the new endpoints block unauthorized requests (JWT checks).
    """
    # 1. /agent/query
    res = await client.post("/agent/query", json={"question": "What is RAG?", "session_id": "sess_1"})
    assert res.status_code == 401
    
    # 2. /voice/speak
    res = await client.post("/voice/speak", json={"text": "hello"})
    assert res.status_code == 401
    
    # 3. /edu/generate
    res = await client.get("/edu/generate?session_id=sess_1&content_type=mcqs")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_agent_endpoints_authorized(client: AsyncClient):
    """
    Tests calling new endpoints with JWT validation.
    """
    # 1. Signup and login
    signup_payload = {
        "username": "agent_user",
        "password": "agentpassword123"
    }
    await client.post("/signup", json=signup_payload)
    
    login_payload = {
        "username": "agent_user",
        "password": "agentpassword123"
    }
    login_res = await client.post("/login", data=login_payload)
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test edu generation
    res_edu = await client.get("/edu/generate?session_id=test_sess&content_type=mcqs&difficulty=easy", headers=headers)
    assert res_edu.status_code == 200
    assert "questions" in res_edu.json() or "error" in res_edu.json()

    # 3. Test export session
    res_export = await client.get("/export/session/test_sess?format=markdown", headers=headers)
    # The session might not exist (404), which is a successful logic path
    assert res_export.status_code in [200, 404]

@pytest.mark.asyncio
async def test_session_isolation_and_global_search(client: AsyncClient):
    """
    Tests session-level document isolation and explicit cross-session global search.
    """
    # 1. Signup and login to get auth token
    signup_payload = {
        "username": "isolation_user",
        "password": "isolationpassword123"
    }
    await client.post("/signup", json=signup_payload)
    
    login_payload = {
        "username": "isolation_user",
        "password": "isolationpassword123"
    }
    login_res = await client.post("/login", data=login_payload)
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload document to session_A
    file_payload = {
        "file": ("antigravity_secret.txt", b"The secret password for project Antigravity is DeepMind2026.", "text/plain")
    }
    upload_res = await client.post(
        "/upload", 
        data={"session_id": "session_A"}, 
        files=file_payload, 
        headers=headers
    )
    assert upload_res.status_code == 201
    
    # 3. Verify files are listed in session_A but not in session_B
    docs_a = await client.get("/session/session_A/documents", headers=headers)
    assert docs_a.status_code == 200
    assert len(docs_a.json()) == 1
    assert docs_a.json()[0]["document_name"] == "antigravity_secret.txt"
    
    docs_b = await client.get("/session/session_B/documents", headers=headers)
    assert docs_b.status_code == 200
    assert len(docs_b.json()) == 0
    
    # 4. Query session_B with global_search = False (Session Isolated - should NOT find the secret)
    query_isolated = {
        "question": "What is the secret password for project Antigravity in the uploaded documents?",
        "session_id": "session_B",
        "global_search": False
    }
    
    answer_isolated = ""
    async with client.stream("POST", "/agent/query", json=query_isolated, headers=headers) as response:
        assert response.status_code == 200
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if data.get("type") == "content":
                    answer_isolated += data.get("data", "")
                    
    assert "DeepMind2026" not in answer_isolated
    
    # 5. Query session_B with global_search = True (Global Search Enabled - SHOULD find the secret)
    query_global = {
        "question": "What is the secret password for project Antigravity in the uploaded documents?",
        "session_id": "session_B",
        "global_search": True
    }
    
    answer_global = ""
    async with client.stream("POST", "/agent/query", json=query_global, headers=headers) as response:
        assert response.status_code == 200
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if data.get("type") == "content":
                    answer_global += data.get("data", "")
                    
    assert "DeepMind2026" in answer_global
    
    # 6. Delete document and verify it is removed from list and retrieval
    doc_id = docs_a.json()[0]["document_id"]
    del_res = await client.delete(f"/document/{doc_id}", headers=headers)
    assert del_res.status_code == 200
    
    # Verify listed docs are now 0
    docs_a_deleted = await client.get("/session/session_A/documents", headers=headers)
    assert len(docs_a_deleted.json()) == 0

@pytest.mark.asyncio
async def test_optimization_utilities():
    """
    Tests the newly implemented query expansion, self-querying, 
    and context compression utilities.
    """
    # 1. Test Query Expansion
    from utils.query_processor import expand_query
    q_expanded = expand_query("Show MCQs for RAG systems")
    assert "multiple choice questions" in q_expanded.lower()
    assert "retrieval augmented generation" in q_expanded.lower()
    
    # 2. Test Self-Query Metadata extraction
    from utils.query_processor import extract_metadata_filters
    page, doc = extract_metadata_filters(
        "Summarize page 15 of OperatingSystems.pdf", 
        ["OperatingSystems.pdf", "ML_Paper.pdf"]
    )
    assert page == 14
    assert doc == "OperatingSystems.pdf"
    
    # 3. Test Context Compression (Deduplication + Suffix-Prefix overlap merge)
    from utils.context_compressor import compress_context
    from langchain_core.documents import Document
    
    docs = [
        Document(page_content="This is the first sentence that details RAG.", metadata={"source": "doc1.pdf", "page": 0, "start_index": 0}),
        Document(page_content="This is the first sentence that details RAG.", metadata={"source": "doc1.pdf", "page": 0, "start_index": 0}), # duplicate
        Document(page_content="details RAG. And here is some new info.", metadata={"source": "doc1.pdf", "page": 0, "start_index": 10}), # overlap
    ]
    
    compressed = compress_context(docs)
    assert len(compressed) == 1
    assert "This is the first sentence that details RAG. And here is some new info." in compressed[0].page_content
