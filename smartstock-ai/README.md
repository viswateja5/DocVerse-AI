# SmartStock AI

Sales & Inventory Forecasting Platform featuring a modern React frontend and a FastAPI/Python ML backend.

## Project Structure
- `frontend/`: React + Vite + Tailwind CSS + TypeScript
- `backend/`: FastAPI + PostgreSQL + ML (Pandas, Scikit-learn)

## Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start (Docker)
To run the entire platform via Docker:
```bash
docker-compose up --build
```
- Frontend: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs
- Backend Health Check: http://localhost:8000/api/v1/health

## Local Development Setup

### Backend
```bash
cd backend
./setup.sh
source venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
