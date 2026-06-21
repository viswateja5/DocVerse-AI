import bcrypt
if not hasattr(bcrypt, "__about__"):
    class DummyAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.1")
    bcrypt.__about__ = DummyAbout()

import asyncio
import pytest
from typing import AsyncGenerator
from unittest.mock import MagicMock, patch

class MockLLM:
    """
    Mock LLM wrapper to simulate structured output and stream generation 
    without triggering external LLM APIs (and avoiding rate limits).
    """
    async def ainvoke(self, prompt, **kwargs):
        prompt_str = str(prompt)
        if "decision" in prompt_str or "RouteDecision" in prompt_str:
            if "Nvidia" in prompt_str:
                return MagicMock(content='{"decision": "web", "explanation": "mock web"}')
            elif "secret password" in prompt_str or "uploaded" in prompt_str or "RAG" in prompt_str or "document" in prompt_str:
                return MagicMock(content='{"decision": "rag", "explanation": "mock rag"}')
            else:
                return MagicMock(content='{"decision": "llm", "explanation": "mock llm"}')
        elif "educator" in prompt_str:
            return MagicMock(content='{"questions": [{"question": "Mock Concept?", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "mock explanation"}]}')
        else:
            # Only match the secret if it is explicitly present in the document context section
            doc_context_index = prompt_str.find("Uploaded Document Context:")
            if doc_context_index != -1 and "DeepMind2026" in prompt_str[doc_context_index:]:
                return MagicMock(content="The secret password for project Antigravity is DeepMind2026.")
            return MagicMock(content="Mocked LLM general response.")

    def with_structured_output(self, schema, **kwargs):
        mock_struct = MagicMock()
        async def mock_ainvoke(prompt, **kwargs):
            prompt_str = str(prompt)
            if schema.__name__ == "RouteDecision":
                if "Nvidia" in prompt_str:
                    return schema(decision="web", explanation="mock web")
                elif "secret password" in prompt_str or "uploaded" in prompt_str or "RAG" in prompt_str or "document" in prompt_str:
                    return schema(decision="rag", explanation="mock rag")
                else:
                    return schema(decision="llm", explanation="mock llm")
            return schema()
        mock_struct.ainvoke = mock_ainvoke
        return mock_struct

    async def astream(self, prompt, **kwargs):
        prompt_str = str(prompt)
        text = "This is a mock streamed answer."
        # Only match the secret if it is explicitly present in the document context section
        doc_context_index = prompt_str.find("Uploaded Document Context:")
        if doc_context_index != -1 and "DeepMind2026" in prompt_str[doc_context_index:]:
            text = "The secret password for project Antigravity is DeepMind2026."
            
        class MockChunk:
            def __init__(self, content):
                self.content = content
                
        for token in text.split(" "):
            yield MockChunk(token + " ")

# Eagerly start patcher to intercept get_llm before app imports
patcher = patch("services.llm_factory.get_llm", return_value=MockLLM())
patcher.start()

import database.connection
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine_instance = create_async_engine(
    TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
test_session_maker = async_sessionmaker(
    bind=test_engine_instance,
    class_=AsyncSession,
    expire_on_commit=False
)
database.connection.async_session_maker = test_session_maker

# Now safe to import app and DB connection setups
from httpx import AsyncClient, ASGITransport
from database.connection import Base, get_db
from app import app

# @pytest.fixture(scope="session")
# def event_loop():
#     """
#     Standard event loop fixture to support pytest async operations.
#     """
#     try:
#         loop = asyncio.get_running_loop()
#     except RuntimeError:
#         loop = asyncio.new_event_loop()
#     asyncio.set_event_loop(loop)
#     yield loop
#     loop.close()

@pytest.fixture
async def test_engine():
    """
    Sets up SQLite tables inside isolated in-memory DB context.
    """
    async with test_engine_instance.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    yield test_engine_instance
    
    async with test_engine_instance.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provides db sessions executing inside rollback transactions to keep tests isolated.
    """
    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """
    Yields an HTTPX AsyncClient configured with overridden database contexts.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()
