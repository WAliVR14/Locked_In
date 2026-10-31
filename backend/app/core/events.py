# backend/app/core/events.py
import json
from typing import Any, Callable, Dict, List
from sqlmodel import Session, select
from app.models.entities import DomainEventAudit, Project, Task


class EventType:
    """Standardized catalog of Locked_In domain events."""
    EXPENSE_CREATED = "ExpenseCreated"
    INCOME_REGISTERED = "IncomeRegistered"
    GROCERY_PURCHASE_COMPLETED = "GroceryPurchaseCompleted"
    PANTRY_ITEM_LOW_STOCK = "PantryItemLowStock"
    WORKOUT_COMPLETED = "WorkoutCompleted"
    BIOMETRIC_SYNC_RECEIVED = "BiometricSyncReceived"
    TASK_COMPLETED = "TaskCompleted"
    GOAL_PROGRESS_UPDATED = "GoalProgressUpdated"


# Type for subscriber functions: they receive (session, user_id, payload_dict)
EventHandler = Callable[[Session, int, Dict[str, Any]], None]

# In-memory dictionary that maps each EventType to its list of subscriber functions
_subscribers: Dict[str, List[EventHandler]] = {}


def subscribe(event_type: str, handler: EventHandler) -> None:
    """Registers a handler function to listen for a specific type of event."""
    if event_type not in _subscribers:
        _subscribers[event_type] = []
    if handler not in _subscribers[event_type]:
        _subscribers[event_type].append(handler)


def emit_event(
    session: Session,
    user_id: int,
    event_type: str,
    source_module: str,
    payload: Dict[str, Any],
) -> DomainEventAudit:
    """
    Publish a domain event within the current transaction (Unit of Work).
    1. Logs the event to the 'domain_events_audit' audit table.
    2. Executes all subscribers synchronously, passing the same SQL session.
    Note: It does not execute session.commit() on its own, in order to respect the caller's atomicity.
    """
    audit_entry = DomainEventAudit(
        user_id=user_id,
        event_type=event_type,
        source_module=source_module,
        payload_json=json.dumps(payload, default=str),
    )
    session.add(audit_entry)

    handlers = _subscribers.get(event_type, [])
    for handler in handlers:
        handler(session, user_id, payload)

    return audit_entry


# =====================================================================
# BUILT-IN CROSS-MODULE SUBSCRIBERS (DOMAIN HANDLERS)
# =====================================================================
def _recalculate_project_progress_on_task_completed(
    session: Session, user_id: int, payload: Dict[str, Any]
) -> None:
    """
    When a task in the Agenda or Kanban that belongs to a Project is completed,
    automatically recalculates the project's progress percentage (progress_pct).
    """
    project_id = payload.get("project_id")
    if not project_id:
        return

    project = session.exec(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    ).first()
    if not project:
        return

    project_tasks = session.exec(
        select(Task).where(Task.project_id == project_id, Task.user_id == user_id)
    ).all()

    if project_tasks:
        done_count = sum(1 for t in project_tasks if t.status == "done")
        project.progress_pct = round((done_count / len(project_tasks)) * 100)
        session.add(project)


# We register the subscriber automatically when the module loads.
subscribe(EventType.TASK_COMPLETED, _recalculate_project_progress_on_task_completed)