"""
Set the Arabic display name on the grades table.

The grades rows already carry name_ar/name_en/grade_number, but the `name`
column is empty (NULL) for all 12 rows. This fills `name` with the Arabic grade
label keyed by grade_number. Idempotent and portable (uses the app's DB layer).

Run from the backend directory:

    .venv/Scripts/python.exe seed_grade_names.py
"""

import asyncio
import logging

from dotenv import load_dotenv

load_dotenv()

from core.database import db_manager  # noqa: E402
from models.grades import Grades  # noqa: E402
from sqlalchemy import select  # noqa: E402

logging.basicConfig(level=logging.WARNING)

GRADE_NAMES = {
    1: "الصف الأول", 2: "الصف الثاني", 3: "الصف الثالث", 4: "الصف الرابع",
    5: "الصف الخامس", 6: "الصف السادس", 7: "الصف السابع", 8: "الصف الثامن",
    9: "الصف التاسع", 10: "الصف العاشر", 11: "الصف الحادي عشر", 12: "الصف الثاني عشر",
}


async def main() -> None:
    await db_manager.init_db()
    await db_manager.create_tables()

    updated = 0
    async with db_manager.async_session_maker() as db:
        rows = (await db.execute(select(Grades).order_by(Grades.grade_number, Grades.id))).scalars().all()
        for row in rows:
            # Prefer grade_number; fall back to existing name_ar when grade_number is missing.
            target = GRADE_NAMES.get(row.grade_number) or row.name_ar
            if target and row.name != target:
                row.name = target
                updated += 1
        await db.commit()

    await db_manager.close_db()
    print(f"Done. Updated {updated} grade name(s).")


if __name__ == "__main__":
    asyncio.run(main())
