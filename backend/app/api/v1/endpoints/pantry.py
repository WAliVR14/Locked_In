# backend/app/api/v1/endpoints/pantry.py
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel, Field

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.events import emit_event, EventType
from app.models.entities import User, PantryItem, Store, StorePriceLog

router = APIRouter(prefix="/api/v1/pantry", tags=["Pantry & Home"])


# --- DTOs (Data Transfer Objects) for input validation ---
class StoreCreate(BaseModel):
    name: str
    location_note: Optional[str] = None


class PantryItemCreate(BaseModel):
    name: str
    category: str = "Food"
    current_qty: float = Field(default=0.0, ge=0)
    min_qty: float = Field(default=1.0, ge=0)
    unit: str = "pz"


class GroceryPurchaseRequest(BaseModel):
    pantry_item_id: int
    store_id: int
    brand: Optional[str] = None
    presentation_qty: float = Field(gt=0, description="Quantity in the packaging (e.g., 1.5 for 1.5L)")
    presentation_unit: str = "pz"
    price_paid: float = Field(gt=0, description="Total price paid for this submission")
    
    # Data for integration with Finance (Optional if you only want to record the price without processing a payment)
    account_id: Optional[int] = None


# --- Endpoints ---

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
        unit=payload.unit
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


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
    # 1. Verify that the product and the store exist and belong to the user
    item = session.exec(select(PantryItem).where(PantryItem.id == payload.pantry_item_id, PantryItem.user_id == current_user.id)).first()
    store = session.exec(select(Store).where(Store.id == payload.store_id, Store.user_id == current_user.id)).first()

    if not item or not store:
        raise HTTPException(status_code=404, detail="Pantry item or Store not found")

    # 2. Price normalization (Ej., paid $42 for 1.5L -> $28 per L)
    normalized_price = round(payload.price_paid / payload.presentation_qty, 2)

    # 3. Save the historical price record
    price_log = StorePriceLog(
        user_id=current_user.id,
        pantry_item_id=item.id,
        store_id=store.id,
        brand=payload.brand,
        presentation_qty=payload.presentation_qty,
        presentation_unit=payload.presentation_unit,
        price_paid=payload.price_paid,
        unit_price_normalized=normalized_price,
        observed_at=date.today()
    )
    session.add(price_log)

    # 4. Update the physical inventory on hand (add the quantity purchased)
    item.current_qty = round(item.current_qty + payload.presentation_qty, 2)
    # We also update the estimated price to the most current one for future quotes.
    item.estimated_price = normalized_price 
    session.add(item)

    # 5. Emit the domain event. Finance will be listening for this in order to deduct the balance.
    # We use session.flush() to ensure that price_log has an ID assigned.
    session.flush()
    
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
            "account_id": payload.account_id
        }
    )

    # 6. Commit of the entire ACID transaction
    session.commit()
    session.refresh(item)

    return {
        "message": "Purchase registered successfully",
        "normalized_unit_price": normalized_price,
        "new_stock": item.current_qty
    }