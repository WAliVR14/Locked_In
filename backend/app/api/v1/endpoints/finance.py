# backend/app/api/v1/endpoints/finance.py
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Field, Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.entities import User, Account, Transaction

router = APIRouter(prefix="/api/v1/finance", tags=["Finance"])


# --- Input Schemas (Strict Validation) ---
class AccountCreate(SQLModel):
    name: str
    type: str = "debit"
    balance: float = 0.0
    currency: str = "MXN"


class TransactionCreate(SQLModel):
    account_id: int
    amount: float = Field(gt=0, description="The amount must be greater than 0")
    type: str  # "income" o "expense"
    category: str = "General"
    description: Optional[str] = None


class TransferCreate(SQLModel):
    from_account_id: int
    to_account_id: int
    amount: float = Field(gt=0, description="The amount to be transferred must be greater than 0")
    description: Optional[str] = "Transfer between accounts"


# --- Endpoints ---
@router.get("/overview")
def get_finance_overview(
    monthly_budget_limit: float = 10000.0,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Retrieves the user's accounts, recent transactions, and budget metrics."""
    accounts = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).all()

    account_ids = [acc.id for acc in accounts if acc.id is not None]

    transactions: list[Transaction] = []
    if account_ids:
        transactions = list(
            session.exec(
                select(Transaction)
                .where(Transaction.account_id.in_(account_ids))
                .order_by(Transaction.created_at.desc())
                .limit(30)
            ).all()
        )

    # Calculation of income and expenses for the current month
    now = datetime.utcnow()
    monthly_income = 0.0
    monthly_expenses = 0.0

    for tx in transactions:
        if tx.created_at.year == now.year and tx.created_at.month == now.month:
            if tx.type == "income":
                monthly_income += tx.amount
            elif tx.type == "expense":
                monthly_expenses += tx.amount

    total_balance = sum(acc.balance for acc in accounts)

    return {
        "total_balance": round(total_balance, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "monthly_budget_limit": monthly_budget_limit,
        "accounts": accounts,
        "recent_transactions": transactions,
    }


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new, isolated financial account for the authenticated user."""
    new_account = Account(
        user_id=current_user.id,
        name=payload.name,
        type=payload.type,
        balance=payload.balance,
        currency=payload.currency,
    )
    session.add(new_account)
    session.commit()
    session.refresh(new_account)
    return new_account


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Record an income or expense and update the account balance."""
    if payload.type not in ("income", "expense"):
        raise HTTPException(
            status_code=400, detail="Transaction type must be 'income' or 'expense'"
        )

    # Anti-IDOR verification: The account must exist AND belong to the current user.
    account = session.exec(
        select(Account).where(
            Account.id == payload.account_id,
            Account.user_id == current_user.id,
        )
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Mathematical update of the balance
    if payload.type == "expense":
        account.balance = round(account.balance - payload.amount, 2)
    else:
        account.balance = round(account.balance + payload.amount, 2)

    new_tx = Transaction(
        account_id=account.id,
        amount=payload.amount,
        type=payload.type,
        category=payload.category,
        description=payload.description,
    )

    session.add(account)
    session.add(new_tx)
    session.commit()
    session.refresh(new_tx)
    session.refresh(account)

    return {
        "transaction": new_tx,
        "new_account_balance": account.balance,
    }


@router.post("/transfers", status_code=status.HTTP_201_CREATED)
def create_transfer(
    payload: TransferCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Transfer funds atomically between two accounts belonging to the same user."""
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(
            status_code=400, detail="Source and destination accounts must be different"
        )

    from_acc = session.exec(
        select(Account).where(
            Account.id == payload.from_account_id,
            Account.user_id == current_user.id,
        )
    ).first()
    to_acc = session.exec(
        select(Account).where(
            Account.id == payload.to_account_id,
            Account.user_id == current_user.id,
        )
    ).first()

    if not from_acc or not to_acc:
        raise HTTPException(status_code=404, detail="One or both accounts not found")

    from_acc.balance = round(from_acc.balance - payload.amount, 2)
    to_acc.balance = round(to_acc.balance + payload.amount, 2)

    tx_out = Transaction(
        account_id=from_acc.id,
        amount=payload.amount,
        type="transfer_out",
        category="Transfer",
        description=f"To {to_acc.name}: {payload.description}",
    )
    tx_in = Transaction(
        account_id=to_acc.id,
        amount=payload.amount,
        type="transfer_in",
        category="Transfer",
        description=f"From {from_acc.name}: {payload.description}",
    )

    session.add(from_acc)
    session.add(to_acc)
    session.add(tx_out)
    session.add(tx_in)
    session.commit()

    return {
        "message": "Transfer completed",
        "from_account_balance": from_acc.balance,
        "to_account_balance": to_acc.balance,
    }