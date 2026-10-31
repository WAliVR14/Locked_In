# backend/app/models/entities.py
from datetime import date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel


# =====================================================================
# 0. EVENT SECURITY AND AUDITING (CORE & EVENT BUS)
# =====================================================================
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default="admin")  # 'admin' o 'demo'
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DomainEventAudit(SQLModel, table=True):
    """Transactional log of internal events between ERP modules."""
    __tablename__ = "domain_events_audit"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    event_type: str = Field(index=True)       # Ej: 'GroceryPurchaseCompleted'
    source_module: str                        # Ej: 'pantry', 'finance', 'gym'
    payload_json: str                         # Event data serialized in JSON
    created_at: datetime = Field(default_factory=datetime.utcnow)


# =====================================================================
# 1. PERSONAL FINANCE (INSTITUTIONS, LIQUIDITY, CREDIT, AND FUNDS)
# =====================================================================
class Institution(SQLModel, table=True):
    """Configurable financial institution (BBVA, Nu, Mercado Pago, Revolut, GBM, Plata, Liverpool)."""
    __tablename__ = "institutions"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str = Field(index=True)
    category: str = Field(default="bank")  # bank, fintech, broker, retail


class Account(SQLModel, table=True):
    """Liquidity/asset accounts (Maintains 100% compatibility with Day 6)."""
    __tablename__ = "accounts"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    institution_id: Optional[int] = Field(default=None, foreign_key="institutions.id")
    name: str
    type: str = Field(default="debit")  # debit, cash, investment, savings
    balance: float = Field(default=0.0)
    currency: str = Field(default="MXN")
    is_liquid: bool = Field(default=True)  # True if it counts toward Safe-to-Spend


class PaymentInstrument(SQLModel, table=True):
    """Debit or credit cards with limit controls, a statement closing date, and a payment due date."""
    __tablename__ = "payment_instruments"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    institution_id: Optional[int] = Field(default=None, foreign_key="institutions.id")
    linked_account_id: Optional[int] = Field(default=None, foreign_key="accounts.id")
    name: str                                  # Ej: 'Nu Crédito', 'Liverpool Visa', 'BBVA Débito'
    instrument_type: str = Field(default="credit")  # 'debit_card' o 'credit_card'
    credit_limit: float = Field(default=0.0)
    current_debt: float = Field(default=0.0)   # Balance used pending settlement
    cutoff_day: Optional[int] = None           # Day of the month for the cutoff (1–31)
    payment_due_day: Optional[int] = None      # Monthly payment deadline (1–31)


