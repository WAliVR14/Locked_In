# backend/tests/test_today.py
from datetime import date
from fastapi.testclient import TestClient
from app.main import app


def test_today_overview_aggregation():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/today/overview", headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert "date" in data
        assert "tasks_today" in data
        assert "summary_counts" in data
        assert "habits" in data
        assert "financial_summary" in data
        assert "pantry_alerts" in data

        fin = data["financial_summary"]
        assert "safe_to_spend_daily" in fin
        assert "net_liquidity" in fin
        assert "total_balance" in fin
        assert fin["safe_to_spend_daily"] >= 0.0

        habits = data["habits"]
        assert len(habits) >= 3


def test_today_create_and_toggle_task():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a task for today
        create_res = client.post(
            "/api/v1/today/tasks",
            json={
                "title": "Calibrar sensor de temperatura HIL",
                "description": "Verificar lectura con termopar y registrar en bitácora.",
                "priority": 3,
                "time_block": "09:00 - 10:30",
            },
            headers=headers,
        )
        assert create_res.status_code == 201
        task = create_res.json()
        task_id = task["id"]
        assert task["source_module"] == "agenda"
        assert task["status"] == "todo"

        # 2. Toggle to completed
        toggle_res = client.patch(f"/api/v1/today/tasks/{task_id}/toggle", headers=headers)
        assert toggle_res.status_code == 200
        toggled = toggle_res.json()
        assert toggled["status"] == "completed"
        assert toggled["completed_at"] is not None

        # 3. Toggle back to todo
        untoggle_res = client.patch(f"/api/v1/today/tasks/{task_id}/toggle", headers=headers)
        assert untoggle_res.status_code == 200
        untoggled = untoggle_res.json()
        assert untoggled["status"] == "todo"
        assert untoggled["completed_at"] is None


def test_today_habit_check_streak():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create a fresh habit to test check logic
        create_res = client.post(
            "/api/v1/today/habits",
            json={"name": "Hidratación 3L", "frequency": "daily"},
            headers=headers,
        )
        assert create_res.status_code == 201
        habit = create_res.json()
        assert habit["current_streak"] == 0

        # Check habit for today -> streak becomes 1
        check_res = client.post(f"/api/v1/today/habits/{habit['id']}/check", headers=headers)
        assert check_res.status_code == 200
        updated = check_res.json()
        assert updated["current_streak"] == 1
        assert updated["last_completed_date"] == date.today().isoformat()

        # Toggle back -> streak becomes 0
        uncheck_res = client.post(f"/api/v1/today/habits/{habit['id']}/check", headers=headers)
        assert uncheck_res.status_code == 200
        assert uncheck_res.json()["current_streak"] == 0
