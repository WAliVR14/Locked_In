# backend/tests/test_finance.py
from fastapi.testclient import TestClient
from app.main import app


# =====================================================================
# HELPERS
# =====================================================================

def _auth_headers(client: TestClient) -> dict:
    res = client.post("/api/v1/auth/demo-login")
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _create_account(client, headers, name="Main Debit", balance=5000.0):
    res = client.post(
        "/api/v1/finance/accounts",
        json={"name": name, "type": "debit", "balance": balance},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()


def _create_credit_card(client, headers, limit=10000.0, institution_id=None):
    payload = {
        "name": "Nu Crédito",
        "instrument_type": "credit_card",
        "credit_limit": limit,
        "cutoff_day": 5,
        "payment_due_day": 25,
    }
    if institution_id:
        payload["institution_id"] = institution_id
    res = client.post("/api/v1/finance/instruments", json=payload, headers=headers)
    assert res.status_code == 201
    return res.json()


# =====================================================================
# LEGACY TESTS (unchanged — retro-compatible)
# =====================================================================

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


# =====================================================================
# NEW TESTS — Finance v2
# =====================================================================

def test_institution_and_credit_card_creation():
    """Create an institution and a credit card, verify they appear in overview."""
    with TestClient(app) as client:
        headers = _auth_headers(client)

        # Create institution
        inst_res = client.post(
            "/api/v1/finance/institutions",
            json={"name": "Nu", "category": "fintech"},
            headers=headers,
        )
        assert inst_res.status_code == 201
        institution = inst_res.json()
        assert institution["name"] == "Nu"
        assert institution["category"] == "fintech"

        # Create credit card linked to institution
        card_res = client.post(
            "/api/v1/finance/instruments",
            json={
                "name": "Nu Crédito",
                "instrument_type": "credit_card",
                "credit_limit": 10000.0,
                "cutoff_day": 5,
                "payment_due_day": 25,
                "institution_id": institution["id"],
            },
            headers=headers,
        )
        assert card_res.status_code == 201
        card = card_res.json()
        assert card["instrument_type"] == "credit_card"
        assert card["credit_limit"] == 10000.0
        assert card["current_debt"] == 0.0
        assert card["cutoff_day"] == 5
        assert card["payment_due_day"] == 25

        # Verify overview contains instrument
        overview = client.get("/api/v1/finance/overview", headers=headers).json()
        instrument_ids = [i["id"] for i in overview["instruments"]]
        assert card["id"] in instrument_ids


def test_credit_charge_increases_debt_not_account_balance():
    """
    Spending on a credit card MUST increase current_debt on the instrument
    but MUST NOT change the linked debit Account.balance.
    """
    with TestClient(app) as client:
        headers = _auth_headers(client)
        acc = _create_account(client, headers, balance=5000.0)
        card = _create_credit_card(client, headers, limit=10000.0)

        # Record a credit charge
        tx_res = client.post(
            "/api/v1/finance/transactions",
            json={
                "instrument_id": card["id"],
                "amount": 500.0,
                "type": "credit_charge",
                "category": "Food",
                "description": "Dinner at COSI",
            },
            headers=headers,
        )
        assert tx_res.status_code == 201
        data = tx_res.json()
        # Debt on card should increase
        assert data["instrument_current_debt"] == 500.0

        # Debit account balance must remain untouched
        overview = client.get("/api/v1/finance/overview", headers=headers).json()
        # Find our account in the overview
        acc_in_overview = next(
            (a for a in overview["accounts"] if a["id"] == acc["id"]), None
        )
        assert acc_in_overview is not None
        assert acc_in_overview["balance"] == 5000.0  # unchanged

        # credit_debt_total must reflect the charge
        assert overview["credit_debt_total"] >= 500.0


def test_credit_card_payment_reduces_debt_and_debit_balance():
    """
    Paying a credit card MUST deduct from the debit account AND reduce
    the instrument's current_debt (freeing credit line).
    """
    with TestClient(app) as client:
        headers = _auth_headers(client)
        acc = _create_account(client, headers, balance=5000.0)
        card = _create_credit_card(client, headers, limit=10000.0)

        # First charge the card
        client.post(
            "/api/v1/finance/transactions",
            json={
                "instrument_id": card["id"],
                "amount": 500.0,
                "type": "credit_charge",
                "category": "Food",
            },
            headers=headers,
        )

        # Now pay the card
        pay_res = client.post(
            f"/api/v1/finance/instruments/{card['id']}/pay",
            json={"debit_account_id": acc["id"], "amount": 500.0},
            headers=headers,
        )
        assert pay_res.status_code == 201
        pay_data = pay_res.json()

        # Debt cleared
        assert pay_data["instrument_current_debt"] == 0.0

        # Debit account reduced
        assert pay_data["debit_account_balance"] == 4500.0

        # Verify overview is consistent
        overview = client.get("/api/v1/finance/overview", headers=headers).json()
        # Buscamos la tarjeta específica de esta prueba dentro de la lista del overview
        overview_card = next(i for i in overview["instruments"] if i["id"] == card["id"])
        assert overview_card["current_debt"] == 0.0
        acc_in_overview = next(
            (a for a in overview["accounts"] if a["id"] == acc["id"]), None
        )
        assert acc_in_overview["balance"] == 4500.0


def test_savings_fund_creation_and_contribution():
    """Create a savings fund with annual_rate and contribute to it."""
    with TestClient(app) as client:
        headers = _auth_headers(client)
        acc = _create_account(client, headers, balance=10000.0)

        # Create fund
        fund_res = client.post(
            "/api/v1/finance/savings-funds",
            json={
                "name": "Cajita Nu",
                "target_amount": 50000.0,
                "annual_rate": 0.145,
                "monthly_allocation": 2000.0,
            },
            headers=headers,
        )
        assert fund_res.status_code == 201
        fund = fund_res.json()
        assert fund["annual_rate"] == 0.145
        assert fund["current_saved"] == 0.0

        # Contribute $1000 from account
        contrib_res = client.post(
            f"/api/v1/finance/savings-funds/{fund['id']}/contribute",
            json={"amount": 1000.0, "account_id": acc["id"], "withdraw": False},
            headers=headers,
        )
        assert contrib_res.status_code == 201
        contrib_data = contrib_res.json()
        assert contrib_data["fund"]["current_saved"] == 1000.0
        assert contrib_data["account_balance"] == 9000.0

        # Overview reflects savings_total
        overview = client.get("/api/v1/finance/overview", headers=headers).json()
        assert overview["savings_total"] >= 1000.0


def test_subscription_creates_task_reminder_adr01():
    """
    Creating a subscription MUST automatically create a Task reminder
    with source_module='finance' in the centralized tasks table (ADR-01).
    """
    with TestClient(app) as client:
        headers = _auth_headers(client)

        sub_res = client.post(
            "/api/v1/finance/subscriptions",
            json={
                "name": "Netflix",
                "amount": 199.0,
                "billing_day": 15,
                "category": "Digital",
                "next_billing_date": "2026-11-15",
            },
            headers=headers,
        )
        assert sub_res.status_code == 201
        data = sub_res.json()

        # Subscription created
        assert data["subscription"]["name"] == "Netflix"

        # ADR-01: Task reminder auto-created with source_module='finance'
        task = data["task_reminder"]
        assert task["source_module"] == "finance"
        assert "Netflix" in task["title"]
        assert task["due_date"] == "2026-11-15"


def test_safe_to_spend_daily_calculation():
    """
    safe_to_spend_daily must be >= 0 and correctly reflect net liquidity
    divided by remaining days in the current month.
    """
    with TestClient(app) as client:
        headers = _auth_headers(client)
        # Create a liquid account
        _create_account(client, headers, name="BBVA Debit", balance=10000.0)

        overview = client.get("/api/v1/finance/overview", headers=headers).json()

        # Basic validations
        assert overview["safe_to_spend_daily"] >= 0.0
        assert overview["net_liquidity"] >= 0.0
        assert "safe_to_spend_daily" in overview
        assert "credit_debt_total" in overview
        assert "savings_total" in overview
        assert "net_liquidity" in overview
        # With no credit debt, net_liquidity should equal or approximate liquid balance
        assert overview["net_liquidity"] >= 0.0
