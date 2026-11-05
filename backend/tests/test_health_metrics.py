# backend/tests/test_health_metrics.py
from datetime import date
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.main import app
from app.core.database import engine
from app.models.entities import DomainEventAudit


def test_health_seed_and_list_workouts():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/health-metrics/workouts", headers=headers)
        assert res.status_code == 200
        workouts = res.json()
        assert len(workouts) >= 3

        titles = [w["title"] for w in workouts]
        assert any("Push-Pull-Legs" in t for t in titles)
        assert any("Carrera 5K" in t for t in titles)
        assert any("Calistenia" in t for t in titles)


def test_health_create_workout_emits_event():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "title": "MMA Sparring & Striking",
            "type": "Cardio",
            "duration_minutes": 50,
            "calories_burned": 480,
            "notes": "Sparring técnico y drills de derribo",
            "date": date.today().isoformat(),
        }
        res = client.post("/api/v1/health-metrics/workouts", json=payload, headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == payload["title"]
        assert data["duration_minutes"] == 50

        # Verify event emission in domain_events_audit table
        with Session(engine) as session:
            events = session.exec(
                select(DomainEventAudit).where(
                    DomainEventAudit.event_type == "WorkoutCompleted"
                )
            ).all()
            assert len(events) > 0
            latest = events[-1]
            assert "MMA Sparring" in latest.payload_json


def test_health_metrics_crud():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. List metrics (auto-seeds defaults)
        list_res = client.get("/api/v1/health-metrics/metrics", headers=headers)
        assert list_res.status_code == 200
        metrics = list_res.json()
        assert len(metrics) >= 2

        types = [m["metric_type"] for m in metrics]
        assert "SleepHours" in types
        assert "Weight" in types

        # 2. Add new biometric metric
        new_metric = {
            "metric_type": "Weight",
            "value": 71.8,
            "unit": "kg",
        }
        create_res = client.post("/api/v1/health-metrics/metrics", json=new_metric, headers=headers)
        assert create_res.status_code == 201
        assert create_res.json()["value"] == 71.8


def test_health_summary():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/health-metrics/summary", headers=headers)
        assert res.status_code == 200
        summary = res.json()
        assert "weekly_minutes" in summary
        assert "weekly_workouts_count" in summary
        assert "avg_sleep_hours" in summary
        assert "latest_weight_kg" in summary
        assert summary["weekly_minutes"] > 0


def test_today_overview_reflects_workout_status():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Ensure at least one workout today
        client.post(
            "/api/v1/health-metrics/workouts",
            json={
                "title": "Hipertrofia Espalda y Bíceps",
                "type": "Strength",
                "duration_minutes": 55,
                "date": date.today().isoformat(),
            },
            headers=headers,
        )

        today_res = client.get("/api/v1/today/overview", headers=headers)
        assert today_res.status_code == 200
        today_data = today_res.json()
        assert "workout_completed_today" in today_data
        assert today_data["workout_completed_today"] is True
