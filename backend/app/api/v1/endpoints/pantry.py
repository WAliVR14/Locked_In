# backend/app/api/v1/endpoints/pantry.py
from datetime import date
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel, Field

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.events import emit_event, EventType
from app.models.entities import User, PantryItem, Store, StorePriceLog, HomeObligation, Task

router = APIRouter(prefix="/api/v1/pantry", tags=["Pantry & Home"])


# --- DTOs (Data Transfer Objects) for input validation ---
class StoreCreate(BaseModel):
    name: str
    location_note: Optional[str] = None


class PantryItemCreate(BaseModel):
    name: str
    category: str = "Alimentos"
    current_qty: float = Field(default=0.0, ge=0)
    min_qty: float = Field(default=1.0, ge=0)
    unit: str = "pz"
    estimated_price: float = Field(default=0.0, ge=0)
    expiration_date: Optional[date] = None


class HomeObligationCreate(BaseModel):
    name: str
    category: str = "service"  # service, cleaning, appliance, repair
    estimated_cost: float = Field(default=0.0, ge=0)
    next_due_date: Optional[date] = None
    frequency_days: Optional[int] = None
    notes: Optional[str] = None


class GroceryPurchaseRequest(BaseModel):
    pantry_item_id: int
    store_id: int
    brand: Optional[str] = None
    presentation_qty: float = Field(gt=0, description="Quantity in the packaging (e.g., 1.5 for 1.5L)")
    presentation_unit: str = "pz"
    price_paid: float = Field(gt=0, description="Total price paid for this submission")
    # Data for integration with Finance (Optional if recording price without balance deduction)
    account_id: Optional[int] = None


# --- Endpoints ---

@router.get("/overview", status_code=status.HTTP_200_OK)
def get_pantry_overview(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Consolidated view of the Pantry & Home module:
    a) stores: Registered stores.
    b) inventory: Items with low-stock alerts and expiration alerts (<= 5 days).
    c) shopping_list: Items needing replenishment with historical cheapest store.
    d) price_comparison: Per-product comparison across stores.
    e) home_obligations: Domestic maintenance and recurring obligations.
    """
    today = date.today()

    # 1. Registered stores
    stores = session.exec(
        select(Store).where(Store.user_id == current_user.id)
    ).all()
    store_map: Dict[int, str] = {s.id: s.name for s in stores if s.id is not None}

    # 2. Inventory with alert decorations
    items = session.exec(
        select(PantryItem).where(PantryItem.user_id == current_user.id)
    ).all()

    inventory: List[Dict[str, Any]] = []
    shopping_list: List[Dict[str, Any]] = []

    # Pre-fetch price logs for all items owned by current_user
    all_logs = session.exec(
        select(StorePriceLog)
        .where(StorePriceLog.user_id == current_user.id)
        .order_by(StorePriceLog.observed_at.desc())
    ).all()

    logs_by_item: Dict[int, List[StorePriceLog]] = {}
    for log in all_logs:
        logs_by_item.setdefault(log.pantry_item_id, []).append(log)

    for item in items:
        assert item.id is not None
        is_low_stock = item.current_qty <= item.min_qty
        is_expiring_soon = False
        days_until_expiration: Optional[int] = None

        if item.expiration_date:
            days_until_expiration = (item.expiration_date - today).days
            if days_until_expiration <= 5:
                is_expiring_soon = True

        item_dict = {
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "brand": item.brand,
            "current_qty": item.current_qty,
            "min_qty": item.min_qty,
            "unit": item.unit,
            "estimated_price": item.estimated_price,
            "expiration_date": item.expiration_date,
            "preferred_store_id": item.preferred_store_id,
            "is_low_stock": is_low_stock,
            "is_expiring_soon": is_expiring_soon,
            "days_until_expiration": days_until_expiration,
        }
        inventory.append(item_dict)

        # Build shopping list entry if stock is low
        if is_low_stock:
            item_logs = logs_by_item.get(item.id, [])
            cheapest_store_info = None
            if item_logs:
                # Find log with the minimum unit_price_normalized
                cheapest_log = min(item_logs, key=lambda log_entry: log_entry.unit_price_normalized)
                cheapest_store_info = {
                    "store_id": cheapest_log.store_id,
                    "store_name": store_map.get(cheapest_log.store_id, "Desconocido"),
                    "lowest_unit_price": cheapest_log.unit_price_normalized,
                    "last_observed": cheapest_log.observed_at,
                }
                effective_price = cheapest_log.unit_price_normalized
            else:
                effective_price = item.estimated_price

            needed_qty = round(max(item.min_qty - item.current_qty, 1.0), 2)
            shopping_list.append({
                "pantry_item_id": item.id,
                "name": item.name,
                "category": item.category,
                "current_qty": item.current_qty,
                "min_qty": item.min_qty,
                "suggested_qty": needed_qty,
                "unit": item.unit,
                "estimated_price": effective_price,
                "estimated_subtotal": round(needed_qty * effective_price, 2),
                "cheapest_store": cheapest_store_info,
            })

    # 3. Price comparison matrix per product across stores
    price_comparison: List[Dict[str, Any]] = []
    for item in items:
        assert item.id is not None
        item_logs = logs_by_item.get(item.id, [])
        if not item_logs:
            continue

        # Group by store_id taking the most recent observation for each store
        store_observations: Dict[int, StorePriceLog] = {}
        for log in item_logs:
            if log.store_id not in store_observations:
                store_observations[log.store_id] = log

        store_entries = []
        min_unit_price = float("inf")
        cheapest_store_name = None

        for s_id, s_log in store_observations.items():
            store_name = store_map.get(s_id, "Desconocido")
            store_entries.append({
                "store_id": s_id,
                "store_name": store_name,
                "brand": s_log.brand,
                "presentation": f"{s_log.presentation_qty} {s_log.presentation_unit}",
                "presentation_qty": s_log.presentation_qty,
                "presentation_unit": s_log.presentation_unit,
                "price_paid": s_log.price_paid,
                "unit_price_normalized": s_log.unit_price_normalized,
                "observed_at": s_log.observed_at,
            })
            if s_log.unit_price_normalized < min_unit_price:
                min_unit_price = s_log.unit_price_normalized
                cheapest_store_name = store_name

        price_comparison.append({
            "pantry_item_id": item.id,
            "item_name": item.name,
            "unit": item.unit,
            "stores": store_entries,
            "cheapest_store_name": cheapest_store_name,
            "min_normalized_price": min_unit_price if min_unit_price != float("inf") else 0.0,
        })

    # 4. Home obligations
    home_obligations = session.exec(
        select(HomeObligation).where(HomeObligation.user_id == current_user.id)
    ).all()

    return {
        "stores": stores,
        "inventory": inventory,
        "shopping_list": shopping_list,
        "price_comparison": price_comparison,
        "home_obligations": home_obligations,
    }


@router.post("/stores", status_code=status.HTTP_201_CREATED)
def create_store(
    payload: StoreCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Register a new establishment (e.g., Walmart, local market)."""
    store = Store(user_id=current_user.id, name=payload.name, location_note=payload.location_note)
    session.add(store)
    session.commit()
    session.refresh(store)
    return store


