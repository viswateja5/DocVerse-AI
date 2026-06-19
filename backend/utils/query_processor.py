import re
from typing import List, Dict, Any, Optional, Tuple

# Acronym mapping for expansion (case-insensitive)
EXPANSION_MAP = {
    r"\bMCQ\b": "multiple choice question",
    r"\bMCQs\b": "multiple choice questions",
    r"\bQA\b": "questions and answers",
    r"\bQAs\b": "questions and answers",
    r"\bQ&A\b": "questions and answers",
    r"\bQ&As\b": "questions and answers",
    r"\bRAG\b": "retrieval augmented generation",
    r"\bLLM\b": "large language model",
    r"\bLLMs\b": "large language models",
    r"\bOS\b": "operating system",
    r"\bNLP\b": "natural language processing",
    r"\bAI\b": "artificial intelligence",
    r"\bAPI\b": "application programming interface",
    r"\bAPIs\b": "application programming interfaces",
}

def expand_query(query: str) -> str:
    """
    Expands common abbreviations in the user query to improve lexical retrieval recall.
    """
    expanded = query
    for pattern, replacement in EXPANSION_MAP.items():
        expanded = re.sub(pattern, replacement, expanded, flags=re.IGNORECASE)
    return expanded

def extract_metadata_filters(query: str, available_filenames: List[str]) -> Tuple[Optional[int], Optional[str]]:
    """
    Parses the query for self-querying patterns.
    Extracts page numbers (0-indexed) and document name restrictions.
    
    Examples:
      - "Explain page 15" -> page=14
      - "Show information from OperatingSystems.pdf" -> document_name="OperatingSystems.pdf"
    """
    page_filter = None
    doc_filter = None
    
    # 1. Parse page number (e.g. "page 15", "p. 15", "pg 15")
    page_match = re.search(r"\b(?:page|p\.|pg)\s*(\d+)\b", query, re.IGNORECASE)
    if page_match:
        page_val = int(page_match.group(1))
        if page_val > 0:
            page_filter = page_val - 1 # 0-indexed internally
            
    # 2. Parse document names from available session documents
    query_lower = query.lower()
    for filename in available_filenames:
        # Match case-insensitively and support partial or full matching
        if filename.lower() in query_lower:
            doc_filter = filename
            break
            
    return page_filter, doc_filter
