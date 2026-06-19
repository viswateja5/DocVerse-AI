import re
from pydantic import BaseModel, Field
from services.llm_factory import get_llm
from agents.graph_state import AgentState

class RouteDecision(BaseModel):
    """
    Pydantic schema for structured output classification of query routing.
    """
    decision: str = Field(
        description="Must be exactly one of: 'rag' (for uploaded document queries), 'web' (for real-time stock/news/events), 'llm' (for general reasoning/knowledge/coding), or 'hybrid' (combining document context and real-time search)"
    )
    query_type: str = Field(
        default="fact",
        description="Must be exactly one of: 'fact' (lookups/basic questions), 'summary' (summarize concepts/chapters/files), 'comparison' (compare differences), or 'study' (worksheets, quizzes, MCQs, flashcards, Revision Sheets)"
    )
    explanation: str = Field(description="Short sentence justifying the choice.")

async def route_query(state: AgentState) -> dict:
    """
    LangGraph routing node. Classifies the query and populates the 'decision' and 'query_type' state fields.
    """
    query = state.get("query", "").strip()
    if not query:
        return {
            "decision": "llm", 
            "query_type": "fact", 
            "reasoning_trace": ["Empty query, defaulted to general LLM route."]
        }

    system_prompt = (
        "You are an expert query routing agent.\n"
        "Your task is to analyze the user's query and classify it into one of four routing decisions:\n"
        "1. 'rag': The query asks specifically about uploaded files, documents, user papers, or details expected to be in the database context.\n"
        "2. 'web': The query asks about real-time events, current news, today's stock prices, sports scores, weather, or technology updates that require a live web search.\n"
        "3. 'llm': The query asks for general knowledge, creative writing, programming/coding, generic explanations (e.g. 'explain transformers'), or logic reasoning that the LLM knows natively without external documents or search.\n"
        "4. 'hybrid': The query requires combining both document context and live web information (e.g., 'compare my paper with the latest NVIDIA stock price/developments').\n\n"
        "You must also classify the style/format of the request into 'query_type':\n"
        "- 'fact': Simple lookup, data point, or single detail inquiry.\n"
        "- 'summary': Requests summarizes, overviews, outlines, or key takeaways of the document or topics.\n"
        "- 'comparison': Comparison of different versions, sections, pros/cons, or conceptual differences.\n"
        "- 'study': Requests study materials, MCQs, quiz creation, Revision Sheet compiling, prep cards, notes, or tutoring viva.\n\n"
        f"User Query: {query}"
    )

    reasoning_trace = []
    decision = "llm"
    query_type = "fact"

    try:
        llm = get_llm(streaming=False)
        # Attempt to use structured outputs
        try:
            structured_llm = llm.with_structured_output(RouteDecision)
            res = await structured_llm.ainvoke(system_prompt)
            decision = res.decision.lower().strip()
            query_type = res.query_type.lower().strip()
            reasoning_trace.append(f"Structured router decision: '{decision}' / type: '{query_type}' ({res.explanation})")
        except Exception:
            # Fallback to standard text generation + parsing if structured output is not supported by provider
            res = await llm.ainvoke(
                f"{system_prompt}\n\nRespond ONLY with a JSON matching this structure: {{\"decision\": \"rag|web|llm|hybrid\", \"query_type\": \"fact|summary|comparison|study\", \"explanation\": \"...\"}}"
            )
            text = res.content
            match_dec = re.search(r'"decision"\s*:\s*"(\w+)"', text)
            match_type = re.search(r'"query_type"\s*:\s*"(\w+)"', text)
            if match_dec:
                decision = match_dec.group(1).lower().strip()
            if match_type:
                query_type = match_type.group(1).lower().strip()
            reasoning_trace.append(f"Text-parsed router decision: '{decision}' / type: '{query_type}'")
    except Exception as e:
        decision = "llm"
        query_type = "fact"
        reasoning_trace.append(f"Routing failed with error: {str(e)}. Defaulted to 'llm' fallback.")

    # Clamp decision to valid options
    if decision not in ["rag", "web", "llm", "hybrid"]:
        decision = "llm"
    if query_type not in ["fact", "summary", "comparison", "study"]:
        query_type = "fact"

    return {
        "decision": decision,
        "query_type": query_type,
        "reasoning_trace": state.get("reasoning_trace", []) + reasoning_trace
    }
