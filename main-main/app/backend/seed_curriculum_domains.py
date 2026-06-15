"""
Seed curriculum domains for the Omani curriculum, grades 1-12, across the 13 subjects.

Idempotent: re-running will not create duplicate subjects or domains. Uses the
application's own async DB layer, so it works with whatever DATABASE_URL is set
(SQLite locally, PostgreSQL in production).

Run from the backend directory (with the .venv Python), e.g.:

    .venv/Scripts/python.exe seed_curriculum_domains.py
"""

import asyncio
import logging

from dotenv import load_dotenv

load_dotenv()

from core.database import db_manager  # noqa: E402
from models.curriculum_domains import Curriculum_domains  # noqa: E402
from models.subjects import Subjects  # noqa: E402
from sqlalchemy import select  # noqa: E402

logging.basicConfig(level=logging.WARNING)

# Arabic grade ordinals (grade number -> Arabic label), matching existing data ("الصف الأول").
GRADE_LABELS = {
    1: "الصف الأول", 2: "الصف الثاني", 3: "الصف الثالث", 4: "الصف الرابع",
    5: "الصف الخامس", 6: "الصف السادس", 7: "الصف السابع", 8: "الصف الثامن",
    9: "الصف التاسع", 10: "الصف العاشر", 11: "الصف الحادي عشر", 12: "الصف الثاني عشر",
}
DEFAULT_SEMESTER = "الفصل الأول"

# The 13 MVP subjects and their curriculum strands (domains). Names are Arabic with
# English equivalents; structured to reflect the Omani curriculum's subject strands.
SUBJECT_DOMAINS: dict[str, list[tuple[str, str]]] = {
    "الرياضيات": [
        ("الأعداد والعمليات", "Numbers and Operations"),
        ("الجبر والأنماط", "Algebra and Patterns"),
        ("الهندسة", "Geometry"),
        ("القياس", "Measurement"),
        ("الإحصاء والاحتمالات", "Statistics and Probability"),
    ],
    "اللغة العربية": [
        ("الاستماع والتحدث", "Listening and Speaking"),
        ("القراءة", "Reading"),
        ("الكتابة", "Writing"),
        ("النحو والصرف", "Grammar and Morphology"),
        ("الأدب والنصوص", "Literature and Texts"),
    ],
    "اللغة الإنجليزية": [
        ("الاستماع", "Listening"),
        ("التحدث", "Speaking"),
        ("القراءة", "Reading"),
        ("الكتابة", "Writing"),
        ("القواعد والمفردات", "Grammar and Vocabulary"),
    ],
    "العلوم": [
        ("علوم الحياة", "Life Science"),
        ("العلوم الفيزيائية", "Physical Science"),
        ("علوم الأرض والفضاء", "Earth and Space Science"),
        ("الاستقصاء والمهارات العلمية", "Scientific Inquiry and Skills"),
    ],
    "التربية الإسلامية": [
        ("العقيدة", "Creed"),
        ("القرآن الكريم وعلومه", "Quran and its Sciences"),
        ("الحديث الشريف", "Hadith"),
        ("الفقه وأحكامه", "Fiqh"),
        ("السيرة والشخصيات", "Seerah and Figures"),
    ],
    "الدراسات الاجتماعية": [
        ("الجغرافيا", "Geography"),
        ("التاريخ", "History"),
        ("التربية الوطنية والمدنية", "Civics and National Education"),
        ("المهارات الاجتماعية", "Social Skills"),
    ],
    "الفيزياء": [
        ("الميكانيكا", "Mechanics"),
        ("الكهرباء والمغناطيسية", "Electricity and Magnetism"),
        ("الموجات والصوت", "Waves and Sound"),
        ("الحرارة والطاقة", "Heat and Energy"),
        ("الفيزياء الحديثة", "Modern Physics"),
    ],
    "الكيمياء": [
        ("المادة وتركيبها", "Matter and its Structure"),
        ("التفاعلات الكيميائية", "Chemical Reactions"),
        ("الكيمياء العضوية", "Organic Chemistry"),
        ("الأحماض والقواعد", "Acids and Bases"),
        ("الكيمياء الحرارية", "Thermochemistry"),
    ],
    "الأحياء": [
        ("الخلية", "The Cell"),
        ("الوراثة", "Genetics"),
        ("أجهزة الجسم", "Body Systems"),
        ("التنوع الحيوي", "Biodiversity"),
        ("البيئة والأنظمة البيئية", "Ecology"),
    ],
    "الجغرافيا": [
        ("الجغرافيا الطبيعية", "Physical Geography"),
        ("الجغرافيا البشرية", "Human Geography"),
        ("الخرائط ونظم المعلومات الجغرافية", "Maps and GIS"),
        ("البيئة والموارد", "Environment and Resources"),
    ],
    "التاريخ": [
        ("تاريخ عُمان", "History of Oman"),
        ("التاريخ الإسلامي", "Islamic History"),
        ("الحضارات القديمة", "Ancient Civilizations"),
        ("التاريخ الحديث والمعاصر", "Modern and Contemporary History"),
    ],
    "العلوم البيئية": [
        ("النظم البيئية", "Ecosystems"),
        ("التلوث وحماية البيئة", "Pollution and Protection"),
        ("الموارد الطبيعية", "Natural Resources"),
        ("الاستدامة", "Sustainability"),
        ("التغير المناخي", "Climate Change"),
    ],
    "هذا وطني": [
        ("الهوية الوطنية", "National Identity"),
        ("تاريخ عُمان", "History of Oman"),
        ("جغرافية عُمان", "Geography of Oman"),
        ("المواطنة والقيم", "Citizenship and Values"),
    ],
}


