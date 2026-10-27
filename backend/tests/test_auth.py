# backend/tests/test_auth.py
from fastapi.testclient import TestClient
from app.main import app

def test_unauthorized_access_blocked():
    """Verify that a protected route re-caches requests that lack a token."""
    with TestClient(app) as client:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

def test_demo_login_flow():
    """Verify that the demo user can log in and retrieve their profile."""
    with TestClient(app) as client:
        # 1. Request a demo mode token
        res = client.post("/api/v1/auth/demo-login")
        assert res.status_code == 200
        token = res.json()["access_token"]

        # 2. Retrieve profile using the JWT token
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["role"] == "demo"