@router.post("/items", status_code=status.HTTP_201_CREATED)
def create_pantry_item(
    payload: PantryItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Register a new product to track in the inventory."""
    item = PantryItem(
        user_id=current_user.id,
        name=payload.name,
        category=payload.category,
        current_qty=payload.current_qty,
        min_qty=payload.min_qty,
        unit=payload.unit,
        estimated_price=payload.estimated_price,
        expiration_date=payload.expiration_date,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.post("/home-obligations", status_code=status.HTTP_201_CREATED)
def create_home_obligation(
    payload: HomeObligationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Register a household obligation (maintenance, utility bills, cleaning).
    If a next_due_date is provided, automatically create a corresponding Task
    in the centralized 'tasks' table with source_module='home'.
    """
    obligation = HomeObligation(
        user_id=current_user.id,
        name=payload.name,
        category=payload.category,
        estimated_cost=payload.estimated_cost,
        next_due_date=payload.next_due_date,
        frequency_days=payload.frequency_days,
        notes=payload.notes,
    )
    session.add(obligation)
    session.flush()

    # Automatically create the centralized task if next_due_date is set
    if payload.next_due_date:
        task = Task(
            user_id=current_user.id,
            title=payload.name,
            description=payload.notes or f"Hogar: {payload.category}",
            source_module="home",
            status="todo",
            priority=2,
            due_date=payload.next_due_date,
            scheduled_date=payload.next_due_date,
            home_obligation_id=obligation.id,
        )
        session.add(task)

    session.commit()
    session.refresh(obligation)
    return obligation


@router.post("/purchase", status_code=status.HTTP_200_OK)
def register_purchase(
    payload: GroceryPurchaseRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Core ERP operation for supplies:
    1. Calculate the normalized unit price.
    2. Stores the price history by store (StorePriceLog).
    3. Increase the physical inventory at home.
    4. Emit an event so that Finance deducts the money from the specified account.
    """
    item = session.exec(
        select(PantryItem).where(
            PantryItem.id == payload.pantry_item_id,
            PantryItem.user_id == current_user.id,
        )
    ).first()
    store = session.exec(
        select(Store).where(
            Store.id == payload.store_id,
            Store.user_id == current_user.id,
        )
    ).first()

    if not item or not store:
        raise HTTPException(status_code=404, detail="Pantry item or Store not found")

    # 1. Price normalization (e.g., paid $42 for 1.5L -> $28 per L)
    normalized_price = round(payload.price_paid / payload.presentation_qty, 2)

    # 2. Save the historical price record
    price_log = StorePriceLog(
        user_id=current_user.id,
        pantry_item_id=item.id,
        store_id=store.id,
        brand=payload.brand,
        presentation_qty=payload.presentation_qty,
        presentation_unit=payload.presentation_unit,
        price_paid=payload.price_paid,
        unit_price_normalized=normalized_price,
        observed_at=date.today(),
    )
    session.add(price_log)

    # 3. Update physical inventory on hand (add the quantity purchased)
    item.current_qty = round(item.current_qty + payload.presentation_qty, 2)
    # Update the estimated price to the most current normalized unit price
    item.estimated_price = normalized_price
    session.add(item)

    # 4. Flush to ensure records have assigned IDs before emitting domain event
    session.flush()

    # 5. Emit the domain event. Finance listener handles balance deduction.
    emit_event(
        session=session,
        user_id=current_user.id,
        event_type=EventType.GROCERY_PURCHASE_COMPLETED,
        source_module="pantry",
        payload={
            "pantry_item_id": item.id,
            "item_name": item.name,
            "store_id": store.id,
            "cost": payload.price_paid,
            "account_id": payload.account_id,
        },
    )

    # 6. Commit the entire ACID transaction
    session.commit()
    session.refresh(item)

    return {
        "message": "Purchase registered successfully",
        "normalized_unit_price": normalized_price,
        "new_stock": item.current_qty,
    }
