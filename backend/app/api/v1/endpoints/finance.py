# backend/app/api/v1/endpoints/finance.py
import calendar
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Field, SQLModel, Session, select

from app.core.database import get_session
from app.core.events import EventType, emit_event, subscribe
from app.core.security import get_current_user
from app.models.entities import (
    Account,
    DebtLoan,
    Institution,
    PaymentInstrument,
    SavingsFund,
    Subscription,
    Task,
    Transaction,
    User,
)

router = APIRouter(prefix="/api/v1/finance", tags=["Finance"])


# =====================================================================
# INPUT SCHEMAS
# =====================================================================


class AccountCreate(SQLModel):
    name: str
    type: str = "debit"
    balance: float = 0.0
    currency: str = "MXN"
    institution_id: Optional[int] = None


class TransactionCreate(SQLModel):
    account_id: Optional[int] = None
    instrument_id: Optional[int] = None
    amount: float = Field(gt=0, description="Amount must be greater than 0")
    type: str  # income | expense | credit_charge
    category: str = "General"
    description: Optional[str] = None


class TransferCreate(SQLModel):
    from_account_id: int
    to_account_id: int
    amount: float = Field(gt=0, description="Amount to transfer must be greater than 0")
    description: Optional[str] = "Transfer between accounts"


class InstitutionCreate(SQLModel):
    name: str
    category: str = "bank"  # bank, fintech, broker, retail


class InstrumentCreate(SQLModel):
    institution_id: Optional[int] = None
    linked_account_id: Optional[int] = None
    name: str
    instrument_type: str = "credit_card"  # debit_card | credit_card
    credit_limit: float = 0.0
    cutoff_day: Optional[int] = None
    payment_due_day: Optional[int] = None


class InstrumentPayCreate(SQLModel):
    debit_account_id: int
    amount: float = Field(gt=0, description="Payment amount must be greater than 0")


class SavingsFundCreate(SQLModel):
    name: str
    target_amount: float = 0.0
    monthly_allocation: float = 0.0
    annual_rate: float = 0.0


class SavingsContributeCreate(SQLModel):
    amount: float = Field(gt=0, description="Amount must be greater than 0")
    account_id: Optional[int] = None
    withdraw: bool = False  # True = withdrawal, False = contribution


class DebtCreate(SQLModel):
    institution_id: Optional[int] = None
    name: str
    total_amount: float = 0.0
    outstanding_balance: float = 0.0
    interest_rate: float = 0.0
    monthly_payment: float = 0.0
    next_payment_date: Optional[date] = None


class SubscriptionCreate(SQLModel):
    instrument_id: Optional[int] = None
    name: str
    amount: float = 0.0
    currency: str = "MXN"
    billing_day: Optional[int] = None
    category: str = "Digital"
    next_billing_date: Optional[date] = None


# =====================================================================
# OVERVIEW — Safe-to-Spend Master Summary
# =====================================================================


