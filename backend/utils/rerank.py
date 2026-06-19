import torch
from functools import lru_cache
from typing import List
from sentence_transformers import CrossEncoder
from langchain_core.documents import Document

def get_device() -> str:
    """
    Returns the best available device for inference.
    """
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

@lru_cache(maxsize=1)
def get_cross_encoder() -> CrossEncoder:
    """
    Loads and caches the CrossEncoder reranker model.
    """
    return CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device=get_device())

def rerank_documents(
    query: str,
    documents: List[Document],
    top_n: int = 4
) -> List[Document]:
    """
    Reranks candidate documents against a query using a CrossEncoder.
    """
    if not documents:
        return []
        
    # Short-circuit: If there's only 1 document, no reranking is needed.
    if len(documents) <= 1:
        # Default the rerank score to a neutral high value (e.g. 1.0)
        documents[0].metadata["rerank_score"] = 1.0
        return documents[:top_n]
        
    model = get_cross_encoder()
    
    pairs = [[query, doc.page_content] for doc in documents]
    scores = model.predict(pairs)
    
    paired_docs = list(zip(documents, scores))
    paired_docs.sort(key=lambda x: x[1], reverse=True)
    
    results = []
    for doc, score in paired_docs[:top_n]:
        # Inject the rerank relevance score into document metadata
        doc.metadata["rerank_score"] = float(score)
        results.append(doc)
        
    return results