async def _ensure_subject(db, name: str) -> int:
    """Return the id of the subject with this name, creating one if none exists."""
    existing = (
        await db.execute(select(Subjects).where(Subjects.name == name).order_by(Subjects.id))
    ).scalars().first()
    if existing:
        return existing.id
    subject = Subjects(name=name, grade="جميع الصفوف", status="active")
    db.add(subject)
    await db.flush()
    return subject.id


async def main() -> None:
    await db_manager.init_db()
    await db_manager.create_tables()

    created_subjects = 0
    created_domains = 0
    skipped_domains = 0

    async with db_manager.async_session_maker() as db:
        # Subject name -> id (create missing).
        subject_ids: dict[str, int] = {}
        for name in SUBJECT_DOMAINS:
            existed = (
                await db.execute(select(Subjects.id).where(Subjects.name == name))
            ).first()
            subject_ids[name] = await _ensure_subject(db, name)
            if not existed:
                created_subjects += 1

        # Load existing (subject_id, grade, name) keys to stay idempotent.
        existing_rows = (
            await db.execute(select(Curriculum_domains.subject_id, Curriculum_domains.grade, Curriculum_domains.name))
        ).all()
        existing_keys = {(r[0], r[1], r[2]) for r in existing_rows}

        for subject_name, strands in SUBJECT_DOMAINS.items():
            subject_id = subject_ids[subject_name]
            for grade_num, grade_label in GRADE_LABELS.items():
                for order_index, (name_ar, name_en) in enumerate(strands):
                    key = (subject_id, grade_label, name_ar)
                    if key in existing_keys:
                        skipped_domains += 1
                        continue
                    db.add(
                        Curriculum_domains(
                            name=name_ar,
                            name_en=name_en,
                            subject_id=subject_id,
                            grade=grade_label,
                            semester=DEFAULT_SEMESTER,
                            order_index=order_index,
                            description=f"{subject_name} - {grade_label}",
                        )
                    )
                    existing_keys.add(key)
                    created_domains += 1

        await db.commit()

    await db_manager.close_db()
    print(
        f"Done. Subjects created: {created_subjects}, "
        f"domains created: {created_domains}, domains skipped (already existed): {skipped_domains}"
    )


if __name__ == "__main__":
    asyncio.run(main())
