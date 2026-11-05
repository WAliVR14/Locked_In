# backend/tests/test_pantry.py
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import app
from app.core.database import engine
from app.models.entities import Account, StorePriceLog, Task, Transaction


def test_pantry_store_creation():
    """Verify store creation endpoint."""
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200
        headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}

        store_res = client.post(
            "/api/v1/pantry/stores",
            json={"name": "Bodega Aurrera Express", "location_note": "Sucursal Centro"},
            headers=headers,
        )
        assert store_res.status_code == 201
        data = store_res.json()
        assert data["name"] == "Bodega Aurrera Express"
        assert data["location_note"] == "Sucursal Centro"
        assert data["id"] is not None


def test_pantry_item_creation_with_dates():
    """Verify pantry item creation with estimated price and expiration date."""
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}

        exp_date = (date.today() + timedelta(days=3)).isoformat()
        item_res = client.post(
            "/api/v1/pantry/items",
            json={
                "name": "Yogurt Griego",
                "category": "Lácteos",
                "current_qty": 2.0,
                "min_qty": 1.0,
                "unit": "pz",
                "estimated_price": 45.50,
                "expiration_date": exp_date,
            },
            headers=headers,
        )
        assert item_res.status_code == 201
        item = item_res.json()
        assert item["name"] == "Yogurt Griego"
        assert item["estimated_price"] == 45.50
        assert item["expiration_date"] == exp_date


def test_home_obligation_creates_centralized_task():
    """
    Verify that creating a HomeObligation with next_due_date
    automatically creates a task in the centralized 'tasks' table.
    """
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}

        due_date = (date.today() + timedelta(days=5)).isoformat()
        ob_res = client.post(
            "/api/v1/pantry/home-obligations",
            json={
                "name": "Servicio de Calentador Solar",
                "category": "appliance",
                "estimated_cost": 650.0,
                "next_due_date": due_date,
                "frequency_days": 180,
                "notes": "Llamar al técnico autorizado",
            },
            headers=headers,
        )
        assert ob_res.status_code == 201
        ob_data = ob_res.json()
        ob_id = ob_data["id"]

        # Verify that the task was automatically generated in tasks table
        with Session(engine) as session:
            task = session.exec(
                select(Task).where(Task.home_obligation_id == ob_id)
            ).first()
            assert task is not None
            assert task.title == "Servicio de Calentador Solar"
            assert task.source_module == "home"
            assert str(task.due_date) == due_date
            assert task.status == "todo"


def test_grocery_purchase_price_normalization_stock_and_finance_event():
    """
    Verify complete ERP grocery purchase workflow:
    1. Unit price normalization: 42.0 / 1.5 = 28.0
    2. Physical stock increment
    3. Price log recording
    4. Synchronous Event Bus balance deduction in Finance
    """
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}

        # 1. Setup Store
        store_res = client.post(
            "/api/v1/pantry/stores",
            json={"name": "Walmart Supercenter"},
            headers=headers,
        )
        store_id = store_res.json()["id"]

        # 2. Setup Pantry Item (Initial stock: 0.5)
        item_res = client.post(
            "/api/v1/pantry/items",
            json={
                "name": "Detergente Líquido",
                "category": "Limpieza",
                "current_qty": 0.5,
                "min_qty": 2.0,
                "unit": "L",
            },
            headers=headers,
        )
        item_id = item_res.json()["id"]

        # 3. Setup Finance Account with initial balance: $500.00
        acc_res = client.post(
            "/api/v1/finance/accounts",
            json={"name": "Nómina Santander", "type": "debit", "balance": 500.0},
            headers=headers,
        )
        acc_id = acc_res.json()["id"]

        # 4. Perform Grocery Purchase (Presentation: 1.5 L, Price Paid: $42.0)
        purchase_res = client.post(
            "/api/v1/pantry/purchase",
            json={
                "pantry_item_id": item_id,
                "store_id": store_id,
                "brand": "Ariel",
                "presentation_qty": 1.5,
                "presentation_unit": "L",
                "price_paid": 42.0,
                "account_id": acc_id,
            },
            headers=headers,
        )
        assert purchase_res.status_code == 200
        purchase_data = purchase_res.json()

        # Check unit price normalization: 42.0 / 1.5 = 28.0
        assert purchase_data["normalized_unit_price"] == 28.0
        # Check stock update: 0.5 + 1.5 = 2.0
        assert purchase_data["new_stock"] == 2.0

        # 5. Check Finance integration via Event Bus
        # Account balance must be 500.0 - 42.0 = 458.0
        with Session(engine) as session:
            account = session.exec(select(Account).where(Account.id == acc_id)).first()
            assert account is not None
            assert account.balance == 458.0

            # Verify general ledger transaction
            tx = session.exec(
                select(Transaction).where(
                    Transaction.account_id == acc_id,
                    Transaction.type == "expense",
                    Transaction.category == "Supermercado",
                )
            ).first()
            assert tx is not None
            assert tx.amount == 42.0
            assert "Compra: Detergente Líquido" in tx.description

            # Verify StorePriceLog
            price_log = session.exec(
                select(StorePriceLog).where(
                    StorePriceLog.pantry_item_id == item_id,
                    StorePriceLog.store_id == store_id,
                )
            ).first()
            assert price_log is not None
            assert price_log.unit_price_normalized == 28.0


def test_pantry_overview_aggregations():
    """Verify GET /api/v1/pantry/overview returns all aggregates correctly."""
    with TestClient(app) as client:
        auth_res = client.post("/api/v1/auth/demo-login")
        headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}

        overview_res = client.get("/api/v1/pantry/overview", headers=headers)
        assert overview_res.status_code == 200
        data = overview_res.json()

        assert "stores" in data
        assert "inventory" in data
        assert "shopping_list" in data
        assert "price_comparison" in data
        assert "home_obligations" in data

        # Check inventory items have alert properties
        if data["inventory"]:
            first = data["inventory"][0]
            assert "is_low_stock" in first
            assert "is_expiring_soon" in first
            assert "days_until_expiration" in first
