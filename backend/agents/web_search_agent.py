import logging
from agents.graph_state import AgentState
from web_search.fallback_search import search_web_with_fallback

logger = logging.getLogger("rag-backend")

async def search_web_agent(state: AgentState) -> dict:
    """
    Web search agent node. Activates if decision is 'web' or 'hybrid'.
    Uses Tavily with DuckDuckGo fallback.
    """
    decision = state.get("decision", "llm")
    query = state.get("query", "")
    reasoning_trace = state.get("reasoning_trace", [])
    
    if decision not in ["web", "hybrid"]:
        return {"web_results": [], "reasoning_trace": reasoning_trace}
        
    reasoning_trace.append("Web Search Agent activated. Triggering search fallback pipelines...")
    
    try:
        results = await search_web_with_fallback(query)
        reasoning_trace.append(f"Web search retrieved {len(results)} candidate results.")
        
        # Convert list of Document objects to dictionaries for storage
        results_serialized = [
            {
                "page_content": doc.page_content,
                "source": doc.metadata.get("source", "web"),
                "title": doc.metadata.get("title", "Web Result"),
                "page": doc.metadata.get("page", 0),
                "is_web": True
            }
            for doc in results
        ]
        
        return {
            "web_results": results_serialized,
            "reasoning_trace": reasoning_trace
        }
    except Exception as e:
        logger.error(f"Agent web search step failed: {e}", exc_info=True)
        reasoning_trace.append(f"Web search failed with error: {str(e)}")
        return {
            "web_results": [],
            "reasoning_trace": reasoning_trace
        }
