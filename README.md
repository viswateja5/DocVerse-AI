Enterprise AI Document Assistant

A production-grade Retrieval-Augmented Generation (RAG) system for intelligent document interaction. Upload PDFs, DOCX, and TXT files and chat with them using advanced hybrid retrieval and LLM-powered responses.

Features

* Multi-format document ingestion (PDF, DOCX, TXT)
* Hybrid retrieval using BM25 + FAISS
* Cross-encoder reranking
* Groq/OpenAI model support
* JWT authentication
* Chat session history
* Streaming responses
* Source citation with page references
* MCQ generation
* Revision notes generation
* Viva questions generation
* Multi-session support
* SQLite persistence
* Docker support
* React + Tailwind frontend
* FastAPI backend

Tech Stack

Frontend

* React
* TailwindCSS
* Vite

Backend

* FastAPI
* LangChain
* FAISS
* BM25 Retriever
* Cross Encoder
* SQLite
* JWT Authentication

LLM Providers

* Groq
* OpenAI

Project Structure

backend/
frontend/
.github/workflows/
docker-compose.yml

Installation

Backend

cd backend
source venv/bin/activate
uvicorn app:app --reload

Frontend

cd frontend
npm install
npm run dev

Future Enhancements

* GraphRAG
* LangGraph Agents
* Voice Assistant
* Multi-document Comparison
* PDF Page Preview
* Export to PDF/DOCX
* Ollama Local Models
* AWS / Render Deployment

Author

Viswateja
GitHub: https://github.com/viswateja5
