"""Pins the Alembic migration: it builds the full schema and is reversible.

Proves the substrate's schema path (migrations, not create_all) is sound and matches
the models. Runs on SQLite here; the IDENTICAL migration runs on Postgres/ODP.
"""
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

import app.config

_BACKEND = Path(__file__).resolve().parent.parent

EXPECTED_TABLES = {
    "students", "subjects", "grades", "units", "skills", "questions",
    "skill_mastery", "skill_prerequisites", "answers", "question_phrasings",
    "users", "consent_records", "plans", "subscriptions", "payments",
    "app_settings", "skill_countries", "alembic_version",
}


def _cfg() -> Config:
    cfg = Config(str(_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND / "alembic"))
    return cfg


def test_upgrade_builds_full_schema(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'm.db'}"
    monkeypatch.setattr(app.config, "DATABASE_URL", url)   # env.py reads this at run
    command.upgrade(_cfg(), "head")

    eng = create_engine(url)
    insp = inspect(eng)
    try:
        assert EXPECTED_TABLES <= set(insp.get_table_names())
        # the production-substrate columns added across the project must be present
        assert "elapsed_ms" in {c["name"] for c in insp.get_columns("answers")}
        assert "next_review_at" in {c["name"] for c in insp.get_columns("skill_mastery")}
        assert {"status", "draft_of", "difficulty"} <= {c["name"] for c in insp.get_columns("questions")}
        assert {"country", "owner_user_id", "grade_id"} <= {c["name"] for c in insp.get_columns("students")}
        assert "grade_id" in {c["name"] for c in insp.get_columns("units")}
        assert "is_free" in {c["name"] for c in insp.get_columns("skills")}
        assert {"email", "password_hash", "role"} <= {c["name"] for c in insp.get_columns("users")}
    finally:
        eng.dispose()


def test_downgrade_is_reversible(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'm2.db'}"
    monkeypatch.setattr(app.config, "DATABASE_URL", url)
    command.upgrade(_cfg(), "head")
    command.downgrade(_cfg(), "base")
    eng = create_engine(url)
    try:
        assert "questions" not in set(inspect(eng).get_table_names())
    finally:
        eng.dispose()
