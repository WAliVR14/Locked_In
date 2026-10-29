# backend/app/main.py
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, func

from app.core.database import init_db, get_session
from app.core.security import get_current_user
from app.models.entities import User, Account, PantryItem
from app.api.v1.endpoints import auth, finance


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database when the application starts.
    init_db()
    yield

app = FastAPI(
    title="Locked_In - Personal ERP & Telemetry API",
    description="Centralized API for finance, inventory, physical training, goals, and personal CRM.",
    version="0.1.0",
    lifespan=lifespan,
)

#CORS configuration to allow requests from React (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc)},
    )


# Register authentication routes (/api/v1/auth/...)
app.include_router(auth.router)
app.include_router(finance.router)


@app.get("/api/v1/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "system": "Locked_In Core",
        "version": "0.1.0"
    }


@app.get("/api/v1/system/summary", tags=["System"])
def get_system_summary(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Returns a quick count of records isolated by the authenticated user."""
    accounts_count = session.exec(
        select(func.count(Account.id)).where(Account.user_id == current_user.id)
    ).one()
    pantry_count = session.exec(
        select(func.count(PantryItem.id)).where(PantryItem.user_id == current_user.id)
    ).one()

    return {
        "user_email": current_user.email,
        "role": current_user.role,
        "metrics": {
            "accounts": accounts_count,
            "pantry_items": pantry_count,
        },
    }