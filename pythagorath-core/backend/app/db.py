"""Database core: engine, session, Base — dialect-aware and host-portable.

Schema is managed by Alembic migrations (not create_all), so dev and production
share one versioned source of truth. The engine is built from ``DATABASE_URL``:
SQLite for zero-config dev, PostgreSQL (with a real connection pool) for production
on Oman Data Park. Foreign keys are enforced on every connection — SQLite needs a
per-connection PRAGMA; Postgres enforces them always.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL, DB_MAX_OVERFLOW, DB_POOL_SIZE, IS_SQLITE

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Production pool: pre_ping drops dead connections, recycle avoids stale ones.
    engine = create_engine(
        DATABASE_URL,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _record):  # noqa: ANN001
    # Per-connection FK enforcement for ANY SQLite engine (app or tests); Postgres
    # connections are left untouched (FKs are always enforced there).
    if "sqlite" in type(dbapi_connection).__module__:
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """FastAPI request-scoped session. Shared by every router so tests override one
    dependency. Not a constitutional concern — pure substrate."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    pass
