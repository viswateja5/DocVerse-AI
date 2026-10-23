import json
import logging
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from conftest import original_get_llm
from services import llm_factory
from routers.agent_router import stream_agent_reasoning


def test_uses_selected_groq_provider_and_its_key(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.delenv("GROQ_MODEL", raising=False)

    with patch.dict(
        sys.modules,
        {"langchain_groq": SimpleNamespace(ChatGroq=MockChatGroq)},
    ):
        llm = original_get_llm(streaming=True, temperature=0.2)

    assert isinstance(llm, MockChatGroq)
    assert llm.options == {
        "model": "qwen/qwen3.8-27b",
        "temperature": 0.2,
        "streaming": True,
        "groq_api_key": "test-groq-key",
    }


def test_uses_custom_groq_model_from_env(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "custom-model-id")

    with patch.dict(
        sys.modules,
        {"langchain_groq": SimpleNamespace(ChatGroq=MockChatGroq)},
    ):
        llm = original_get_llm(streaming=False, temperature=0.0)

    assert isinstance(llm, MockChatGroq)
    assert llm.options["model"] == "custom-model-id"


def test_model_not_found_error_is_actionable(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")

    class ModelNotFoundError(Exception):
        status_code = 404

    message = llm_factory.get_llm_error_message(
        ModelNotFoundError("The model does not exist or you do not have access to it.")
    )

    assert "does not exist or you do not have access to it" in message
    assert "groq" in message


class MockChatGroq:
    def __init__(self, **options):
        self.options = options

    async def astream(self, _prompt):
        yield SimpleNamespace(content="Mocked LLM response")


@pytest.mark.asyncio
async def test_mocked_groq_response_streams_successfully(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")

    with patch.dict(
        sys.modules,
        {"langchain_groq": SimpleNamespace(ChatGroq=MockChatGroq)},
    ):
        llm = original_get_llm()
        response = "".join(
            [chunk.content async for chunk in llm.astream("test prompt")]
        )

    assert response == "Mocked LLM response"


def test_missing_selected_key_does_not_switch_provider(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "valid-looking-openai-key")

    with pytest.raises(ValueError, match="GROQ_API_KEY"):
        original_get_llm()


def test_placeholder_key_is_treated_as_missing(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "your_groq_api_key_here")

    with pytest.raises(ValueError, match="GROQ_API_KEY"):
        original_get_llm()


def test_startup_validation_warns_without_logging_key(monkeypatch, caplog):
    secret = "not-a-real-secret"
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", secret)

    with caplog.at_level(logging.WARNING, logger="rag-backend"):
        assert llm_factory.validate_llm_configuration() is True

    monkeypatch.setenv("GROQ_API_KEY", "your_groq_api_key_here")
    with caplog.at_level(logging.WARNING, logger="rag-backend"):
        assert llm_factory.validate_llm_configuration() is False

    assert "GROQ_API_KEY" in caplog.text
    assert secret not in caplog.text
    assert "your_groq_api_key_here" not in caplog.text


def test_invalid_credential_error_is_actionable_and_redacted(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")

    class AuthenticationError(Exception):
        status_code = 401

    message = llm_factory.get_llm_error_message(
        AuthenticationError("credential=not-a-real-secret")
    )

    assert "GROQ_API_KEY" in message
    assert "not-a-real-secret" not in message


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (type("RateLimitError", (Exception,), {"status_code": 429})(), "rate limit"),
        (TimeoutError("request timed out"), "timed out"),
        (type("ServiceUnavailableError", (Exception,), {"status_code": 503})(), "unavailable"),
    ],
)
def test_provider_failures_have_actionable_messages(monkeypatch, error, expected):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")

    assert expected in llm_factory.get_llm_error_message(error).lower()


def test_missing_provider_key_error_names_configuration(monkeypatch):
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    message = llm_factory.get_llm_error_message(RuntimeError("provider request failed"))

    assert "GROQ_API_KEY" in message
    assert "not configured" in message


@pytest.mark.asyncio
async def test_agent_stream_handles_invalid_credentials_without_fallback(
    test_engine, monkeypatch
):
    assert test_engine is not None

    class AuthenticationError(Exception):
        status_code = 401

    class InvalidCredentialLLM:
        async def astream(self, _prompt):
            if _prompt:
                raise AuthenticationError("credential=not-a-real-secret")
            yield

    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.setattr(
        "routers.agent_router.get_cached", AsyncMock(return_value=None)
    )
    monkeypatch.setattr("routers.agent_router.set_cached", AsyncMock())
    monkeypatch.setattr(
        "routers.agent_router.route_query",
        AsyncMock(
            return_value={
                "decision": "llm",
                "intent": "general_knowledge",
                "query_type": "fact",
                "reasoning_trace": [],
            }
        ),
    )
    monkeypatch.setattr(
        "routers.agent_router.get_llm", lambda **kwargs: InvalidCredentialLLM()
    )

    response = await stream_agent_reasoning(
        query="Explain this topic",
        session_id="invalid-credentials-session",
        user_id=8675309,
    )
    chunks = [chunk async for chunk in response.body_iterator]
    output = b"".join(
        chunk if isinstance(chunk, bytes) else chunk.encode() for chunk in chunks
    ).decode()

    assert "GROQ_API_KEY" in output
    assert "not-a-real-secret" not in output
    assert json.loads(output.split("data: ", 1)[1].split("\n\n", 1)[0])["type"] == "decision"
    assert "Generation Error" in output
