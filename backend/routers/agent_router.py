import os
import json
import time
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db, async_session_maker
from routers.auth import get_current_user
from models.db_models import User, ChatMessage, ChatSession
from schemas.api_schemas import QueryRequest
from agents.router import route_query
from agents.retrieval_agent import retrieve_documents
from agents.web_search_agent import search_web_agent
from agents.reasoning_agent import build_agent_prompt, get_llm
from services.rag_engine import get_or_create_session, validate_session_access
from services.llm_factory import get_llm_error_message
from cache.redis_cache import get_cached, set_cached
from core.rate_limit import limiter

logger = logging.getLogger("rag-backend")
agent_router = APIRouter(prefix="/agent", tags=["Agentic RAG Engine"])


async def summarize_session_memory_async(session_id: str, user_id: int, history_str: str) -> None:
    """Condenses long conversation history lazily in the background."""
    try:
        sum_prompt = (
            "You are an assistant. Condense the conversation history below into a single, cohesive, "
            "one-paragraph summary. Focus on the core topics explored and answers supplied.\n\n"
            f"Conversation History:\n{history_str}\n\nSummary:"
        )
        sum_llm = get_llm(streaming=False)
        sum_res = await sum_llm.ainvoke(sum_prompt)
        new_summary = sum_res.content.strip()

        from sqlalchemy import update
        async with async_session_maker() as db:
            await db.execute(
                update(ChatSession).where(ChatSession.id == session_id).values(summary=new_summary)
            )
            await db.commit()
    except Exception as se:
        logger.warning("Background memory summarization failed: %s", se)

