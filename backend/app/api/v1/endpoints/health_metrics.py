# backend/app/api/v1/endpoints/health_metrics.py
from datetime import date, timedelta
import datetime as _dt
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Field, Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.events import emit_event, EventType
from app.models.entities import User, WorkoutLog, WorkoutBlock, Exercise, HealthMetric
from app.services.ai_coach import generate_workout_feedback

router = APIRouter(prefix="/api/v1/health-metrics", tags=["Health Metrics"])


# --- Schemas ---
class ExerciseInput(SQLModel):
    name: str
    sets: int = 3
    reps: int = 10
    weight: float = 0.0
    notes: Optional[str] = None
    muscle_group: Optional[str] = "General"
    order_index: int = 1


class WorkoutBlockInput(SQLModel):
    name: str = "Bloque 1"
    block_order: int = 1
    exercises: List[ExerciseInput] = []


class WorkoutCreate(SQLModel):
    title: str
    type: str = "Strength"  # Strength, Cardio, Calisthenics, Flexibility
    duration_minutes: int = Field(default=45, gt=0)
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    date: Optional[_dt.date] = None
    blocks: Optional[List[WorkoutBlockInput]] = None


class ExerciseDetail(SQLModel):
    id: Optional[int] = None
    name: str
    sets: int = 3
    reps: int = 10
    weight: float = 0.0
    notes: Optional[str] = None
    order_index: int = 1
    muscle_group: Optional[str] = "General"


class WorkoutBlockDetail(SQLModel):
    id: Optional[int] = None
    name: str = "Bloque 1"
    block_order: int = 1
    exercises: List[ExerciseDetail] = []


class WorkoutDetail(SQLModel):
    id: int
    user_id: int
    title: str
    type: str
    duration_minutes: int
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    date: _dt.date
    logged_at: _dt.datetime
    blocks: List[WorkoutBlockDetail] = []


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
        "blocks": [
            {
                "name": "Bloque 1 - Fuerza Principal",
                "block_order": 1,
                "exercises": [
                    {"name": "Press de Banca", "sets": 4, "reps": 6, "weight": 80.0, "notes": "RPE 8, muy fluido, listo para subir peso", "order_index": 1},
                    {"name": "Fondos en Paralelas", "sets": 3, "reps": 10, "weight": 0.0, "notes": "Sin dolor, buena técnica", "order_index": 2},
                ],
            },
            {
                "name": "Bloque 2 - Accesorios",
                "block_order": 2,
                "exercises": [
                    {"name": "Press Militar Mancuernas", "sets": 3, "reps": 10, "weight": 22.0, "notes": "Sentí tirón en hombro izquierdo en la 3ra serie", "order_index": 1},
                    {"name": "Elevaciones Laterales", "sets": 4, "reps": 15, "weight": 12.0, "notes": "Buen bombeo", "order_index": 2},
                ],
            },
            {
                "name": "Bloque 3 - Core & Finisher",
                "block_order": 3,
                "exercises": [
                    {"name": "Plancha Abdominal", "sets": 3, "reps": 45, "weight": 0.0, "notes": "45 segundos por serie", "order_index": 1},
                ],
            },
        ],
    },
    {
        "title": "Carrera 5K - Prep. Pico de Orizaba",
        "type": "Cardio",
        "duration_minutes": 30,
        "calories_burned": 310,
        "notes": "Ritmo continuo 5:45 min/km",
        "days_ago": 1,
        "blocks": [
            {
                "name": "Bloque 1 - Fondo Aeróbico",
                "block_order": 1,
                "exercises": [
                    {"name": "Carrera Continua 5K", "sets": 1, "reps": 1, "weight": 0.0, "notes": "Cadencia 165 ppm", "order_index": 1},
                ],
            }
        ],
    },
    {
        "title": "Rutina Calistenia",
        "type": "Calisthenics",
        "duration_minutes": 45,
        "calories_burned": 260,
        "notes": "Fondos, dominadas y core",
        "days_ago": 2,
        "blocks": [
            {
                "name": "Bloque 1 - Tracción y Empuje",
                "block_order": 1,
                "exercises": [
                    {"name": "Dominadas Pronas", "sets": 4, "reps": 8, "weight": 0.0, "notes": "Rango completo", "order_index": 1},
                    {"name": "Fondos en Barras", "sets": 4, "reps": 12, "weight": 0.0, "notes": "Fluido", "order_index": 2},
                ],
            }
        ],
    },
]

DEFAULT_METRIC_SEEDS = [
    {"metric_type": "SleepHours", "value": 7.5, "unit": "hours", "days_ago": 0},
    {"metric_type": "Weight", "value": 72.5, "unit": "kg", "days_ago": 0},
    {"metric_type": "HeartRate", "value": 62.0, "unit": "bpm", "days_ago": 0},
]


