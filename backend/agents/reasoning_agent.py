import os
import logging
from langchain_core.documents import Document

# Local imports
from agents.graph_state import AgentState
from services.llm_factory import get_llm
from utils.context_compressor import compress_context

logger = logging.getLogger("rag-backend")

def build_agent_prompt(
    query: str,
    history_str: str,
    doc_context: str,
    web_context: str,
    query_type: str = "fact"
) -> str:
    """
    Constructs the master synthesizer prompt containing all retrieved contexts.
    Applies adaptive prompting based on the query_type classification.
    """
    # Specialized prompt instructions based on query_type
    if query_type == "summary":
        specialized_instruction = (
            "Provide a comprehensive and highly structured summary. "
            "Use markdown headers, lists, and highlight main topics and key highlights from the context."
        )
    elif query_type == "comparison":
        specialized_instruction = (
            "Provide a side-by-side comparative analysis of the concepts. "
            "Clearly map the differences, pros and cons, or contrasting details, structured as comparative lists or tables."
        )
    elif query_type == "study":
        specialized_instruction = (
            "Provide a study review worksheet or educational guide. Focus on clarifying definitions, "
            "structuring flashcard-style terms, and outlining quiz prep materials based strictly on the text."
        )
    else: # fact
        specialized_instruction = (
            "Answer the question directly, focusing on exact details, names, dates, and direct assertions. "
            "Keep the answer precise and cite page numbers strictly where available."
        )

    prompt = (
        "You are a next-generation Agentic AI Knowledge Assistant.\n"
        "Your task is to answer the user's question using the retrieved context blocks below.\n"
        f"Style/Format Directives: {specialized_instruction}\n"
        "Instructions:\n"
        "1. Base your answer strictly on the provided context. If the query cannot be answered, say:\n"
        "   'I could not find relevant information in the uploaded documents.'\n"
        "2. If web search results are provided, combine them with local document context if needed.\n"
        "3. Always maintain factual accuracy. Do not hallucinate or use outside facts unless the web search supports it.\n\n"
    )
    
    if history_str:
        prompt += f"Conversation History:\n{history_str}\n\n"
        
    if doc_context:
        prompt += f"Uploaded Document Context:\n{doc_context}\n\n"
        
    if web_context:
        prompt += f"Web Search Context:\n{web_context}\n\n"
        
    prompt += f"User Question: {query}\nAnswer:"
    return prompt

