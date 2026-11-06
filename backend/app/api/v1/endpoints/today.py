# backend/app/api/v1/endpoints/today.py
import calendar
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.events import emit_event, EventType
from app.models.entities import (
    User,
    Task,
    HabitTracker,
    Account,
    PaymentInstrument,
    Subscription,
    PantryItem,
    WorkoutLog,
)

router = APIRouter(prefix="/api/v1/today", tags=["Today"])


# --- Schemas ---
class TaskCreateToday(SQLModel):
    title: str
    description: Optional[str] = None
    priority: int = 2  # 1: Low, 2: Medium, 3: High, 4: Urgent
    due_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    time_block: Optional[str] = None  # e.g. "08:00 - 09:30"
    goal_id: Optional[int] = None


class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    due_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    time_block: Optional[str] = None
    goal_id: Optional[int] = None
    status: Optional[str] = None


class HabitCreate(SQLModel):
    name: str
    frequency: str = "daily"


DEFAULT_HABIT_SEEDS = [
    {"name": "Anki English Deck (20m)", "frequency": "daily", "current_streak": 5},
    {"name": "Fuerza / Gym & Movilidad", "frequency": "daily", "current_streak": 3},
    {"name": "Lectura Técnica / HIL", "frequency": "daily", "current_streak": 8},
]


@router.get("/overview")
def get_today_overview(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """
    Central Cockpit Aggregator:
    Orchestrates today's tasks, habit telemetry, financial safe-to-spend,
    and pantry expiry/stock warnings across ERP modules.
    """
    today = date.today()
    now = datetime.utcnow()

    # 1. Tasks for Today
    # Include:
    # - Tasks with due_date <= today
    # - Tasks with scheduled_date == today
    # - Tasks without due_date if not completed
    # - Tasks completed today
    all_user_tasks = session.exec(
        select(Task).where(Task.user_id == current_user.id)
    ).all()

    tasks_today: List[Task] = []
    for t in all_user_tasks:
        is_completed = t.status == "done" or t.status == "completed"
        is_due_today_or_overdue = t.due_date is not None and t.due_date <= today
        is_scheduled_today = t.scheduled_date is not None and t.scheduled_date == today
        is_floating_todo = t.due_date is None and t.scheduled_date is None and not is_completed
        completed_today = (
            is_completed
            and t.completed_at is not None
            and t.completed_at.date() == today
        )

        if is_due_today_or_overdue or is_scheduled_today or is_floating_todo or completed_today:
            tasks_today.append(t)

    # Sort: pending first, then by priority desc, then time_block
    def sort_key(task: Task):
        is_done = 1 if (task.status in ("done", "completed")) else 0
        return (is_done, -task.priority, task.time_block or "99:99")

    tasks_today.sort(key=sort_key)

    tasks_completed_count = sum(1 for t in tasks_today if t.status in ("done", "completed"))
    tasks_pending_count = len(tasks_today) - tasks_completed_count

    # 2. Habit Tracker (Auto-seed if empty)
    habits = list(
        session.exec(
            select(HabitTracker).where(HabitTracker.user_id == current_user.id)
        ).all()
    )

    if not habits:
        seeded_habits = []
        for h_seed in DEFAULT_HABIT_SEEDS:
            h = HabitTracker(
                user_id=current_user.id,
                name=h_seed["name"],
                frequency=h_seed["frequency"],
                current_streak=h_seed["current_streak"],
                last_completed_date=today - timedelta(days=1),
            )
            session.add(h)
            seeded_habits.append(h)
        session.commit()
        for h in seeded_habits:
            session.refresh(h)
        habits = seeded_habits

    # 3. Financial Telemetry (Safe-to-Spend & Net Liquidity)
    accounts = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).all()
    instruments = session.exec(
        select(PaymentInstrument).where(PaymentInstrument.user_id == current_user.id)
    ).all()
    subscriptions = session.exec(
        select(Subscription).where(Subscription.user_id == current_user.id)
    ).all()

    total_balance = sum(acc.balance for acc in accounts)
    liquid_balance = sum(acc.balance for acc in accounts if acc.is_liquid)
    credit_debt_total = sum(
        instr.current_debt for instr in instruments if instr.instrument_type == "credit_card"
    )
    net_liquidity = round(liquid_balance - credit_debt_total, 2)

    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_remaining = max(1, days_in_month - now.day + 1)
    subs_remaining = sum(
        sub.amount
        for sub in subscriptions
        if sub.status == "active"
        and (sub.billing_day is None or (sub.billing_day or 0) >= now.day)
    )
    spendable = max(0.0, net_liquidity - subs_remaining)
    safe_to_spend_daily = round(spendable / days_remaining, 2)

    # 5. Health & Workout Telemetry
    workout_today = session.exec(
        select(WorkoutLog).where(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.date == today,
        )
    ).first()
    workout_completed_today = workout_today is not None

    # 4. Pantry Warnings (Expiring in <= 3 days or Low Stock)
    pantry_items = session.exec(
        select(PantryItem).where(PantryItem.user_id == current_user.id)
    ).all()

    pantry_alerts = []
    expiry_horizon = today + timedelta(days=3)
    for p in pantry_items:
        if p.current_qty <= p.min_qty:
            pantry_alerts.append({
                "id": p.id,
                "name": p.name,
                "type": "low_stock",
                "message": f"Stock bajo: {p.current_qty} {p.unit} (mín: {p.min_qty} {p.unit})",
            })
        elif p.expiration_date and p.expiration_date <= expiry_horizon:
            days_left = (p.expiration_date - today).days
            msg = "Caduca hoy!" if days_left == 0 else f"Caduca en {days_left} día(s)"
            pantry_alerts.append({
                "id": p.id,
                "name": p.name,
                "type": "expiring",
                "message": f"{p.name} - {msg} ({p.expiration_date})",
            })

    return {
        "date": today.isoformat(),
        "tasks_today": tasks_today,
        "summary_counts": {
            "total": len(tasks_today),
            "completed": tasks_completed_count,
            "pending": tasks_pending_count,
        },
        "habits": habits,
        "financial_summary": {
            "total_balance": round(total_balance, 2),
            "net_liquidity": net_liquidity,
            "credit_debt_total": round(credit_debt_total, 2),
            "safe_to_spend_daily": safe_to_spend_daily,
            "days_remaining_in_month": days_remaining,
        },
        "pantry_alerts": pantry_alerts,
        "workout_completed_today": workout_completed_today,
    }