def _build_workout_detail(workout: WorkoutLog, session: Session, user_id: int) -> WorkoutDetail:
    """Helper to populate blocks and nested exercises for a WorkoutLog."""
    blocks = session.exec(
        select(WorkoutBlock)
        .where(WorkoutBlock.workout_id == workout.id, WorkoutBlock.user_id == user_id)
        .order_by(WorkoutBlock.block_order.asc())
    ).all()

    exercises = session.exec(
        select(Exercise)
        .where(Exercise.workout_id == workout.id, Exercise.user_id == user_id)
        .order_by(Exercise.order_index.asc())
    ).all()

    # Map exercises by block_id
    exercises_by_block: Dict[Optional[int], List[ExerciseDetail]] = {}
    for ex in exercises:
        ex_detail = ExerciseDetail(
            id=ex.id,
            name=ex.name,
            sets=ex.sets,
            reps=ex.reps,
            weight=ex.weight,
            notes=ex.notes,
            order_index=ex.order_index,
            muscle_group=ex.muscle_group,
        )
        exercises_by_block.setdefault(ex.block_id, []).append(ex_detail)

    block_details: List[WorkoutBlockDetail] = []
    for b in blocks:
        block_details.append(
            WorkoutBlockDetail(
                id=b.id,
                name=b.name,
                block_order=b.block_order,
                exercises=exercises_by_block.get(b.id, []),
            )
        )

    # Any exercises without a block
    unassigned = exercises_by_block.get(None, [])
    if unassigned and not block_details:
        block_details.append(
            WorkoutBlockDetail(
                id=None,
                name="Ejercicios",
                block_order=1,
                exercises=unassigned,
            )
        )

    return WorkoutDetail(
        id=workout.id,  # type: ignore[arg-type]
        user_id=workout.user_id,
        title=workout.title,
        type=workout.type,
        duration_minutes=workout.duration_minutes,
        calories_burned=workout.calories_burned,
        notes=workout.notes,
        date=workout.date,
        logged_at=workout.logged_at,
        blocks=block_details,
    )


@router.get("/workouts", response_model=List[WorkoutDetail])
def list_workouts(
    target_date: Optional[_dt.date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List workouts for current user, optionally filtered by target_date.
    Auto-seeds default mock workouts with structured blocks and exercises if empty.
    """
    query = select(WorkoutLog).where(WorkoutLog.user_id == current_user.id)
    if target_date is not None:
        query = query.where(WorkoutLog.date == target_date)
    query = query.order_by(WorkoutLog.date.desc())

    workouts = session.exec(query).all()

    if not workouts and target_date is None:
        today = date.today()
        seeded_logs = []
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
            session.flush()

            for b_seed in seed.get("blocks", []):
                block = WorkoutBlock(
                    user_id=current_user.id,
                    workout_id=w.id,  # type: ignore[arg-type]
                    name=b_seed["name"],
                    block_order=b_seed["block_order"],
                )
                session.add(block)
                session.flush()

                for ex_seed in b_seed.get("exercises", []):
                    ex = Exercise(
                        user_id=current_user.id,
                        workout_id=w.id,
                        block_id=block.id,
                        name=ex_seed["name"],
                        sets=ex_seed["sets"],
                        reps=ex_seed["reps"],
                        weight=ex_seed["weight"],
                        notes=ex_seed.get("notes"),
                        order_index=ex_seed.get("order_index", 1),
                    )
                    session.add(ex)

            seeded_logs.append(w)
        session.commit()
        for w in seeded_logs:
            session.refresh(w)
        workouts = seeded_logs

    return [_build_workout_detail(w, session, current_user.id) for w in workouts]


@router.post("/workouts", status_code=status.HTTP_201_CREATED, response_model=WorkoutDetail)
def create_workout(
    payload: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Log a workout session supporting modular WorkoutBlocks and Exercises.
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

    # Save blocks and exercises if provided
    if payload.blocks:
        for b_in in payload.blocks:
            block = WorkoutBlock(
                user_id=current_user.id,
                workout_id=workout.id,  # type: ignore[arg-type]
                name=b_in.name,
                block_order=b_in.block_order,
            )
            session.add(block)
            session.flush()

            for ex_in in b_in.exercises:
                exercise = Exercise(
                    user_id=current_user.id,
                    workout_id=workout.id,
                    block_id=block.id,
                    name=ex_in.name,
                    sets=ex_in.sets,
                    reps=ex_in.reps,
                    weight=ex_in.weight,
                    notes=ex_in.notes,
                    muscle_group=ex_in.muscle_group or "General",
                    order_index=ex_in.order_index,
                )
                session.add(exercise)

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
    return _build_workout_detail(workout, session, current_user.id)


@router.delete("/workouts/{workout_id}", status_code=status.HTTP_200_OK)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete a workout log entry and its associated blocks and exercises."""
    workout = session.exec(
        select(WorkoutLog).where(
            WorkoutLog.id == workout_id, WorkoutLog.user_id == current_user.id
        )
    ).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Cascade delete exercises and blocks
    exercises = session.exec(
        select(Exercise).where(Exercise.workout_id == workout_id, Exercise.user_id == current_user.id)
    ).all()
    for ex in exercises:
        session.delete(ex)

    blocks = session.exec(
        select(WorkoutBlock).where(WorkoutBlock.workout_id == workout_id, WorkoutBlock.user_id == current_user.id)
    ).all()
    for b in blocks:
        session.delete(b)

    session.delete(workout)
    session.commit()
    return {"message": "Workout deleted successfully"}


@router.post("/workouts/{workout_id}/ai-coach")
def get_workout_ai_feedback(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Generate intelligent workout progression and fatigue feedback via Gemini AI Coach."""
    return generate_workout_feedback(workout_id, session, current_user.id)


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
