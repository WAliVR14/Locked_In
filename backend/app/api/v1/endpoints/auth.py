# backend/app/api/v1/endpoints/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from app.models.entities import User

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", status_code=201)
def register_user(email: str, password: str, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="The user already exists")
    user = User(email=email, hashed_password=get_password_hash(password), role="admin")
    session.add(user)
    session.commit()
    return {"message": "User created successfully"}

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/demo-login")
def demo_login(session: Session = Depends(get_session)):
    """Instant access in read/test mode for recruiters."""
    demo_email = "demo@locked.local"
    user = session.exec(select(User).where(User.email == demo_email)).first()
    if not user:
        user = User(email=demo_email, hashed_password=get_password_hash("demo123"), role="demo")
        session.add(user)
        session.commit()
        session.refresh(user)
    token = create_access_token(data={"sub": user.email, "role": "demo"})
    return {"access_token": token, "token_type": "bearer", "role": "demo"}

@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role}