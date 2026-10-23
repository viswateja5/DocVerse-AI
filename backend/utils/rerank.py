import os
import re
from functools import lru_cache
from typing import List, Any
from langchain_core.documents import Document

def get_device() -> str:
    """
    Returns the best available device for inference.
    Defaults to CPU (or CUDA if available) to avoid MPS shader compilation failures on macOS.
    Restricts PyTorch worker threads to 1 to stay well within 512MB RAM on free-tier containers.
    """
    try:
        import torch
        torch.set_num_threads(1)
        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass
    return "cpu"

@lru_cache(maxsize=1)
def get_cross_encoder() -> Any:
    """
    Loads and caches the CrossEncoder reranker model.
    """
    from sentence_transformers import CrossEncoder
    return CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device=get_device())

def rerank_documents(
    query: str,
    documents: List[Document],
    top_n: int = 4
) -> List[Document]:
    """
    Reranks candidate documents against a query using a CrossEncoder.
    If the CrossEncoder cannot be initialized or fails, falls back gracefully.
    """
    if not documents:
        return []
        
    # Short-circuit: If there's only 1 document, no reranking is needed.
    if len(documents) <= 1:
        documents[0].metadata["rerank_score"] = 1.0
        return documents[:top_n]
        
    if os.getenv("ENABLE_CROSS_ENCODER") == "true":
        try:
            model = get_cross_encoder()
            pairs = [[query, doc.page_content] for doc in documents]
            scores = model.predict(pairs)
            
            paired_docs = list(zip(documents, scores))
            paired_docs.sort(key=lambda x: x[1], reverse=True)
            
            results = []
            for doc, score in paired_docs[:top_n]:
                doc.metadata["rerank_score"] = float(score)
                results.append(doc)
            return results
        except Exception:
            pass

    # High-efficiency lexical overlap reranker (uses zero neural network RAM)
    query_terms = set(re.findall(r"\w+", query.lower()))
    scored_docs = []
    for doc in documents:
        doc_words = set(re.findall(r"\w+", doc.page_content.lower()))
        overlap = len(query_terms.intersection(doc_words))
        score = overlap / (len(query_terms) + 1e-5)
        scored_docs.append((doc, score))
        
    scored_docs.sort(key=lambda x: x[1], reverse=True)
    results = []
    for doc, score in scored_docs[:top_n]:
        doc.metadata["rerank_score"] = float(score)
        results.append(doc)
    return results

