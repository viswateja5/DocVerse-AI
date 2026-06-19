from typing import List
from langchain_core.documents import Document
from collections import defaultdict

def find_overlap_length(s1: str, s2: str, max_overlap: int = 300) -> int:
    """
    Finds the suffix of s1 that matches the prefix of s2.
    """
    s1_len = len(s1)
    s2_len = len(s2)
    # Check overlaps from longest possible down to 1
    for length in range(min(max_overlap, s1_len, s2_len), 0, -1):
        if s1[-length:] == s2[:length]:
            return length
    return 0

def compress_context(documents: List[Document]) -> List[Document]:
    """
    Compresses retrieved context by:
      1. Deduplicating identical page contents.
      2. Merging overlapping or consecutive text chunks from the same document page.
    This reduces token footprint significantly.
    """
    if not documents:
        return []

    # 1. Deduplicate identical text
    seen_contents = set()
    unique_docs = []
    for doc in documents:
        content_stripped = doc.page_content.strip()
        if content_stripped not in seen_contents:
            seen_contents.add(content_stripped)
            unique_docs.append(doc)

    # 2. Group by (source, page)
    grouped = defaultdict(list)
    for doc in unique_docs:
        # Standardize source path/name key
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", 0)
        grouped[(source, page)].append(doc)

    merged_docs = []
    for (source, page), docs in grouped.items():
        # Sort by start_index metadata to ensure correct sequential ordering on a page
        docs.sort(key=lambda d: d.metadata.get("start_index", 0))

        merged_content = ""
        merged_metadata = docs[0].metadata.copy()

        for doc in docs:
            content = doc.page_content.strip()
            if not merged_content:
                merged_content = content
            else:
                # Calculate suffix-prefix overlap
                overlap = find_overlap_length(merged_content, content)
                if overlap > 0:
                    merged_content += content[overlap:]
                else:
                    merged_content += "\n\n" + content

        # Create compressed document object preserving metadata
        merged_docs.append(Document(page_content=merged_content, metadata=merged_metadata))

    return merged_docs
