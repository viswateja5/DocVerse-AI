import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_core.documents import Document

def load_document(file_path: str) -> List[Document]:
    """
    Loads text content from a file and returns a list of Document objects.
    Supports PDF, DOCX, and TXT.
    
    Args:
        file_path (str): The local path to the file.
        
    Returns:
        List[Document]: List of parsed Document elements.
        
    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If file extension is unsupported or loading fails.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Document file not found at: {file_path}")
        
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif ext == ".txt":
        loader = TextLoader(file_path, encoding="utf-8")
    elif ext == ".csv":
        import pandas as pd
        try:
            df = pd.read_csv(file_path)
            content = df.to_csv(index=False)
            return [Document(page_content=content, metadata={"source": file_path, "page": 0})]
        except Exception as e:
            raise ValueError(f"Failed to parse CSV file: {str(e)}")
    elif ext in [".xlsx", ".xls"]:
        import pandas as pd
        try:
            excel_file = pd.ExcelFile(file_path)
            documents = []
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                content = f"Sheet: {sheet_name}\n{df.to_csv(index=False)}"
                documents.append(Document(page_content=content, metadata={"source": file_path, "page": 0, "sheet": sheet_name}))
            return documents
        except Exception as e:
            raise ValueError(f"Failed to parse Excel file: {str(e)}")
    else:
        raise ValueError(
            f"Unsupported file extension '{ext}'. Supported formats: PDF, DOCX, TXT, CSV, Excel."
        )
        
    try:
        documents = loader.load()
        if not documents or not any(doc.page_content.strip() for doc in documents):
            raise ValueError("Document appears to be empty or contains no extractable text.")
        return documents
    except Exception as e:
        raise ValueError(f"Failed to parse document: {str(e)}") from e
