# backend/app/models/entities.py
from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default="admin")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Account(SQLModel, table=True):
    __tablename__ = "accounts"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    name: str
    balance: float = Field(default=0.0)

class PantryItem(SQLModel, table=True):
    __tablename__ = "pantry_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    name: str
    current_qty: float = Field(default=0.0)
    min_qty: float = Field(default=1.0)
    unit: str = Field(default="pz")
    estimated_price: float = Field(default=0.0)