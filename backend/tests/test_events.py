# backend/tests/test_events.py
from sqlmodel import Session, select
from app.core.database import engine, init_db
from app.core.events import EventType, emit_event
from app.models.entities import DomainEventAudit, Project, Task, User


def test_event_bus_audits_and_updates_project_progress_atomically():
    init_db()
    with Session(engine) as session:
        # 1. Create an isolated test user for event testing
        user = session.exec(select(User).where(User.email == "events@locked.in")).first()
        if not user:
            user = User(email="events@locked.in", hashed_password="hashed_test_password")
            session.add(user)
            session.commit()
            session.refresh(user)

        # 2. Create a project in the Strategy and Career domain (initial progress 0%)
        project = Project(
            user_id=user.id,
            title="BMS HIL Demonstrator",
            category="Engineering",
            progress_pct=0,
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        # 3. Create 2 tasks in the centralized table linked to this project
        task1 = Task(
            user_id=user.id,
            project_id=project.id,
            title="Design analog pedal ADC filter",
            source_module="project",
            status="done",
        )
        task2 = Task(
            user_id=user.id,
            project_id=project.id,
            title="Connect WebSocket HUD telemetry",
            source_module="agenda",
            status="all",
        )
        session.add(task1)
        session.add(task2)
        session.flush()

        # 4. Emit the TaskCompleted event for the first task within the same transaction
        emit_event(
            session=session,
            user_id=user.id,
            event_type=EventType.TASK_COMPLETED,
            source_module="agenda",
            payload={"task_id": task1.id, "project_id": project.id},
        )
        session.commit()
        session.refresh(project)

        # 5. Verify that the project automatically updated to 50% (1 of 2 tasks completed)
        assert project.progress_pct == 50

        # 6. Verify that the event was recorded in the domain_events_audit log.
        audit_logs = session.exec(
            select(DomainEventAudit).where(
                DomainEventAudit.user_id == user.id,
                DomainEventAudit.event_type == EventType.TASK_COMPLETED,
            )
        ).all()
        assert len(audit_logs) >= 1