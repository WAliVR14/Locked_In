# backend/app/main.py
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, func

from app.core.config import settings
from app.core.database import init_db, get_session
from app.core.security import get_current_user
from app.models.entities import User, Account, PantryItem
from app.api.v1.endpoints import auth, finance, health_metrics, pantry, strategy, today


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

# CORS configuration supporting localhost, dynamic FRONTEND_URL, and Vercel deployments
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

frontend_url = settings.FRONTEND_URL.strip() if settings.FRONTEND_URL else "*"
allow_all = frontend_url == "*"

if not allow_all:
    for origin in frontend_url.split(","):
        cleaned = origin.strip()
        if cleaned and cleaned not in cors_origins:
            cors_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r".*" if allow_all else r"https://.*\.vercel\.app",
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
app.include_router(pantry.router)
app.include_router(finance.router)
app.include_router(today.router)
app.include_router(strategy.router)
app.include_router(health_metrics.router)


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
