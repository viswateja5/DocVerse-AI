from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    """
    State definitions representing the data payload propagated across LangGraph agent nodes.
    """
    messages: List[Any]            # History log of conversations
    query: str                    # Original user question
    session_id: str                # Unique session context
    global_search: bool           # Global search filter flag
    decision: str                 # Routing decision: 'rag' | 'web' | 'llm' | 'hybrid'
    documents: List[Any]          # Retrieved document passages
    web_results: List[Dict[str, Any]] # Retrieved web search results
    answer: str                   # Generated response text token stream
    reasoning_trace: List[str]    # Reasoning trace logging thoughts
    confidence_score: float       # Groundedness confidence evaluation
    citations: List[Dict[str, Any]]  # Citations and reference URLs / page indices
