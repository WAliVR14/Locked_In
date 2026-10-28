@echo off
echo Starting full Locked_In environment (Backend + Frontend)...
start code .
start "Locked_In Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "Locked_In Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 4
start http://localhost:8000/docs
start http://localhost:5173