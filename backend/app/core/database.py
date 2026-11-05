# backend/app/core/database.py
import os
from sqlalchemy import event, text
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

db_url = settings.db_url
is_sqlite = db_url.startswith("sqlite")

# Ensure directory exists for persistent SQLite files (e.g. Render /var/data/locked_in.db)
if is_sqlite and ":///" in db_url:
    path_part = db_url.split(":///", 1)[1]
    dir_name = os.path.dirname(path_part)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)

connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(db_url, connect_args=connect_args)

# If we use local SQLite, we enable WAL mode (concurrency) and strict foreign keys.
if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


def init_db():
    SQLModel.metadata.create_all(engine)
    if is_sqlite:
        # Safe schema synchronization for SQLite
        with engine.begin() as conn:
            # Check goals table columns
            goal_cols = [
                row[1] for row in conn.execute(text("PRAGMA table_info(goals);")).fetchall()
            ]
            if "category" not in goal_cols and len(goal_cols) > 0:
                conn.execute(text("ALTER TABLE goals ADD COLUMN category VARCHAR DEFAULT 'Career';"))
            if "target_date" not in goal_cols and len(goal_cols) > 0:
                conn.execute(text("ALTER TABLE goals ADD COLUMN target_date DATE;"))


def get_session():
    with Session(engine) as session:
        yield session
