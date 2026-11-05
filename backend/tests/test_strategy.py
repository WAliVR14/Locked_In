# backend/tests/test_strategy.py
from fastapi.testclient import TestClient
from app.main import app


def test_strategy_seed_and_list_goals():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Retrieve goals - should auto-seed if empty
        res = client.get("/api/v1/strategy/goals", headers=headers)
        assert res.status_code == 200
        goals = res.json()
        assert len(goals) >= 3

        titles = [g["title"] for g in goals]
        assert any("Inglés" in t for t in titles)
        assert any("FORVIA" in t or "HIL-BERTO" in t for t in titles)
        assert any("MecaPath" in t for t in titles)


def test_strategy_create_goal():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "title": "Maestría en Robótica y Sistemas Embebidos",
            "description": "Especialización en sistemas en tiempo real y visión computacional.",
            "category": "Education",
            "horizon": "long",
            "priority": 3,
            "progress_pct": 10,
            "target_budget": 50000.0,
        }
        create_res = client.post("/api/v1/strategy/goals", json=payload, headers=headers)
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["title"] == payload["title"]
        assert data["category"] == "Education"
        assert data["progress_pct"] == 10
        assert data["status"] == "active"


def test_strategy_update_goal_progress():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create goal
        g = client.post(
            "/api/v1/strategy/goals",
            json={"title": "Certificación AWS Solutions Architect", "category": "Tech", "progress_pct": 20},
            headers=headers,
        ).json()
        goal_id = g["id"]

        # Patch progress to 85%
        patch_res = client.patch(
            f"/api/v1/strategy/goals/{goal_id}/progress",
            json={"progress_pct": 85},
            headers=headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["progress_pct"] == 85
        assert patch_res.json()["status"] == "active"

        # Patch progress to 100% -> should auto-complete
        complete_res = client.patch(
            f"/api/v1/strategy/goals/{goal_id}/progress",
            json={"progress_pct": 100},
            headers=headers,
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["progress_pct"] == 100
        assert complete_res.json()["status"] == "completed"


def test_strategy_link_task_to_goal_adr01():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get existing goal
        goals = client.get("/api/v1/strategy/goals", headers=headers).json()
        assert len(goals) > 0
        target_goal = goals[0]

        # Link new task to goal in centralized tasks table
        task_payload = {
            "title": "Revisar simulador TOEFL Speaking 3",
            "description": "Práctica intensiva de pronunciación y vocabulario técnico.",
            "priority": 3,
            "due_date": "2026-11-10",
            "time_block": "17:00 - 18:30",
        }
        task_res = client.post(
            f"/api/v1/strategy/goals/{target_goal['id']}/tasks",
            json=task_payload,
            headers=headers,
        )
        assert task_res.status_code == 201
        created_task = task_res.json()
        assert created_task["goal_id"] == target_goal["id"]
        assert created_task["source_module"] == "strategy"
        assert created_task["status"] == "todo"

        # Verify listed tasks for this goal
        list_res = client.get(
            f"/api/v1/strategy/goals/{target_goal['id']}/tasks",
            headers=headers,
        )
        assert list_res.status_code == 200
        task_ids = [t["id"] for t in list_res.json()]
        assert created_task["id"] in task_ids

