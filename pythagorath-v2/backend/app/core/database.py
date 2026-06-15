"""Database engine, session factory, and the single declarative Base.

Foreign keys are the backbone of the unified data model (one table per entity,
every link a real ForeignKey). SQLite does NOT enforce foreign keys unless they
are switched on per-connection, so we enable them here for every connection.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(settings.database_url, connect_args=_connect_args)


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce foreign-key constraints on every SQLite connection."""
    if _is_sqlite:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Single declarative Base shared by all models — one source of truth.
Base = declarative_base()
