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

@lru_cache(maxsize=1)
def get_embeddings_model() -> HuggingFaceEmbeddings:
    """
    Returns the cached instance of HuggingFaceEmbeddings using 'all-MiniLM-L6-v2'.
    """
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": get_device()},
        encode_kwargs={"normalize_embeddings": True}
    )