@router.get("/overview")
def get_finance_overview(
    monthly_budget_limit: float = 10000.0,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Master financial summary with Safe-to-Spend engine. Fully retro-compatible."""
    # --- Accounts ---
    accounts = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).all()
    account_ids = [acc.id for acc in accounts if acc.id is not None]

    # --- Recent Transactions ---
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

    # --- Monthly Income / Expenses (current month only) ---
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
    budget_used_pct = round(
        min(100.0, (monthly_expenses / monthly_budget_limit) * 100)
        if monthly_budget_limit > 0
        else 0.0,
        2,
    )

    # --- Institutions ---
    institutions = session.exec(
        select(Institution).where(Institution.user_id == current_user.id)
    ).all()

    # --- Payment Instruments ---
    instruments = session.exec(
        select(PaymentInstrument).where(PaymentInstrument.user_id == current_user.id)
    ).all()

    # --- Savings Funds ---
    funds = session.exec(
        select(SavingsFund).where(SavingsFund.user_id == current_user.id)
    ).all()

    # --- Debts ---
    debts = session.exec(
        select(DebtLoan).where(DebtLoan.user_id == current_user.id)
    ).all()

    # --- Subscriptions ---
    subscriptions = session.exec(
        select(Subscription).where(Subscription.user_id == current_user.id)
    ).all()

    # --- Derived Metrics ---
    credit_debt_total = sum(
        instr.current_debt for instr in instruments if instr.instrument_type == "credit_card"
    )
    savings_total = sum(f.current_saved for f in funds)

    # Net liquidity = liquid account balances minus floating credit card debt
    liquid_balance = sum(acc.balance for acc in accounts if acc.is_liquid)
    net_liquidity = liquid_balance - credit_debt_total

    # Safe-to-Spend daily: spendable balance divided by remaining days in month
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_remaining = max(1, days_in_month - now.day + 1)  # include today
    subscriptions_this_month = sum(
        sub.amount
        for sub in subscriptions
        if sub.status == "active"
        and (sub.billing_day is None or (sub.billing_day or 0) >= now.day)
    )
    spendable = max(0.0, net_liquidity - subscriptions_this_month)
    safe_to_spend_daily = round(spendable / days_remaining, 2)

    return {
        # === Retro-compatible keys (unchanged) ===
        "total_balance": round(total_balance, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "monthly_budget_limit": monthly_budget_limit,
        "budget_used_pct": budget_used_pct,
        "accounts": accounts,
        "recent_transactions": transactions,
        # === New Finance v2 keys ===
        "institutions": institutions,
        "instruments": instruments,
        "savings_funds": funds,
        "debts": debts,
        "subscriptions": subscriptions,
        "credit_debt_total": round(credit_debt_total, 2),
        "savings_total": round(savings_total, 2),
        "net_liquidity": round(net_liquidity, 2),
        "safe_to_spend_daily": safe_to_spend_daily,
    }


# =====================================================================
# ACCOUNTS
# =====================================================================


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new isolated financial account for the authenticated user."""
    new_account = Account(
        user_id=current_user.id,
        name=payload.name,
        type=payload.type,
        balance=payload.balance,
        currency=payload.currency,
        institution_id=payload.institution_id,
    )
    session.add(new_account)
    session.commit()
    session.refresh(new_account)
    return new_account


# =====================================================================
# TRANSACTIONS (retro-compatible + credit_charge support)
# =====================================================================


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Record a transaction. Supports:
    - income / expense  → requires account_id, adjusts Account.balance
    - credit_charge     → requires instrument_id (credit_card), increases PaymentInstrument.current_debt
                          WITHOUT touching Account.balance
    """
    allowed_types = ("income", "expense", "credit_charge")
    if payload.type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Transaction type must be one of: {allowed_types}",
        )

    # --- Credit charge path ---
    if payload.type == "credit_charge":
        if not payload.instrument_id:
            raise HTTPException(
                status_code=400,
                detail="credit_charge requires instrument_id",
            )
        instrument = session.exec(
            select(PaymentInstrument).where(
                PaymentInstrument.id == payload.instrument_id,
                PaymentInstrument.user_id == current_user.id,
            )
        ).first()
        if not instrument:
            raise HTTPException(status_code=404, detail="Payment instrument not found")
        if instrument.instrument_type != "credit_card":
            raise HTTPException(
                status_code=400,
                detail="Instrument is not a credit card",
            )

        instrument.current_debt = round(instrument.current_debt + payload.amount, 2)
        new_tx = Transaction(
            instrument_id=instrument.id,
            amount=payload.amount,
            type="credit_charge",
            category=payload.category,
            description=payload.description,
        )
        session.add(instrument)
        session.add(new_tx)
        session.flush()
        emit_event(
            session,
            current_user.id,
            EventType.CREDIT_CHARGE_RECORDED,
            "finance",
            {
                "instrument_id": instrument.id,
                "amount": payload.amount,
                "category": payload.category,
            },
        )
        session.commit()
        session.refresh(new_tx)
        session.refresh(instrument)
        return {
            "transaction": new_tx,
            "instrument_current_debt": instrument.current_debt,
        }

    # --- Income / Expense path (original behaviour, fully preserved) ---
    if not payload.account_id:
        raise HTTPException(
            status_code=400,
            detail="income/expense transactions require account_id",
        )
    account = session.exec(
        select(Account).where(
            Account.id == payload.account_id,
            Account.user_id == current_user.id,
        )
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

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


# =====================================================================
# TRANSFERS
# =====================================================================


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


# =====================================================================
# INSTITUTIONS
# =====================================================================


@router.post("/institutions", status_code=status.HTTP_201_CREATED)
def create_institution(
    payload: InstitutionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Register a financial institution (bank, fintech, broker, retail)."""
    institution = Institution(
        user_id=current_user.id,
        name=payload.name,
        category=payload.category,
    )
    session.add(institution)
    session.commit()
    session.refresh(institution)
    return institution


@router.get("/institutions")
def list_institutions(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all financial institutions for the authenticated user."""
    return session.exec(
        select(Institution).where(Institution.user_id == current_user.id)
    ).all()


# =====================================================================
# PAYMENT INSTRUMENTS (Credit / Debit Cards)
# =====================================================================


@router.post("/instruments", status_code=status.HTTP_201_CREATED)
def create_instrument(
    payload: InstrumentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Register a payment instrument (credit card or debit card)."""
    instrument = PaymentInstrument(
        user_id=current_user.id,
        institution_id=payload.institution_id,
        linked_account_id=payload.linked_account_id,
        name=payload.name,
        instrument_type=payload.instrument_type,
        credit_limit=payload.credit_limit,
        current_debt=0.0,
        cutoff_day=payload.cutoff_day,
        payment_due_day=payload.payment_due_day,
    )
    session.add(instrument)
    session.commit()
    session.refresh(instrument)
    return instrument


@router.get("/instruments")
def list_instruments(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all payment instruments for the authenticated user."""
    return session.exec(
        select(PaymentInstrument).where(PaymentInstrument.user_id == current_user.id)
    ).all()


@router.post("/instruments/{instrument_id}/pay", status_code=status.HTTP_201_CREATED)
def pay_credit_card(
    instrument_id: int,
    payload: InstrumentPayCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Settle a credit card payment:
    - Deducts amount from the debit account (Account.balance).
    - Reduces the credit card's current_debt (frees credit line).
    - Records two transactions: credit_payment on the instrument and expense on the account.
    """
    instrument = session.exec(
        select(PaymentInstrument).where(
            PaymentInstrument.id == instrument_id,
            PaymentInstrument.user_id == current_user.id,
        )
    ).first()
    if not instrument:
        raise HTTPException(status_code=404, detail="Payment instrument not found")
    if instrument.instrument_type != "credit_card":
        raise HTTPException(status_code=400, detail="Instrument is not a credit card")

    debit_account = session.exec(
        select(Account).where(
            Account.id == payload.debit_account_id,
            Account.user_id == current_user.id,
        )
    ).first()
    if not debit_account:
        raise HTTPException(status_code=404, detail="Debit account not found")

    # Deduct from debit account
    debit_account.balance = round(debit_account.balance - payload.amount, 2)

    # Reduce credit card debt (never go below 0)
    instrument.current_debt = round(max(0.0, instrument.current_debt - payload.amount), 2)

    # Record payment transaction
    tx = Transaction(
        account_id=debit_account.id,
        instrument_id=instrument.id,
        amount=payload.amount,
        type="credit_payment",
        category="Credit Card Payment",
        description=f"Payment to {instrument.name}",
    )

    session.add(debit_account)
    session.add(instrument)
    session.add(tx)
    session.commit()
    session.refresh(tx)
    session.refresh(instrument)
    session.refresh(debit_account)

    return {
        "transaction": tx,
        "instrument_current_debt": instrument.current_debt,
        "debit_account_balance": debit_account.balance,
    }


# =====================================================================
# SAVINGS FUNDS (Cajitas / Investment Funds)
# =====================================================================


@router.post("/savings-funds", status_code=status.HTTP_201_CREATED)
def create_savings_fund(
    payload: SavingsFundCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a savings or investment fund (e.g. Cajita Nu, GBM Smart Cash)."""
    fund = SavingsFund(
        user_id=current_user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_saved=0.0,
        monthly_allocation=payload.monthly_allocation,
        annual_rate=payload.annual_rate,
    )
    session.add(fund)
    session.commit()
    session.refresh(fund)
    return fund


@router.get("/savings-funds")
def list_savings_funds(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all savings funds for the authenticated user."""
    return session.exec(
        select(SavingsFund).where(SavingsFund.user_id == current_user.id)
    ).all()


@router.post("/savings-funds/{fund_id}/contribute", status_code=status.HTTP_201_CREATED)
def contribute_to_fund(
    fund_id: int,
    payload: SavingsContributeCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Contribute to or withdraw from a savings fund.
    If account_id is provided, the linked liquid account is debited (contribution)
    or credited (withdrawal) accordingly.
    """
    fund = session.exec(
        select(SavingsFund).where(
            SavingsFund.id == fund_id,
            SavingsFund.user_id == current_user.id,
        )
    ).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Savings fund not found")

    account = None
    if payload.account_id:
        account = session.exec(
            select(Account).where(
                Account.id == payload.account_id,
                Account.user_id == current_user.id,
            )
        ).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

    if payload.withdraw:
        fund.current_saved = round(max(0.0, fund.current_saved - payload.amount), 2)
        if account:
            account.balance = round(account.balance + payload.amount, 2)
            tx = Transaction(
                account_id=account.id,
                amount=payload.amount,
                type="income",
                category="Savings Withdrawal",
                description=f"Withdrawal from {fund.name}",
            )
            session.add(tx)
    else:
        fund.current_saved = round(fund.current_saved + payload.amount, 2)
        if account:
            account.balance = round(account.balance - payload.amount, 2)
            tx = Transaction(
                account_id=account.id,
                amount=payload.amount,
                type="expense",
                category="Savings Contribution",
                description=f"Contribution to {fund.name}",
            )
            session.add(tx)

    session.add(fund)
    if account:
        session.add(account)
    session.commit()
    session.refresh(fund)

    result: dict = {"fund": fund}
    if account:
        session.refresh(account)
        result["account_balance"] = account.balance
    return result


# =====================================================================
# DEBTS (ADR-01: auto-creates Task reminder)
# =====================================================================


@router.post("/debts", status_code=status.HTTP_201_CREATED)
def create_debt(
    payload: DebtCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Register a loan or debt.
    ADR-01: Automatically creates a Task reminder in the centralized tasks table.
    """
    debt = DebtLoan(
        user_id=current_user.id,
        institution_id=payload.institution_id,
        name=payload.name,
        total_amount=payload.total_amount,
        outstanding_balance=payload.outstanding_balance,
        interest_rate=payload.interest_rate,
        monthly_payment=payload.monthly_payment,
        next_payment_date=payload.next_payment_date,
    )
    session.add(debt)
    session.flush()  # Mandatory before emit_event (SKILL.md)

    # ADR-01: sync a task reminder into the centralized tasks table
    task_reminder = Task(
        user_id=current_user.id,
        title=f"Pago deuda: {payload.name}",
        description=(
            f"Pago mensual: ${payload.monthly_payment:.2f} — Saldo: ${payload.outstanding_balance:.2f}"
        ),
        source_module="finance",
        status="todo",
        priority=3,
        due_date=payload.next_payment_date,
        scheduled_date=payload.next_payment_date,
    )
    session.add(task_reminder)

    emit_event(
        session,
        current_user.id,
        EventType.DEBT_CREATED,
        "finance",
        {
            "debt_name": payload.name,
            "outstanding_balance": payload.outstanding_balance,
            "next_payment_date": str(payload.next_payment_date) if payload.next_payment_date else None,
        },
    )
    session.commit()
    session.refresh(debt)
    session.refresh(task_reminder)

    return {"debt": debt, "task_reminder": task_reminder}


@router.get("/debts")
def list_debts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all debts/loans for the authenticated user."""
    return session.exec(
        select(DebtLoan).where(DebtLoan.user_id == current_user.id)
    ).all()


# =====================================================================
# SUBSCRIPTIONS (ADR-01: auto-creates Task reminder)
# =====================================================================


@router.post("/subscriptions", status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Register a recurring subscription charge.
    ADR-01: Automatically creates a Task reminder in the centralized tasks table.
    """
    subscription = Subscription(
        user_id=current_user.id,
        instrument_id=payload.instrument_id,
        name=payload.name,
        amount=payload.amount,
        currency=payload.currency,
        billing_day=payload.billing_day,
        category=payload.category,
        next_billing_date=payload.next_billing_date,
    )
    session.add(subscription)
    session.flush()  # Mandatory before emit_event (SKILL.md)

    # ADR-01: sync a task reminder into the centralized tasks table
    task_reminder = Task(
        user_id=current_user.id,
        title=f"Suscripción: {payload.name}",
        description=f"Cargo recurrente: ${payload.amount:.2f} {payload.currency} — Categoría: {payload.category}",
        source_module="finance",
        status="todo",
        priority=2,
        due_date=payload.next_billing_date,
        scheduled_date=payload.next_billing_date,
    )
    session.add(task_reminder)

    emit_event(
        session,
        current_user.id,
        EventType.SUBSCRIPTION_CREATED,
        "finance",
        {
            "subscription_name": payload.name,
            "amount": payload.amount,
            "billing_day": payload.billing_day,
            "next_billing_date": str(payload.next_billing_date) if payload.next_billing_date else None,
        },
    )
    session.commit()
    session.refresh(subscription)
    session.refresh(task_reminder)

    return {"subscription": subscription, "task_reminder": task_reminder}


@router.get("/subscriptions")
def list_subscriptions(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all subscriptions for the authenticated user."""
    return session.exec(
        select(Subscription).where(Subscription.user_id == current_user.id)
    ).all()


# =====================================================================
# EVENT HANDLERS (EVENT BUS SUBSCRIBERS) — UNCHANGED
# =====================================================================


def _handle_grocery_purchase(session: Session, user_id: int, payload: dict):
    """
    Escucha cuando se registra una compra en Despensa.
    Si el payload incluye una cuenta bancaria, descuenta el saldo y registra el movimiento.
    """
    account_id = payload.get("account_id")
    cost = payload.get("cost", 0)
    item_name = payload.get("item_name", "Despensa")

    if not account_id or cost <= 0:
        return

    # Buscar la cuenta de liquidez
    account = session.exec(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    ).first()

    if account:
        # Descontar el dinero de la cuenta
        account.balance = round(account.balance - cost, 2)

        # Registrar el gasto en el libro mayor
        tx = Transaction(
            account_id=account.id,
            amount=cost,
            type="expense",
            category="Supermercado",
            description=f"Compra: {item_name}",
        )
        session.add(account)
        session.add(tx)
        # Nota: No hacemos session.commit() aquí. El módulo de Despensa lo hará
        # al final para garantizar que todo (inventario y dinero) se guarde junto.


# Suscribir la función al evento tan pronto como FastAPI cargue este archivo
subscribe(EventType.GROCERY_PURCHASE_COMPLETED, _handle_grocery_purchase)
