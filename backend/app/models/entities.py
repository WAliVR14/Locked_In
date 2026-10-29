# backend/app/models/entities.py
from typing import Optional
from datetime import datetime
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
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    type: str = Field(default="debit")  # debit, cash, investment, credit
    balance: float = Field(default=0.0)
    currency: str = Field(default="MXN")


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="accounts.id", index=True)
    amount: float
    type: str  # income, expense, transfer_out, transfer_in
    category: str = Field(default="General", index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PantryItem(SQLModel, table=True):
    __tablename__ = "pantry_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    name: str
    current_qty: float = Field(default=0.0)
    min_qty: float = Field(default=1.0)
    unit: str = Field(default="pz")
    estimated_price: float = Field(default=0.0)