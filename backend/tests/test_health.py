# backend/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import app


def test_health_check_returns_200():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["system"] == "Locked_In Core"


def test_system_summary_protected_and_isolated():
    with TestClient(app) as client:
        # 1. If there is no token, it must return a 401 error.
        unauth = client.get("/api/v1/system/summary")
        assert unauth.status_code == 401

        # 2. With the Demo Mode token, you should return metrics of 0.
        login_res = client.post("/api/v1/auth/demo-login")
        token = login_res.json()["access_token"]

        summary_res = client.get(
            "/api/v1/system/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert summary_res.status_code == 200
        data = summary_res.json()
        assert data["role"] == "demo"
        assert "metrics" in data