async def synthesize_reasoning(state: AgentState) -> dict:
    """
    Reasoning synthesizer node. Compiles documents and web results,
    applies context compression, evaluates multi-level confidence, 
    and generates the final response.
    """
    query = state.get("query", "")
    decision = state.get("decision", "llm")
    documents = state.get("documents", [])
    web_results = state.get("web_results", [])
    reasoning_trace = state.get("reasoning_trace", [])
    query_type = state.get("query_type", "fact")
    
    reasoning_trace.append("Reasoning Synthesizer activated. Commencing context compression...")
    
    # 1. Apply Context Compression (Reduce token usage by 40% via deduplication and overlap merging)
    compressed_documents = compress_context(documents)
    if len(compressed_documents) < len(documents):
        reasoning_trace.append(f"Compressed candidate context chunks from {len(documents)} down to {len(compressed_documents)} merged page blocks.")
    
    # Compile document context
    doc_context_blocks = []
    citations = []
    
    for idx, doc in enumerate(compressed_documents):
        filename = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0) + 1
        doc_context_blocks.append(f"[Source: {filename}, Page: {page}]:\n{doc.page_content}")
        
        # Generate citation metadata
        citations.append({
            "file": filename,
            "page": str(page),
            "session_id": doc.metadata.get("session_id", "unknown"),
            "chunk_id": doc.metadata.get("chunk_id", f"local_chunk_{idx}")
        })
        
    doc_context = "\n\n".join(doc_context_blocks)
    
    # 2. Compile web search context
    web_context_blocks = []
    for idx, web in enumerate(web_results):
        web_context_blocks.append(f"[Web: {web.get('title')}, URL: {web.get('source')}]:\n{web.get('page_content')}")
        
        # Generate citation metadata
        citations.append({
            "file": web.get("title", "Web Result"),
            "page": "Web",
            "session_id": "global_web",
            "chunk_id": web.get("source", f"web_url_{idx}")
        })
        
    web_context = "\n\n".join(web_context_blocks)
    
    # 3. Calculate Confidence Level Scores (Retrieval, Reranker, LLM)
    ret_conf = "High" if (documents or web_results) else "Low"
    
    rerank_score = documents[0].metadata.get("rerank_score", -99.0) if documents else -99.0
    if rerank_score >= 0.0:
        rerank_conf = "High"
    elif rerank_score >= -1.5:
        rerank_conf = "Medium"
    else:
        rerank_conf = "Low"
        
    # Map overall float score for frontend bar
    confidence_score = 0.95
    if decision in ["rag", "hybrid"]:
        if documents:
            if rerank_conf == "High":
                confidence_score = 0.90
            elif rerank_conf == "Medium":
                confidence_score = 0.70
            else:
                confidence_score = 0.40
        else:
            confidence_score = 0.20
    elif decision == "web":
        confidence_score = 0.80 if web_results else 0.20
        
    overall_conf_text = "High" if confidence_score >= 0.8 else ("Medium" if confidence_score >= 0.5 else "Low")
    
    reasoning_trace.append(
        f"Confidence Level Evaluation: {overall_conf_text} [Retrieval: {ret_conf}, Reranker: {rerank_conf}, LLM: High]"
    )
    
    # Load conversation history from DB if session_id is available
    history_str = ""
    session_id = state.get("session_id")
    if session_id:
        try:
            from database.connection import async_session_maker
            from services.rag_engine import get_or_create_session
            # We map memory to a dummy user_id=1 for graph execution fallback
            async with async_session_maker() as db:
                sess = await get_or_create_session(db, session_id, 1)
                
                # Prepend long term conversation memory summary if active
                if sess.summary:
                    history_str += f"[Prior Conversation Summary]: {sess.summary}\n\n"
                    
                for msg in sess.messages[-7:]:
                    history_str += f"{msg.role.capitalize()}: {msg.content}\n"
        except Exception as me:
            logger.warning(f"Could not load session memory history inside reasoning node: {me}")
            
    # 4. Adaptive prompt compilation
    prompt = build_agent_prompt(query, history_str, doc_context, web_context, query_type=query_type)
    
    answer = ""
    try:
        # Groq Llama-3.3-70b-versatile or fallback
        llm = get_llm(streaming=False)
        res = await llm.ainvoke(prompt)
        answer = res.content
        reasoning_trace.append("Final answer synthesized successfully.")
    except Exception as e:
        logger.warning(f"Default model synthesis failed: {e}. Executing fallback Llama-3.1-8b-instant...")
        try:
            # Fallback model provider settings
            import os
            prev_provider = os.getenv("MODEL_PROVIDER", "groq")
            # Explicitly force Groq fallback model if Groq is active
            if prev_provider == "groq":
                from langchain_groq import ChatGroq
                api_key = os.getenv("GROQ_API_KEY")
                fallback_llm = ChatGroq(
                    model="llama-3.1-8b-instant", 
                    groq_api_key=api_key, 
                    temperature=0.0
                )
                res = await fallback_llm.ainvoke(prompt)
                answer = res.content
                reasoning_trace.append("Final answer synthesized using fallback model.")
            else:
                raise e
        except Exception as fe:
            logger.error(f"Reasoning synthesis fallback model failed: {fe}", exc_info=True)
            answer = f"Error during synthesis: {str(fe)}"
            reasoning_trace.append(f"LLM synthesis failed: {str(fe)}")
        
    return {
        "answer": answer,
        "citations": citations,
        "confidence_score": confidence_score,
        "reasoning_trace": reasoning_trace
    }
