from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app import app
from core.rate_limit import limiter
from database.connection import get_db


@pytest.mark.asyncio
async def test_root_returns_liveness_response(client: AsyncClient):
    response = await client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "application": "DocVerse AI",
        "status": "API is running",
    }


@pytest.mark.asyncio
async def test_openapi_registers_expected_application_routes(client: AsyncClient):
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    for path in (
        "/health",
        "/signup",
        "/login",
        "/upload",
        "/document/{document_id}/status",
        "/query",
        "/agent/query",
        "/sessions",
        "/history/{session_id}",
        "/edu/generate",
    ):
        assert path in paths


def test_rate_limits_are_enabled_by_default():
    assert limiter.enabled is True


@pytest.mark.asyncio
async def test_health_reports_unavailable_redis_as_degraded(
    client: AsyncClient, monkeypatch
):
    monkeypatch.setattr("cache.redis_cache.redis_client", None)

    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["database_connected"] is True
    assert response.json()["redis_connected"] is False
    assert response.json()["status"] == "degraded"


@pytest.mark.asyncio
async def test_health_reports_database_failure(
    client: AsyncClient, monkeypatch
):
    class BrokenDatabase:
        async def execute(self, _query):
            raise RuntimeError("database unavailable")

    async def override_get_db():
        yield BrokenDatabase()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(
        "cache.redis_cache.redis_client",
        SimpleNamespace(ping=AsyncMock(return_value=True)),
    )

    try:
        response = await client.get("/health")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json()["database_connected"] is False
    assert response.json()["redis_connected"] is True
    assert response.json()["status"] == "degraded"


@pytest.mark.asyncio
async def test_health_reports_healthy_when_dependencies_are_available(
    client: AsyncClient, monkeypatch
):
    monkeypatch.setattr(
        "cache.redis_cache.redis_client",
        SimpleNamespace(ping=AsyncMock(return_value=True)),
    )

    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["database_connected"] is True
    assert response.json()["redis_connected"] is True
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_production_frontend_origin_is_allowed(client: AsyncClient):
    response = await client.options(
        "/agent/query",
        headers={
            "Origin": "https://doc-verse-ai-r694.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "https://doc-verse-ai-r694.vercel.app"
    )


@pytest.mark.asyncio
async def test_chatbot_endpoint_streams_mocked_response(
    client: AsyncClient, monkeypatch
):
    await client.post(
        "/signup",
        json={"username": "route_chat_user", "password": "chatpassword123"},
    )
    login = await client.post(
        "/login",
        data={"username": "route_chat_user", "password": "chatpassword123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    monkeypatch.setattr("routers.agent_router.get_cached", AsyncMock(return_value=None))
    monkeypatch.setattr("routers.agent_router.set_cached", AsyncMock())
    monkeypatch.setattr(
        "routers.agent_router.route_query",
        AsyncMock(
            return_value={
                "decision": "llm",
                "intent": "general_knowledge",
                "query_type": "fact",
                "reasoning_trace": ["mock route"],
            }
        ),
    )

    async with client.stream(
        "POST",
        "/agent/query",
        json={
            "question": "Explain RAG.",
            "session_id": "route-chat-session",
            "global_search": False,
        },
        headers=headers,
    ) as response:
        body = (await response.aread()).decode()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"type": "content"' in body
    assert '"data": "This "' in body
    assert '"data": "answer. "' in body
    assert '"type": "done"' in body


@pytest.mark.asyncio
async def test_chatbot_endpoint_rejects_missing_jwt(client: AsyncClient):
    response = await client.post(
        "/agent/query",
        json={"question": "Explain RAG.", "session_id": "unauthorized-session"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_web_query_without_search_results_does_not_call_llm(
    client: AsyncClient, monkeypatch
):
    await client.post(
        "/signup",
        json={"username": "route_web_user", "password": "chatpassword123"},
    )
    login = await client.post(
        "/login",
        data={"username": "route_web_user", "password": "chatpassword123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    monkeypatch.setattr("routers.agent_router.get_cached", AsyncMock(return_value=None))
    monkeypatch.setattr("routers.agent_router.set_cached", AsyncMock())
    monkeypatch.setattr(
        "routers.agent_router.route_query",
        AsyncMock(
            return_value={
                "decision": "web",
                "intent": "real_time",
                "query_type": "fact",
                "reasoning_trace": [],
            }
        ),
    )
    monkeypatch.setattr(
        "routers.agent_router.search_web_agent",
        AsyncMock(return_value={"web_results": [], "reasoning_trace": []}),
    )
    monkeypatch.setattr(
        "routers.agent_router.get_llm",
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("LLM must not run")),
    )

    async with client.stream(
        "POST",
        "/agent/query",
        json={
            "question": "What is the current weather?",
            "session_id": "route-web-session",
        },
        headers=headers,
    ) as response:
        body = (await response.aread()).decode()

    assert response.status_code == 200
    assert "Live web search returned no results or is unavailable." in body
    assert "LLM must not run" not in body