async def stream_agent_reasoning(
    query: str,
    session_id: str,
    user_id: int,
    global_search: bool = False,
    username: str = ""
) -> StreamingResponse:
    """
    Orchestrates the LangGraph agent nodes, yielding streaming SSE JSON chunks.
    """
    async def sse_generator():
        # 1. Check cache
        cache_key = f"agent_cache:{user_id}:{session_id}:{global_search}:{query.strip().lower()}"
        cached = await get_cached(cache_key)
        
        if cached:
            logger.info("Agent query cache hit.")
            yield f"data: {json.dumps({'type': 'decision', 'data': cached['decision']})}\n\n"
            yield f"data: {json.dumps({'type': 'intent', 'data': cached.get('intent', 'general_knowledge')})}\n\n"
            yield f"data: {json.dumps({'type': 'trace', 'data': ['Served from Redis Cache fallback.']})}\n\n"
            yield f"data: {json.dumps({'type': 'sources', 'data': cached['sources']})}\n\n"
            yield f"data: {json.dumps({'type': 'confidence', 'data': cached['confidence_score']})}\n\n"
            yield f"data: {json.dumps({'type': 'content', 'data': cached['answer']})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        start_time = time.perf_counter()
        retrieval_duration_ms = 0.0
        llm_duration_ms = 0.0

        # 2. Get document count and recent conversation history for active session
        doc_count = 0
        session_history_messages = []
        prior_summary = ""
        try:
            from sqlalchemy import select, func
            from models.db_models import UploadFileModel
            async with async_session_maker() as db:
                stmt = select(func.count(UploadFileModel.id)).where(
                    UploadFileModel.user_id == user_id,
                    UploadFileModel.status == "Ready",
                )
                if not global_search:
                    stmt = stmt.where(UploadFileModel.session_id == session_id)
                res = await db.execute(stmt)
                doc_count = res.scalar() or 0

                sess = await get_or_create_session(db, session_id, user_id)
                prior_summary = sess.summary or ""
                session_history_messages = [
                    {"role": m.role, "content": m.content}
                    for m in sess.messages[-7:]
                ]
        except Exception as dbe:
            logger.warning(f"Could not retrieve session info in agent router: {dbe}")

        # Initialize State
        state = {
            "query": query,
            "session_id": session_id,
            "user_id": user_id,
            "global_search": global_search,
            "messages": session_history_messages,
            "decision": "llm",
            "intent": "general_knowledge",
            "username": username,
            "documents": [],
            "web_results": [],
            "document_count": doc_count,
            "reasoning_trace": ["Query received. Initializing agent graph..."]
        }
        
        # Node 1: Router
        state = {**state, **(await route_query(state))}
        yield f"data: {json.dumps({'type': 'decision', 'data': state['decision']})}\n\n"
        yield f"data: {json.dumps({'type': 'intent', 'data': state['intent']})}\n\n"
        yield f"data: {json.dumps({'type': 'trace', 'data': state['reasoning_trace']})}\n\n"
        
        # Immediate greeting response optimization
        clean_query = query.lower().strip("?.! ")
        if state["intent"] == "greeting" and any(g in clean_query for g in ["hi", "hello", "hey", "g'day", "morning", "afternoon", "evening"]):
            answer_text = (
                f"Hi {username}! 👋\n"
                "How can I help you today?\n\n"
                "📄 Ask questions about uploaded documents\n"
                "🌐 Ask real-time questions\n"
                "📝 Generate MCQs and notes\n"
                "🎓 Prepare for exams and interviews"
            )
            yield f"data: {json.dumps({'type': 'sources', 'data': []})}\n\n"
            yield f"data: {json.dumps({'type': 'confidence', 'data': 1.0})}\n\n"
            
            async with async_session_maker() as db:
                db.add(ChatMessage(session_id=session_id, role="user", content=query))
                bot_msg = ChatMessage(session_id=session_id, role="assistant", content=answer_text)
                db.add(bot_msg)
                await db.commit()
                
            for token in answer_text:
                yield f"data: {json.dumps({'type': 'content', 'data': token})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return
            
        # Node 2: Retrieval Agent (if RAG or Hybrid)
        if state["decision"] in ["rag", "hybrid"]:
            t_retrieval_0 = time.perf_counter()
            state = {**state, **(await retrieve_documents(state))}
            retrieval_duration_ms = (time.perf_counter() - t_retrieval_0) * 1000
            yield f"data: {json.dumps({'type': 'trace', 'data': state['reasoning_trace']})}\n\n"
            
        # Node 3: Web Search Agent (if Web or Hybrid)
        if state["decision"] in ["web", "hybrid"]:
            state = {**state, **(await search_web_agent(state))}
            yield f"data: {json.dumps({'type': 'trace', 'data': state['reasoning_trace']})}\n\n"

        # Safe fallback: Ensure failed document retrieval doesn't break general knowledge questions
        if state["decision"] == "rag" and not state["documents"] and state["intent"] == "general_knowledge":
            state["decision"] = "llm"
            state["reasoning_trace"].append(
                "Document retrieval found no context for general question. Falling back to direct LLM generation."
            )
            yield f"data: {json.dumps({'type': 'decision', 'data': 'llm'})}\n\n"
            yield f"data: {json.dumps({'type': 'trace', 'data': state['reasoning_trace']})}\n\n"
            
        # Compile Citations and Contexts
        from utils.context_compressor import compress_context
        compressed_documents = compress_context(state["documents"])
        
        citations = []
        doc_context_blocks = []
        for idx, doc in enumerate(compressed_documents):
            filename = os.path.basename(doc.metadata.get("source", "unknown"))
            page = doc.metadata.get("page", 0) + 1
            doc_context_blocks.append(f"[Source: {filename}, Page: {page}]:\n{doc.page_content}")
            citations.append({
                "file": filename,
                "page": str(page),
                "session_id": doc.metadata.get("session_id", "unknown"),
                "chunk_id": doc.metadata.get("chunk_id", f"local_chunk_{idx}")
            })
            
        web_context_blocks = []
        for idx, web in enumerate(state["web_results"]):
            web_context_blocks.append(f"[Web: {web.get('title')}, URL: {web.get('source')}]:\n{web.get('page_content')}")
            citations.append({
                "file": web.get("title", "Web Result"),
                "page": "Web",
                "session_id": "global_web",
                "chunk_id": web.get("source", f"web_url_{idx}")
            })
            
        yield f"data: {json.dumps({'type': 'sources', 'data': citations})}\n\n"
        
        # Calculate Confidence Score & evaluate document fallback logic
        confidence_score = 0.95
        best_score = -99.0
        if state["decision"] in ["rag", "hybrid"]:
            if state["documents"]:
                best_score = state["documents"][0].metadata.get("rerank_score", -99.0)
                confidence_score = 0.90 if best_score >= 0.0 else (0.70 if best_score >= -1.5 else 0.50)
            else:
                confidence_score = 0.20
        elif state["decision"] == "web":
            confidence_score = 0.80 if state["web_results"] else 0.20
            
        yield f"data: {json.dumps({'type': 'confidence', 'data': confidence_score})}\n\n"

        if state["decision"] == "web" and not state["web_results"]:
            answer_text = (
                "Live web search returned no results or is unavailable. "
                "Please retry later."
            )
            async with async_session_maker() as db:
                db.add(ChatMessage(session_id=session_id, role="user", content=query))
                db.add(
                    ChatMessage(
                        session_id=session_id,
                        role="assistant",
                        content=answer_text,
                    )
                )
                await db.commit()
            yield f"data: {json.dumps({'type': 'sources', 'data': []})}\n\n"
            yield f"data: {json.dumps({'type': 'content', 'data': answer_text})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return
        
        # Check Fallback Logic for document-related queries when no chunks are found
        if state["decision"] == "rag" and not state["documents"]:
            answer_text = "I couldn’t find relevant information in uploaded documents."
            async with async_session_maker() as db:
                db.add(ChatMessage(session_id=session_id, role="user", content=query))
                bot_msg = ChatMessage(session_id=session_id, role="assistant", content=answer_text)
                db.add(bot_msg)
                await db.commit()
                
            for token in answer_text:
                yield f"data: {json.dumps({'type': 'content', 'data': token})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return
        
        # Node 4: Synthesis Reasoning
        # Build conversation history
        history_str = ""
        if prior_summary:
            history_str += f"[Prior Conversation Summary]: {prior_summary}\n\n"
        for msg in session_history_messages:
            history_str += f"{msg['role'].capitalize()}: {msg['content']}\n"

        # Log user message
        async with async_session_maker() as db:
            db.add(ChatMessage(session_id=session_id, role="user", content=query))
            await db.commit()
            
        prompt = build_agent_prompt(
            query, 
            history_str, 
            "\n\n".join(doc_context_blocks), 
            "\n\n".join(web_context_blocks),
            query_type=state.get("query_type", "fact"),
            intent=state.get("intent", "general_knowledge"),
            username=username
        )
        
        answer_text = ""
        t_llm_0 = time.perf_counter()
        try:
            llm = get_llm(streaming=True)
            async for chunk in llm.astream(prompt):
                token = chunk.content
                if token:
                    answer_text += token
                    yield f"data: {json.dumps({'type': 'content', 'data': token})}\n\n"
        except Exception as e:
            error_message = get_llm_error_message(e)
            logger.error("LLM streaming failed (%s).", type(e).__name__)
            answer_text = f"[Generation Error: {error_message}]"
            yield (
                f"data: {json.dumps({'type': 'content', 'data': answer_text})}\n\n"
            )

        llm_duration_ms = (time.perf_counter() - t_llm_0) * 1000
        total_duration_ms = (time.perf_counter() - start_time) * 1000

        # Privacy-safe structured logging
        logger.info(
            "Query diagnostics: session_id=%s, user_id=%s, decision=%s, intent=%s, "
            "indexed_chunks=%d, retrieved_chunks=%d, retrieval_ms=%.1f, llm_ms=%.1f, "
            "total_ms=%.1f, context_found=%s, citations_count=%d",
            session_id, user_id, state["decision"], state["intent"],
            doc_count, len(state["documents"]),
            retrieval_duration_ms, llm_duration_ms, total_duration_ms,
            bool(state["documents"]), len(citations),
        )
            
        # Log assistant message
        async with async_session_maker() as db:
            bot_msg = ChatMessage(session_id=session_id, role="assistant", content=answer_text)
            bot_msg.sources = citations
            db.add(bot_msg)
            await db.commit()

        # Update Long-term Memory Summary lazily in background (non-blocking)
        if len(session_history_messages) >= 7:
            asyncio.create_task(
                summarize_session_memory_async(session_id, user_id, history_str)
            )
            
        # Cache results
        cache_data = {
            "decision": state["decision"],
            "intent": state["intent"],
            "sources": citations,
            "confidence_score": confidence_score,
            "answer": answer_text
        }
        if not answer_text.startswith("[Generation Error:"):
            await set_cached(cache_key, cache_data, expire_seconds=3600)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@agent_router.post("/query")
@limiter.limit("20/minute")
async def run_agent_query(
    request: Request,
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Main entry point for agentic RAG and real-time knowledge queries.
    Streams back JSON tracing, classifications, and text chunks.
    """
    await validate_session_access(db, body.session_id, current_user.id)
    return await stream_agent_reasoning(
        body.question, 
        body.session_id, 
        current_user.id, 
        body.global_search, 
        current_user.username
    )

@agent_router.get("/graph/path")
async def get_graph_relationship_path(
    session_id: str,
    source: str,
    target: str,
    current_user: User = Depends(get_current_user)
):
    """
    Exposes NetworkX directed shortest-path analysis between two entities in a session.
    """
    from graph_rag.graph_manager import query_relationships_path
    # Map the session_id; if using default uploaded files graph, fallback to "default"
    res = query_relationships_path(session_id, source, target)
    if not res.get("found"):
        # Also try default global graph
        return query_relationships_path("default", source, target)
    return res

@agent_router.get("/graph/data")
async def get_graph_links(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Returns link relationships for rendering the interactive GraphRAG visualization.
    """
    from graph_rag.graph_manager import get_session_graph_data
    data = get_session_graph_data(session_id)
    if not data.get("nodes"):
        data = get_session_graph_data("default")
    return data
