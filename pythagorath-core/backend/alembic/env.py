"""Alembic environment — bound to the app's models and env-driven DATABASE_URL.

The URL comes from app.config (one source of truth shared with db.py), so migrations
run unchanged on SQLite / local Postgres / Oman Data Park. `compare_type` and SQLite
batch mode keep autogenerate honest across dialects.
"""
from sqlalchemy import create_engine

from alembic import context

# Import the app's metadata (importing models registers every table on Base).
import app.models  # noqa: F401  (side-effect: table registration)
from app.config import DATABASE_URL, IS_SQLITE
from app.db import Base

config = context.config
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=IS_SQLITE,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(DATABASE_URL)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=IS_SQLITE,
        )
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
