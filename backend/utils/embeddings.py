import torch
from functools import lru_cache

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_community.embeddings import HuggingFaceEmbeddings

def get_device() -> str:
    """
    Returns the best available device for inference.
    """
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

import os
import pickle
from typing import List

CACHE_PATH = "vector_store/embedding_cache.pkl"

class EmbeddingCache:
    def __init__(self):
        self.cache = {}
        if os.path.exists(CACHE_PATH):
            try:
                with open(CACHE_PATH, "rb") as f:
                    self.cache = pickle.load(f)
            except Exception:
                pass
                
    def get(self, text: str) -> List[float]:
        return self.cache.get(text)
        
    def set(self, text: str, vector: List[float]) -> None:
        self.cache[text] = vector
        
    def save(self) -> None:
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        try:
            with open(CACHE_PATH, "wb") as f:
                pickle.dump(self.cache, f)
        except Exception:
            pass

from langchain_core.embeddings import Embeddings

class CachedEmbeddings(Embeddings):
    def __init__(self, raw_model):
        self.model = raw_model
        
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        cache = EmbeddingCache()
        results = [None] * len(texts)
        missing_indices = []
        missing_texts = []
        
        for idx, text in enumerate(texts):
            vec = cache.get(text)
            if vec is not None:
                results[idx] = vec
            else:
                missing_indices.append(idx)
                missing_texts.append(text)
                
        if missing_texts:
            # Batch generate missing embeddings in batches of 32-64 chunks (Rule 7)
            batch_size = 32
            embedded_batches = []
            for i in range(0, len(missing_texts), batch_size):
                batch = missing_texts[i:i + batch_size]
                embedded_batches.extend(self.model.embed_documents(batch))
                
            for idx, vec in zip(missing_indices, embedded_batches):
                results[idx] = vec
                cache.set(texts[idx], vec)
                
            cache.save()
            
        return results
        
    def embed_query(self, text: str) -> List[float]:
        return self.model.embed_query(text)

    def __call__(self, text: str) -> List[float]:
        return self.embed_query(text)

@lru_cache(maxsize=1)
def _get_raw_embeddings_model() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": get_device()},
        encode_kwargs={"normalize_embeddings": True}
    )

@lru_cache(maxsize=1)
def get_embeddings_model() -> CachedEmbeddings:
    """
    Returns the cached instance of CachedEmbeddings wrapping HuggingFaceEmbeddings 'all-MiniLM-L6-v2'.
    """
    raw_model = _get_raw_embeddings_model()
    return CachedEmbeddings(raw_model)
