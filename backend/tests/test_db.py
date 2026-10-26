# backend/tests/test_db.py
from sqlmodel import Session, SQLModel, create_engine
from app.models.entities import User, Account

def test_create_user_and_account_in_memory():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(email="test@Locked.In", hashed_password="123", role="admin")
        session.add(user)
        session.commit()
        session.refresh(user)

        account = Account(user_id=user.id, name="Main Account", balance=1500.50)
        session.add(account)
        session.commit()
        session.refresh(account)

        assert user.id is not None
        assert account.balance == 1500.50