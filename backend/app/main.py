# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="LockedIn - Personal ERP & Telemetry API",
    description="Centralized API for finance, inventory, physical training, goals, and personal CRM.",
    version="0.1.0",
)

# Allow connection with the local and production frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # On Day 4, we will restrict it to your domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "system": "LockedIn Core",
        "version": "0.1.0"
    }