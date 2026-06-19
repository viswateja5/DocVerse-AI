import os
import logging
from typing import List
from langchain_core.documents import Document
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from services.web_search import search_tavily

logger = logging.getLogger("rag-backend")

async def search_web_with_fallback(query: str) -> List[Document]:
    """
    Tries searching the web via Tavily Search API. 
    If key is missing or request fails, falls back to DuckDuckGo search.
    """
    # 1. Try Tavily
    tavily_results = await search_tavily(query)
    if tavily_results:
        return tavily_results

    # 2. Fall back to DuckDuckGo
    logger.info(f"Falling back to DuckDuckGo Search for query: '{query}'")
    try:
        # Run DuckDuckGo in executor because the wrapper is synchronous
        import asyncio
        loop = asyncio.get_event_loop()
        
        def run_ddg():
            ddg = DuckDuckGoSearchAPIWrapper(max_results=5)
            return ddg.results(query, max_results=5)
            
        results = await loop.run_in_executor(None, run_ddg)
        
        documents = []
        for item in results:
            doc = Document(
                page_content=item.get("snippet", ""),
                metadata={
                    "source": item.get("link", "ddg_search"),
                    "title": item.get("title", "DuckDuckGo Result"),
                    "page": 0,
                    "is_web": True
                }
            )
            documents.append(doc)
            
        logger.info(f"DuckDuckGo search completed. Found {len(documents)} results.")
        return documents
    except Exception as e:
        logger.error(f"DuckDuckGo search failed: {str(e)}", exc_info=True)
        return []
