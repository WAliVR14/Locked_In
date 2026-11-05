# backend/app/api/v1/endpoints/strategy.py
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Field, Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.events import emit_event, EventType
from app.models.entities import User, Goal, Task

router = APIRouter(prefix="/api/v1/strategy", tags=["Strategy"])


# --- Schemas ---
class GoalCreate(SQLModel):
    title: str
    description: Optional[str] = None
    category: str = "Career"  # Career, Education, Business, Health
    horizon: str = "medium"   # short, medium, long
    priority: int = 2
    progress_pct: int = Field(default=0, ge=0, le=100)
    target_budget: float = 0.0
    deadline: Optional[date] = None
    target_date: Optional[date] = None


class GoalProgressUpdate(SQLModel):
    progress_pct: int = Field(ge=0, le=100)
    status: Optional[str] = None


class GoalTaskCreate(SQLModel):
    title: str
    description: Optional[str] = None
    priority: int = 2
    due_date: Optional[date] = None
    time_block: Optional[str] = None


# --- Seed Data ---
DEFAULT_GOAL_SEEDS = [
    {
        "title": "Certificación Inglés B2/C1 (Preply/Open English)",
        "description": "Dominio conversacional profesional y fluidez técnica para entrevistas y entornos globales.",
        "category": "Education",
        "horizon": "medium",
        "priority": 3,
        "progress_pct": 70,
        "status": "active",
    },
    {
        "title": "Residencia FORVIA HELLA - Automatización HIL-BERTO",
        "description": "Desarrollo y validación de hardware-in-the-loop y bancos de prueba automotrices.",
        "category": "Career",
        "horizon": "medium",
        "priority": 3,
        "progress_pct": 40,
        "status": "active",
    },
    {
        "title": "Escalamiento MecaPath / Contenido Educativo",
        "description": "Crecimiento de canal y plataforma de ingeniería, mecatrónica y manufactura 3D.",
        "category": "Business",
        "horizon": "long",
        "priority": 2,
        "progress_pct": 20,
        "status": "active",
    },
]


@router.get("/goals", response_model=List[Goal])
def list_goals(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all goals for current user. Auto-seeds default mock goals if empty."""
    goals = session.exec(
        select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.created_at.desc())
    ).all()

    if not goals:
        seeded = []
        for seed_data in DEFAULT_GOAL_SEEDS:
            g = Goal(
                user_id=current_user.id,
                title=seed_data["title"],
                description=seed_data["description"],
                category=seed_data["category"],
                horizon=seed_data["horizon"],
                priority=seed_data["priority"],
                progress_pct=seed_data["progress_pct"],
                status=seed_data["status"],
            )
            session.add(g)
            seeded.append(g)
        session.commit()
        for g in seeded:
            session.refresh(g)
        return seeded

    return goals


@router.post("/goals", status_code=status.HTTP_201_CREATED, response_model=Goal)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a strategic goal / OKR."""
    target_dt = payload.target_date or payload.deadline
    goal = Goal(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        horizon=payload.horizon,
        priority=payload.priority,
        progress_pct=payload.progress_pct,
        target_budget=payload.target_budget,
        deadline=target_dt,
        target_date=target_dt,
        status="active" if payload.progress_pct < 100 else "completed",
    )
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal


@router.patch("/goals/{goal_id}/progress", response_model=Goal)
def update_goal_progress(
    goal_id: int,
    payload: GoalProgressUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update goal progress percentage and status."""
    goal = session.exec(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.progress_pct = payload.progress_pct
    if payload.status:
        goal.status = payload.status
    elif payload.progress_pct >= 100:
        goal.status = "completed"

    session.add(goal)
    session.flush()

    emit_event(
        session,
        current_user.id,
        EventType.GOAL_PROGRESS_UPDATED,
        "strategy",
        {
            "goal_id": goal.id,
            "title": goal.title,
            "progress_pct": goal.progress_pct,
            "status": goal.status,
        },
    )

    session.commit()
    session.refresh(goal)
    return goal


@router.post("/goals/{goal_id}/tasks", status_code=status.HTTP_201_CREATED, response_model=Task)
def create_task_for_goal(
    goal_id: int,
    payload: GoalTaskCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a task associated with a goal in the centralized tasks table (ADR-01)."""
    goal = session.exec(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    new_task = Task(
        user_id=current_user.id,
        goal_id=goal.id,
        title=payload.title,
        description=payload.description,
        source_module="strategy",
        status="todo",
        priority=payload.priority,
        due_date=payload.due_date,
        scheduled_date=payload.due_date or date.today(),
        time_block=payload.time_block,
    )
    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task


@router.get("/goals/{goal_id}/tasks", response_model=List[Task])
def list_tasks_for_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Retrieve all centralized tasks associated with a specific goal (ADR-01)."""
    goal = session.exec(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    tasks = session.exec(
        select(Task).where(Task.goal_id == goal_id, Task.user_id == current_user.id).order_by(Task.created_at.desc())
    ).all()
    return tasks
