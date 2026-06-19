from langgraph.graph import StateGraph, END
from agents.graph_state import AgentState
from agents.router import route_query
from agents.retrieval_agent import retrieve_documents
from agents.web_search_agent import search_web_agent
from agents.reasoning_agent import synthesize_reasoning

def create_agent_graph():
    """
    Constructs and compiles the master state graph query routing workflow.
    """
    workflow = StateGraph(AgentState)
    
    # 1. Register Nodes
    workflow.add_node("router", route_query)
    workflow.add_node("retriever", retrieve_documents)
    workflow.add_node("web_search", search_web_agent)
    workflow.add_node("reasoning", synthesize_reasoning)
    
    # 2. Configure Conditional Routing Edges
    def after_router(state: AgentState) -> str:
        return state.get("decision", "llm")
        
    workflow.add_conditional_edges(
        "router",
        after_router,
        {
            "rag": "retriever",
            "web": "web_search",
            "llm": "reasoning",
            "hybrid": "retriever"
        }
    )
    
    def after_retriever(state: AgentState) -> str:
        if state.get("decision") == "hybrid":
            return "web_search"
        return "reasoning"
        
    workflow.add_conditional_edges(
        "retriever",
        after_retriever,
        {
            "web_search": "web_search",
            "reasoning": "reasoning"
        }
    )
    
    # 3. Add static transitions
    workflow.add_edge("web_search", "reasoning")
    workflow.add_edge("reasoning", END)
    
    # 4. Set graph entrypoint
    workflow.set_entry_point("router")
    
    return workflow.compile()

# Compile global state graph runner instance
agent_graph = create_agent_graph()
