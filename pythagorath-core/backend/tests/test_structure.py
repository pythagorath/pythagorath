"""Multi-grade / multi-subject structural readiness (content stays Grade-2 / Math).

Adding a grade or subject must be INSERTING rows, not changing the schema. Codes are
unique per unit, so each grade/subject can reuse E1/B2/A1… The gate keys on skill IDs,
so this changes nothing constitutional (lock + diagnostic stay green — see test_gate /
test_diagnostic)."""
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Grade, Skill, Subject, Unit


def test_seed_creates_grade_and_links_unit(db):
    grade = db.execute(select(Grade)).scalars().first()
    assert grade is not None and grade.name == "الصف الثاني"
    unit = db.execute(select(Unit)).scalars().first()
    assert unit.grade_id == grade.id          # the (subject, grade) catalogue link


def test_new_grade_subject_unit_skill_needs_no_schema_change(db):
    # add a whole new (subject, grade) branch by inserting rows only
    subj = Subject(name="العلوم")
    g = Grade(name="الصف الثالث", order=3)
    db.add_all([subj, g])
    db.flush()
    u = Unit(subject_id=subj.id, grade_id=g.id, name="وحدة جديدة", order=1)
    db.add(u)
    db.flush()
    # reuse code 'B2' that already exists in the seeded unit — allowed (scoped per unit)
    db.add(Skill(unit_id=u.id, code="B2", name="مهارة", order=1, state="operational"))
    db.commit()
    assert len(db.execute(select(Skill).where(Skill.code == "B2")).scalars().all()) >= 2


def test_duplicate_code_within_same_unit_is_rejected(db):
    unit = db.execute(select(Unit)).scalars().first()   # seeded unit already has 'E1'
    db.add(Skill(unit_id=unit.id, code="E1", name="مكرر", order=99, state="operational"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
