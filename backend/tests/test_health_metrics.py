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


def test_workout_with_blocks_and_ai_coach():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a structured workout with 2 blocks and exercises
        payload = {
            "title": "Fuerza Pesada Torso",
            "type": "Strength",
            "duration_minutes": 65,
            "calories_burned": 450,
            "date": date.today().isoformat(),
            "blocks": [
                {
                    "name": "Bloque 1 - Fuerza Principal",
                    "block_order": 1,
                    "exercises": [
                        {
                            "name": "Press Militar",
                            "sets": 4,
                            "reps": 6,
                            "weight": 55.0,
                            "notes": "Muy fluido, rpe 7, listo para subir peso",
                            "order_index": 1,
                        },
                        {
                            "name": "Dominadas Lastradas",
                            "sets": 3,
                            "reps": 6,
                            "weight": 15.0,
                            "notes": "Sentí tirón en codo derecho en la última repe",
                            "order_index": 2,
                        },
                    ],
                },
                {
                    "name": "Bloque 2 - Hipertrofia",
                    "block_order": 2,
                    "exercises": [
                        {
                            "name": "Elevaciones Laterales",
                            "sets": 4,
                            "reps": 12,
                            "weight": 14.0,
                            "notes": "Buen bombeo",
                            "order_index": 1,
                        }
                    ],
                },
            ],
        }

        res = client.post("/api/v1/health-metrics/workouts", json=payload, headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert len(data["blocks"]) == 2
        assert len(data["blocks"][0]["exercises"]) == 2
        assert data["blocks"][0]["exercises"][0]["name"] == "Press Militar"
        assert data["blocks"][0]["exercises"][0]["weight"] == 55.0
        assert "tirón" in data["blocks"][0]["exercises"][1]["notes"]
        workout_id = data["id"]

        # 2. Test AI Coach feedback endpoint
        coach_res = client.post(f"/api/v1/health-metrics/workouts/{workout_id}/ai-coach", headers=headers)
        assert coach_res.status_code == 200
        coach_data = coach_res.json()

        assert "overall_assessment" in coach_data
        assert "coach_verdict" in coach_data
        assert "suggestions" in coach_data
        assert len(coach_data["suggestions"]) > 0

        # Check that AI coach detected overload for Press Militar and fatigue for Dominadas Lastradas
        suggestions_ex = [s["exercise"] for s in coach_data["suggestions"]]
        assert "Press Militar" in suggestions_ex
        assert "Dominadas Lastradas" in suggestions_ex

        # Check suggestions content
        militar_sug = next(s for s in coach_data["suggestions"] if s["exercise"] == "Press Militar")
        assert "Sobrecarga" in militar_sug["action"]

        dominadas_sug = next(s for s in coach_data["suggestions"] if s["exercise"] == "Dominadas Lastradas")
        assert "Descarga" in dominadas_sug["action"] or "Mantener" in dominadas_sug["action"]
