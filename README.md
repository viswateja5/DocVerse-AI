# 🚀 Enterprise AI Document Assistant

> A production-grade **Retrieval-Augmented Generation (RAG)** system for intelligent document interaction.

Upload **PDFs, DOCX, and TXT files** and chat with them using advanced hybrid retrieval and LLM-powered responses.

---

## ✨ Features

- 📄 Multi-format document ingestion (PDF, DOCX, TXT)
- 🔍 Hybrid retrieval using BM25 + FAISS
- 🎯 Cross-encoder reranking
- 🤖 Groq/OpenAI model support
- 🔐 JWT authentication
- 💬 Chat session history
- ⚡ Streaming responses
- 📚 Source citation with page references
- 📝 MCQ generation
- 📖 Revision notes generation
- 🎓 Viva question generation
- 🐳 Docker support

---

## 🏗️ Architecture

```text
User
 ↓
React + Tailwind Frontend
 ↓
FastAPI Backend
 ↓
Hybrid Retriever
(BM25 + FAISS)
 ↓
Cross Encoder Reranker
 ↓
Groq / OpenAI LLM
 ↓
Grounded Response + Source Citations
```

---

## 🛠️ Tech Stack

### Frontend
- React
- TailwindCSS
- Vite

### Backend
- FastAPI
- LangChain
- SQLAlchemy

### AI Stack
- Groq
- OpenAI
- FAISS
- BM25 Retriever
- Cross Encoder

### Database
- SQLite

### DevOps
- Docker
- GitHub Actions

---

## 📁 Project Structure

```text
Enterprise-ai-document-assistant
│
├── backend
├── frontend
├── .github/workflows
├── docker-compose.yml
└── README.md
```

---

## 🚀 Installation

### Backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌟 Future Enhancements

- GraphRAG
- LangGraph Agents
- Multi-document Comparison
- Voice Assistant
- PDF Page Preview
- Export to PDF/DOCX
- Ollama Local Models
- AWS Deployment

---

## 👨‍💻 Author

**Viswateja**

GitHub: **https://github.com/viswateja5**

---

⭐ If you found this project useful, consider giving it a star!
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
