# backend/app/api/v1/endpoints/insights.py
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.entities import (
    User,
    Account,
    PaymentInstrument,
    Transaction,
    Task,
    HabitTracker,
    WorkoutLog,
    HealthMetric,
)

router = APIRouter(prefix="/api/v1/insights", tags=["Insights"])


@router.get("/dashboard")
def get_insights_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """
    Consolidated analytics dashboard spanning all ERP domains (ADR-01):
    - Financial Burn Rate & Savings Rate
    - Productivity & Task Execution Efficiency
    - Habits Consistency & Discipline
    - Bio, Gym & Physical Telemetry
    """
    now = datetime.now(timezone.utc)
    today = date.today()
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    week_ago = today - timedelta(days=7)

    # -------------------------------------------------------------
    # 1. Financial Domain Telemetry
    # -------------------------------------------------------------
    accounts = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).all()
    account_ids = [acc.id for acc in accounts if acc.id is not None]

    instruments = session.exec(
        select(PaymentInstrument).where(PaymentInstrument.user_id == current_user.id)
    ).all()
    instrument_ids = [inst.id for inst in instruments if inst.id is not None]

    total_liquidity = sum(acc.balance for acc in accounts if acc.is_liquid)
    total_credit_debt = sum(
        inst.current_debt for inst in instruments if inst.instrument_type == "credit_card"
    )
    net_worth_liquid = round(total_liquidity - total_credit_debt, 2)

    # Fetch month transactions
    month_transactions: List[Transaction] = []
    if account_ids or instrument_ids:
        query = select(Transaction).where(
            Transaction.created_at >= month_start
        )
        all_month_tx = session.exec(query).all()
        month_transactions = [
            tx for tx in all_month_tx
            if (tx.account_id in account_ids) or (tx.instrument_id in instrument_ids)
        ]

    month_income = sum(tx.amount for tx in month_transactions if tx.type == "income")
    month_expenses = sum(
        tx.amount for tx in month_transactions if tx.type in ("expense", "credit_charge")
    )
    net_savings = round(month_income - month_expenses, 2)

    # Daily burn rate: expenses divided by days elapsed in current month
    days_elapsed = max(1, today.day)
    daily_burn_rate = round(month_expenses / days_elapsed, 2)

    savings_rate_pct = (
        round(((month_income - month_expenses) / month_income) * 100, 1)
        if month_income > 0
        else 0.0
    )

    # Category breakdown (top 5 expenses)
    category_totals: Dict[str, float] = {}
    for tx in month_transactions:
        if tx.type in ("expense", "credit_charge"):
            cat = tx.category or "General"
            category_totals[cat] = category_totals.get(cat, 0.0) + tx.amount

    top_categories = sorted(
        [{"category": cat, "amount": round(amt, 2)} for cat, amt in category_totals.items()],
        key=lambda x: x["amount"],
        reverse=True,
    )[:5]

    # -------------------------------------------------------------
    # 2. Tasks & Productivity Domain Telemetry
    # -------------------------------------------------------------
    user_tasks = session.exec(
        select(Task).where(Task.user_id == current_user.id)
    ).all()

    total_tasks = len(user_tasks)
    completed_tasks = sum(1 for t in user_tasks if t.status in ("completed", "done"))
    pending_tasks = total_tasks - completed_tasks

    completed_this_week = sum(
        1 for t in user_tasks
        if t.completed_at and t.completed_at.date() >= week_ago
    )

    overdue_tasks = sum(
        1 for t in user_tasks
        if t.due_date and t.due_date < today and t.status not in ("completed", "done")
    )

    high_priority_pending = sum(
        1 for t in user_tasks
        if t.priority >= 3 and t.status not in ("completed", "done")
    )

    task_completion_rate = (
        round((completed_tasks / total_tasks) * 100, 1)
        if total_tasks > 0
        else 0.0
    )

    # -------------------------------------------------------------
    # 3. Habits & Discipline Domain Telemetry
    # -------------------------------------------------------------
    habits = session.exec(
        select(HabitTracker).where(HabitTracker.user_id == current_user.id)
    ).all()

    total_habits = len(habits)
    habits_checked_today = sum(
        1 for h in habits if h.last_completed_date == today
    )
    max_streak = max((h.current_streak for h in habits), default=0)
    avg_streak = (
        round(sum(h.current_streak for h in habits) / total_habits, 1)
        if total_habits > 0
        else 0.0
    )
    habits_today_pct = (
        round((habits_checked_today / total_habits) * 100, 1)
        if total_habits > 0
        else 0.0
    )

    # -------------------------------------------------------------
    # 4. Bio, Gym & Health Domain Telemetry
    # -------------------------------------------------------------
    workouts_week = session.exec(
        select(WorkoutLog).where(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.date >= week_ago,
        )
    ).all()

    weekly_workout_minutes = sum(w.duration_minutes for w in workouts_week)
    weekly_workout_sessions = len(workouts_week)

    # Distribution by workout type
    workout_type_counts: Dict[str, int] = {}
    for w in workouts_week:
        workout_type_counts[w.type] = workout_type_counts.get(w.type, 0) + 1

    health_metrics = session.exec(
        select(HealthMetric).where(HealthMetric.user_id == current_user.id)
    ).all()

    sleep_metrics = [m for m in health_metrics if m.metric_type == "SleepHours"]
    recent_sleep = [m.value for m in sleep_metrics if m.date >= week_ago]
    avg_sleep_week = (
        round(sum(recent_sleep) / len(recent_sleep), 1)
        if recent_sleep
        else (round(sum(m.value for m in sleep_metrics) / len(sleep_metrics), 1) if sleep_metrics else 7.5)
    )

    weight_metrics = sorted(
        [m for m in health_metrics if m.metric_type == "Weight"],
        key=lambda m: m.date,
        reverse=True,
    )
    latest_weight = weight_metrics[0].value if weight_metrics else 72.5

    return {
        "finance": {
            "month_income": round(month_income, 2),
            "month_expenses": round(month_expenses, 2),
            "net_savings": net_savings,
            "daily_burn_rate": daily_burn_rate,
            "savings_rate_pct": savings_rate_pct,
            "net_worth_liquid": net_worth_liquid,
            "total_liquidity": round(total_liquidity, 2),
            "total_credit_debt": round(total_credit_debt, 2),
            "top_categories": top_categories,
        },
        "tasks": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completed_this_week": completed_this_week,
            "overdue_tasks": overdue_tasks,
            "high_priority_pending": high_priority_pending,
            "completion_rate_pct": task_completion_rate,
        },
        "habits": {
            "total_habits": total_habits,
            "checked_today": habits_checked_today,
            "habits_today_pct": habits_today_pct,
            "max_streak": max_streak,
            "avg_streak": avg_streak,
        },
        "bio_gym": {
            "weekly_sessions": weekly_workout_sessions,
            "weekly_minutes": weekly_workout_minutes,
            "workout_type_distribution": workout_type_counts,
            "avg_sleep_hours": avg_sleep_week,
            "latest_weight_kg": latest_weight,
        },
        "generated_at": now.isoformat(),
    }
