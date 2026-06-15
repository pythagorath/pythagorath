"""
One-off migration: add the nullable `lesson_id` column to curriculum_skills.

Links AI-generated skills to their lesson (curriculum_lessons.id). Idempotent:
skips if the column already exists. Works on SQLite and PostgreSQL.

Run from the backend directory:

    .venv/Scripts/python.exe migrate_add_lesson_id.py
"""

import asyncio
import logging

from dotenv import load_dotenv

load_dotenv()

from core.database import db_manager  # noqa: E402
from sqlalchemy import text  # noqa: E402

logging.basicConfig(level=logging.WARNING)


async def main() -> None:
    await db_manager.init_db()
    engine = db_manager.engine
    async with engine.begin() as conn:
        dialect = engine.dialect.name
        if dialect == "sqlite":
            cols = [r[1] for r in (await conn.execute(text("PRAGMA table_info(curriculum_skills)"))).fetchall()]
        else:
            cols = [
                r[0]
                for r in (
                    await conn.execute(
                        text(
                            "SELECT column_name FROM information_schema.columns "
                            "WHERE table_name = 'curriculum_skills'"
                        )
                    )
                ).fetchall()
            ]

        if "lesson_id" in cols:
            print("Column 'lesson_id' already exists; nothing to do.")
        else:
            await conn.execute(text("ALTER TABLE curriculum_skills ADD COLUMN lesson_id INTEGER"))
            print("Added column 'lesson_id' to curriculum_skills.")

    await db_manager.close_db()


if __name__ == "__main__":
    asyncio.run(main())
