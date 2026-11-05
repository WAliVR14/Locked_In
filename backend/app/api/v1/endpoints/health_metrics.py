# backend/app/api/v1/endpoints/health_metrics.py
from datetime import date, timedelta
import datetime as _dt
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Field, Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.events import emit_event, EventType
from app.models.entities import User, WorkoutLog, HealthMetric

router = APIRouter(prefix="/api/v1/health-metrics", tags=["Health Metrics"])


# --- Input Schemas ---
class WorkoutCreate(SQLModel):
    title: str
    type: str = "Strength"  # Strength, Cardio, Calisthenics, Flexibility
    duration_minutes: int = Field(default=45, gt=0)
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    date: Optional[_dt.date] = None


class HealthMetricCreate(SQLModel):
    metric_type: str  # Weight, SleepHours, HeartRate
    value: float = Field(gt=0)
    unit: str  # kg, hours, bpm
    date: Optional[_dt.date] = None


# --- Seed Data Defaults ---
DEFAULT_WORKOUT_SEEDS = [
    {
        "title": "Push-Pull-Legs (Fuerza e Hipertrofia)",
        "type": "Strength",
        "duration_minutes": 60,
        "calories_burned": 420,
        "notes": "Gimnasio FORVIA HELLA",
        "days_ago": 0,
    },
    {
        "title": "Carrera 5K - Prep. Pico de Orizaba",
        "type": "Cardio",
        "duration_minutes": 30,
        "calories_burned": 310,
        "notes": "Ritmo continuo 5:45 min/km",
        "days_ago": 1,
    },
    {
        "title": "Rutina Calistenia",
        "type": "Calisthenics",
        "duration_minutes": 45,
        "calories_burned": 260,
        "notes": "Fondos, dominadas y core",
        "days_ago": 2,
    },
]

DEFAULT_METRIC_SEEDS = [
    {"metric_type": "SleepHours", "value": 7.5, "unit": "hours", "days_ago": 0},
    {"metric_type": "Weight", "value": 72.5, "unit": "kg", "days_ago": 0},
    {"metric_type": "HeartRate", "value": 62.0, "unit": "bpm", "days_ago": 0},
]


@router.get("/workouts", response_model=List[WorkoutLog])
def list_workouts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all workouts for current user. Auto-seeds default mock workouts if empty."""
    workouts = session.exec(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == current_user.id)
        .order_by(WorkoutLog.date.desc())
    ).all()

    if not workouts:
        today = date.today()
        seeded = []
        for seed in DEFAULT_WORKOUT_SEEDS:
            w = WorkoutLog(
                user_id=current_user.id,
                title=seed["title"],
                type=seed["type"],
                duration_minutes=seed["duration_minutes"],
                calories_burned=seed["calories_burned"],
                notes=seed["notes"],
                date=today - timedelta(days=seed["days_ago"]),
            )
            session.add(w)
            seeded.append(w)
        session.commit()
        for w in seeded:
            session.refresh(w)
        return seeded

    return workouts


@router.post("/workouts", status_code=status.HTTP_201_CREATED, response_model=WorkoutLog)
def create_workout(
    payload: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Log a workout session.
    Emits EventType.WORKOUT_COMPLETED synchronously through the transactional Event Bus.
    """
    workout_date = payload.date or date.today()
    workout = WorkoutLog(
        user_id=current_user.id,
        title=payload.title,
        type=payload.type,
        duration_minutes=payload.duration_minutes,
        calories_burned=payload.calories_burned,
        notes=payload.notes,
        date=workout_date,
    )
    session.add(workout)
    session.flush()

    emit_event(
        session,
        current_user.id,
        EventType.WORKOUT_COMPLETED,
        "health",
        {
            "workout_id": workout.id,
            "title": workout.title,
            "type": workout.type,
            "duration_minutes": workout.duration_minutes,
            "date": str(workout.date),
        },
    )

    session.commit()
    session.refresh(workout)
    return workout


@router.delete("/workouts/{workout_id}", status_code=status.HTTP_200_OK)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete a workout log entry."""
    workout = session.exec(
        select(WorkoutLog).where(
            WorkoutLog.id == workout_id, WorkoutLog.user_id == current_user.id
        )
    ).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    session.delete(workout)
    session.commit()
    return {"message": "Workout deleted successfully"}


@router.get("/metrics", response_model=List[HealthMetric])
def list_health_metrics(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List biometric metrics. Auto-seeds defaults if empty."""
    metrics = session.exec(
        select(HealthMetric)
        .where(HealthMetric.user_id == current_user.id)
        .order_by(HealthMetric.date.desc())
    ).all()

    if not metrics:
        today = date.today()
        seeded = []
        for seed in DEFAULT_METRIC_SEEDS:
            m = HealthMetric(
                user_id=current_user.id,
                metric_type=seed["metric_type"],
                value=seed["value"],
                unit=seed["unit"],
                date=today - timedelta(days=seed["days_ago"]),
            )
            session.add(m)
            seeded.append(m)
        session.commit()
        for m in seeded:
            session.refresh(m)
        return seeded

    return metrics


@router.post("/metrics", status_code=status.HTTP_201_CREATED, response_model=HealthMetric)
def create_health_metric(
    payload: HealthMetricCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Log a biometric health metric (Weight, SleepHours, HeartRate)."""
    metric_date = payload.date or date.today()
    metric = HealthMetric(
        user_id=current_user.id,
        metric_type=payload.metric_type,
        value=payload.value,
        unit=payload.unit,
        date=metric_date,
    )
    session.add(metric)
    session.commit()
    session.refresh(metric)
    return metric


@router.get("/summary")
def get_health_summary(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Calculate aggregated telemetry for weekly training and health recovery."""
    today = date.today()
    week_ago = today - timedelta(days=7)

    workouts = session.exec(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == current_user.id, WorkoutLog.date >= week_ago)
    ).all()

    metrics = session.exec(
        select(HealthMetric)
        .where(HealthMetric.user_id == current_user.id)
        .order_by(HealthMetric.date.desc())
    ).all()

    weekly_minutes = sum(w.duration_minutes for w in workouts)
    weekly_calories = sum(w.calories_burned or 0 for w in workouts)
    workouts_count = len(workouts)

    sleep_metrics = [m for m in metrics if m.metric_type == "SleepHours"]
    avg_sleep = (
        round(sum(m.value for m in sleep_metrics) / len(sleep_metrics), 1)
        if sleep_metrics
        else 7.5
    )

    weight_metrics = [m for m in metrics if m.metric_type == "Weight"]
    latest_weight = weight_metrics[0].value if weight_metrics else 72.5

    return {
        "weekly_minutes": weekly_minutes,
        "weekly_workouts_count": workouts_count,
        "weekly_calories": weekly_calories,
        "avg_sleep_hours": avg_sleep,
        "latest_weight_kg": latest_weight,
    }