class Transaction(SQLModel, table=True):
    """General ledger of transactions (Maintains compatibility with Day 6 and adds support for credit/projects)."""
    __tablename__ = "transactions"
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: Optional[int] = Field(default=None, foreign_key="accounts.id", index=True)
    instrument_id: Optional[int] = Field(default=None, foreign_key="payment_instruments.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id", index=True)
    amount: float
    type: str  # income, expense, transfer_out, transfer_in, credit_charge, credit_payment
    category: str = Field(default="General", index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SavingsFund(SQLModel, table=True):
    """Savings funds and specific budgets by category or goal."""
    __tablename__ = "savings_funds"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    target_amount: float = Field(default=0.0)
    current_saved: float = Field(default=0.0)
    monthly_allocation: float = Field(default=0.0)


# =====================================================================
# 2. SUPPLIES, PRICE COMPARISON, AND HOME (DECISION 4)
# =====================================================================
class Store(SQLModel, table=True):
    """Stores and supermarkets for comparing actual historical prices."""
    __tablename__ = "stores"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str = Field(index=True)  # Ej: 'Walmart', 'Costco', 'Chedraui', 'Local Market'
    location_note: Optional[str] = None


class PantryItem(SQLModel, table=True):
    """Inventory of food and household products (backward-compatible with the base schema)."""
    __tablename__ = "pantry_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    category: str = Field(default="Alimentos", index=True)  # Fruits, Meats, Dairy, Cleaning, Hygiene
    brand: Optional[str] = None
    current_qty: float = Field(default=0.0)
    min_qty: float = Field(default=1.0)
    unit: str = Field(default="pz")  # pz, kg, g, L, ml
    estimated_price: float = Field(default=0.0)
    expiration_date: Optional[date] = None
    preferred_store_id: Optional[int] = Field(default=None, foreign_key="stores.id")


class StorePriceLog(SQLModel, table=True):
    """Actual purchase history for comparing the equivalent unit price across stores."""
    __tablename__ = "store_price_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    pantry_item_id: int = Field(foreign_key="pantry_items.id", index=True)
    store_id: int = Field(foreign_key="stores.id", index=True)
    brand: Optional[str] = None
    presentation_qty: float = Field(default=1.0)   # Ej: 1.5 (Liters)
    presentation_unit: str = Field(default="pz")   # Ej: 'L'
    price_paid: float                              # Price paid for that presentation
    unit_price_normalized: float                   # Calculator: price_paid / presentation_qty
    observed_at: date = Field(default_factory=date.today, index=True)


class HomeObligation(SQLModel, table=True):
    """Household responsibilities: recurring utility payments, appliances, and repairs."""
    __tablename__ = "home_obligations"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str                                     # Ej: 'CFE Bill', 'Washing Machine Maintenance'
    category: str = Field(default="service")      # service, cleaning, appliance, repair
    estimated_cost: float = Field(default=0.0)
    next_due_date: Optional[date] = Field(default=None, index=True)
    frequency_days: Optional[int] = None          # Ej: 30 for monthly, 60 for bimonthly
    notes: Optional[str] = None


# =====================================================================
# 3. BIO, GYM, AND PHYSICAL HEALTH + HUAWEI BAND 7 (OPTION 3)
# =====================================================================
class Exercise(SQLModel, table=True):
    __tablename__ = "exercises"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    muscle_group: str = Field(index=True)  # Push, Pull, Legs, Core, Cardio, MMA
    equipment: str = Field(default="barbell")


class WorkoutLog(SQLModel, table=True):
    __tablename__ = "workout_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    exercise_id: int = Field(foreign_key="exercises.id", index=True)
    weight_kg: float
    reps: int
    rpe: float = Field(default=8.0)
    estimated_1rm: float = Field(default=0.0)
    logged_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class BiometricDaily(SQLModel, table=True):
    """Daily health and intake metrics from Huawei Band 7 / Health Connect / manual entry."""
    __tablename__ = "biometric_daily"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    record_date: date = Field(default_factory=date.today, index=True)
    sleep_hours: Optional[float] = None
    resting_hr_bpm: Optional[int] = None
    steps: Optional[int] = None
    body_weight_kg: Optional[float] = None
    recovery_score_manual: Optional[int] = None   # 1-100 (Captured in Daily Review if not coming from the API)
    source: str = Field(default="manual")         # 'manual_widget', 'file_import', 'health_connect'


# =====================================================================
# 4. STRATEGY AND CAREER (GOALS, PROJECTS, LEARNING, AND APPLICATIONS — DECISION 1)
# =====================================================================
class Goal(SQLModel, table=True):
    __tablename__ = "goals"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str
    description: Optional[str] = None
    horizon: str = Field(default="medium", index=True)  # 'short' (semanas), 'medium' (3-12m), 'long' (1-10a)
    priority: int = Field(default=2)                    # 1: Baja, 2: Media, 3: Alta
    status: str = Field(default="active", index=True)   # pending, active, paused, completed, cancelled
    progress_pct: int = Field(default=0)
    target_budget: float = Field(default=0.0)
    deadline: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Project(SQLModel, table=True):
    __tablename__ = "projects"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    goal_id: Optional[int] = Field(default=None, foreign_key="goals.id", index=True)
    title: str
    category: str = Field(default="Engineering")  # Engineering, Software, 3D_Print, Personal
    status: str = Field(default="active")         # idea, active, archived, completed
    budget_allocated: float = Field(default=0.0)
    budget_spent: float = Field(default=0.0)
    progress_pct: int = Field(default=0)
    documentation_url: Optional[str] = None
    deadline: Optional[date] = None


class Skill(SQLModel, table=True):
    """Skill Matrix: Current vs. desired level and connection to courses and projects."""
    __tablename__ = "skills"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str                                    # Ej: 'FastAPI', 'Inglés B2', 'Embedded C / RTOS'
    category: str = Field(default="Tech")        # Tech, Embedded, AI, Language, SoftSkill
    current_level: int = Field(default=1)        # Scale 1 to 5
    target_level: int = Field(default=5)         # Scale 1 to 5
    importance: int = Field(default=3)           # 1 to 3
    evidence_notes: Optional[str] = None


class LearningItem(SQLModel, table=True):
    """Courses, books, certifications, and languages."""
    __tablename__ = "learning_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    skill_id: Optional[int] = Field(default=None, foreign_key="skills.id", index=True)
    goal_id: Optional[int] = Field(default=None, foreign_key="goals.id", index=True)
    title: str                                   # Ej: 'Samsung Innovation Campus AI', 'The Daily Stoic'
    item_type: str = Field(default="course")     # course, book, certification, language
    status: str = Field(default="in_progress")   # pending, in_progress, completed
    hours_logged: float = Field(default=0.0)
    total_hours_estimated: float = Field(default=10.0)


class JobApplication(SQLModel, table=True):
    """Career management CRM: job openings, companies, interviews, and resume tracking."""
    __tablename__ = "job_applications"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    company: str
    role_title: str
    stage: str = Field(default="saved", index=True)  # saved, applied, screening, technical, offer, rejected
    cv_version: Optional[str] = None
    contact_name: Optional[str] = None
    applied_date: Optional[date] = None
    notes: Optional[str] = None


# =====================================================================
# 5. SCHEDULE, HABITS, AND CENTRALIZED TASK SYSTEM (DECISION 1)
# =====================================================================
class Task(SQLModel, table=True):
    """
    Unified Centralized Task Entity for the entire Locked_In system.
    Connect Today’s Agenda with Goals, Projects (Kanban), Learning, Job Applications, and Home.
    """
    __tablename__ = "tasks"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str
    description: Optional[str] = None
    source_module: str = Field(default="agenda", index=True)  # agenda, goal, project, learning, career, home
    status: str = Field(default="todo", index=True)           # backlog, todo, in_progress, review, done
    priority: int = Field(default=2)                          # 1: Low, 2: Medium, 3: High, 4: Urgent+Important

    scheduled_date: Optional[date] = Field(default=None, index=True)  # If it’s today, it appears in Today
    due_date: Optional[date] = Field(default=None, index=True)
    time_block: Optional[str] = None                                  # Ej: '09:00 - 10:30'
    is_recurring: bool = Field(default=False)
    recurrence_rule: Optional[str] = None                             # Ej: 'DAILY', 'WEEKLY'

    # Optional relational links (referential integrity without duplicating tables)
    goal_id: Optional[int] = Field(default=None, foreign_key="goals.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id", index=True)
    learning_item_id: Optional[int] = Field(default=None, foreign_key="learning_items.id", index=True)
    job_application_id: Optional[int] = Field(default=None, foreign_key="job_applications.id", index=True)
    home_obligation_id: Optional[int] = Field(default=None, foreign_key="home_obligations.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class Habit(SQLModel, table=True):
    """Daily habits and morning/evening routines."""
    __tablename__ = "habits"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str                                    # Ej: 'Anki English Deck', 'Stoic Reading', 'Training'
    routine_block: str = Field(default="morning")  # morning, afternoon, night, anytime
    current_streak: int = Field(default=0)
    last_completed_date: Optional[date] = None