# backend/tests/test_insights.py
from fastapi.testclient import TestClient
from app.main import app


def test_insights_dashboard_aggregation():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/insights/dashboard", headers=headers)
        assert res.status_code == 200
        data = res.json()

        # Check required sections
        assert "finance" in data
        assert "tasks" in data
        assert "habits" in data
        assert "bio_gym" in data
        assert "generated_at" in data

        # Check finance fields
        assert "month_income" in data["finance"]
        assert "month_expenses" in data["finance"]
        assert "daily_burn_rate" in data["finance"]
        assert "savings_rate_pct" in data["finance"]
        assert "net_worth_liquid" in data["finance"]

        # Check tasks fields
        assert "total_tasks" in data["tasks"]
        assert "completed_tasks" in data["tasks"]
        assert "completion_rate_pct" in data["tasks"]

        # Check habits fields
        assert "total_habits" in data["habits"]
        assert "max_streak" in data["habits"]

        # Check bio_gym fields
        assert "weekly_sessions" in data["bio_gym"]
        assert "weekly_minutes" in data["bio_gym"]
        assert "avg_sleep_hours" in data["bio_gym"]
        assert "latest_weight_kg" in data["bio_gym"]

