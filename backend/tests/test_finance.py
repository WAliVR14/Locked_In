# backend/tests/test_finance.py
from fastapi.testclient import TestClient
from app.main import app


def test_finance_expense_deducts_balance_and_updates_budget():
    with TestClient(app) as client:
        # 1. Authenticate Demo user
        auth_res = client.post("/api/v1/auth/demo-login")
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create an account with an initial balance of $1,000.00
        acc_res = client.post(
            "/api/v1/finance/accounts",
            json={"name": "Main Debit", "type": "debit", "balance": 1000.0},
            headers=headers,
        )
        assert acc_res.status_code == 201
        acc_id = acc_res.json()["id"]

        # 3. Record a quick expense of $150.50
        tx_res = client.post(
            "/api/v1/finance/transactions",
            json={
                "account_id": acc_id,
                "amount": 150.50,
                "type": "expense",
                "category": "Food",
                "description": "Tacos",
            },
            headers=headers,
        )
        assert tx_res.status_code == 201
        assert tx_res.json()["new_account_balance"] == 849.50

        # 4. Verify that the overview reflects the budget balance and spending.
        overview_res = client.get("/api/v1/finance/overview", headers=headers)
        assert overview_res.status_code == 200
        overview = overview_res.json()
        assert overview["monthly_expenses"] >= 150.50


def test_finance_atomic_transfer_between_accounts():
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}

        acc1 = client.post(
            "/api/v1/finance/accounts",
            json={"name": "Checking", "type": "debit", "balance": 500.0},
            headers=headers,
        ).json()
        acc2 = client.post(
            "/api/v1/finance/accounts",
            json={"name": "GBM Smart Cash", "type": "investment", "balance": 200.0},
            headers=headers,
        ).json()

        transfer_res = client.post(
            "/api/v1/finance/transfers",
            json={
                "from_account_id": acc1["id"],
                "to_account_id": acc2["id"],
                "amount": 200.0,
            },
            headers=headers,
        )
        assert transfer_res.status_code == 201
        data = transfer_res.json()
        assert data["from_account_balance"] == 300.0
        assert data["to_account_balance"] == 400.0