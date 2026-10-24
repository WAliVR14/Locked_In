@echo off
echo Iniciando entorno de desarrollo Locked_In...
start code .
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
timeout /t 3
start http://localhost:8000/docs