@router.post("/tasks", status_code=status.HTTP_201_CREATED, response_model=Task)
def create_task_today(
    payload: TaskCreateToday,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Quickly create a task scheduled for Today in the centralized tasks table (ADR-01)."""
    today = date.today()
    new_task = Task(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        source_module="agenda",
        status="todo",
        priority=payload.priority,
        scheduled_date=payload.scheduled_date or today,
        due_date=payload.due_date or today,
        time_block=payload.time_block,
        goal_id=payload.goal_id,
    )
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task


@router.patch("/tasks/{task_id}/toggle", response_model=Task)
def toggle_task_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Toggle a task's status between todo and completed/done, emitting TaskCompleted event."""
    task = session.exec(
        select(Task).where(Task.id == task_id, Task.user_id == current_user.id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_currently_done = task.status in ("completed", "done")
    if is_currently_done:
        task.status = "todo"
        task.completed_at = None
    else:
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        session.flush()

        emit_event(
            session,
            current_user.id,
            EventType.TASK_COMPLETED,
            task.source_module or "agenda",
            {
                "task_id": task.id,
                "title": task.title,
                "project_id": task.project_id,
                "goal_id": task.goal_id,
            },
        )

    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=Task)
def update_task_today(
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update a task's details in the centralized tasks table (ADR-01)."""
    task = session.exec(
        select(Task).where(Task.id == task_id, Task.user_id == current_user.id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(task, field, val)

    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_task_today(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete a task from the centralized tasks table (ADR-01)."""
    task = session.exec(
        select(Task).where(Task.id == task_id, Task.user_id == current_user.id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully", "task_id": task_id}


@router.post("/habits/{habit_id}/check", response_model=HabitTracker)
def check_habit_today(
    habit_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Mark a habit as completed today, incrementing streak if not already checked today."""
    habit = session.exec(
        select(HabitTracker).where(
            HabitTracker.id == habit_id, HabitTracker.user_id == current_user.id
        )
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    today = date.today()
    if habit.last_completed_date == today:
        # Already checked today: toggle back
        habit.current_streak = max(0, habit.current_streak - 1)
        habit.last_completed_date = today - timedelta(days=1)
    else:
        # Check today: increment streak
        habit.current_streak += 1
        habit.last_completed_date = today

    session.add(habit)
    session.commit()
    session.refresh(habit)
    return habit


@router.post("/habits", status_code=status.HTTP_201_CREATED, response_model=HabitTracker)
def create_habit(
    payload: HabitCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Register a new habit to track daily or weekly."""
    new_habit = HabitTracker(
        user_id=current_user.id,
        name=payload.name,
        frequency=payload.frequency,
        current_streak=0,
    )
    session.add(new_habit)
    session.commit()
    session.refresh(new_habit)
    return new_habit
