"""Age-appropriateness guard for question TYPES.

The ABSTRACT multi-item interactive patterns — drag-order (arrange several numbers/fractions
in order) and match (link facts to results) — must NEVER appear in a GRADE-1 unit. Grade 1
(the youngest, often non-fluent readers) is restricted to simpler patterns: tap-a-choice,
count, ten-frame, and concrete spatial manipulation.

NOTE on shape-compose: it is deliberately EXCLUDED from this guard. Composing a shape from
pieces (e.g. a square from two triangles) is a standard grade-1 geometry objective — a
concrete, hands-on drag, not an abstract ordering/linking task — and is used by design in
g1SHP2. It is age-appropriate for grade 1, so it is not a "complex" pattern here.

There is no runtime widget↔grade filter in the engine (the grade dimension filters which
SKILLS a child sees, not which widget kinds the skills use), so this is a PREVENTIVE test:
it fails the moment a future node leaks drag-order/match to the youngest children. It touches
nothing in the engine/gate — it only inspects the content a grade-1 child would actually be
served (stored published questions + live-generated ones).
"""
import random

from sqlalchemy import select

from app import generators
from app.models import Grade, Question, Skill, Student, Unit

# abstract multi-item patterns unfit for grade 1 (shape-compose is concrete → excluded, see above)
COMPLEX_KINDS = {"drag-order", "match"}


def _kinds(visual):
    if isinstance(visual, dict) and visual.get("kind"):
        return {visual["kind"]}
    return set()


def _grade1_skills(db):
    g1 = db.execute(select(Grade).where(Grade.name == "الصف الأول")).scalars().one()
    unit_ids = [u.id for u in db.execute(
        select(Unit).where(Unit.grade_id == g1.id)).scalars().all()]
    return db.execute(select(Skill).where(Skill.unit_id.in_(unit_ids))).scalars().all()


def test_grade1_has_no_complex_interactive_patterns(db):
    import app.main  # noqa: F401 — ensure the generator REGISTRY is populated
    skills = _grade1_skills(db)
    assert skills, "grade-1 skills not found"
    st = Student(name="حارس", grade_id=None)
    db.add(st)
    db.commit()
    sid = st.id
    offenders = []
    for s in skills:
        # (a) stored, published question visuals
        for q in db.execute(select(Question).where(
                Question.skill_id == s.id, Question.status == "published")).scalars().all():
            bad = _kinds(q.visual) & COMPLEX_KINDS
            if bad:
                offenders.append((s.code, "stored", sorted(bad)))
        # (b) live-generated instances — several draws to exercise all families/branches
        if generators.has_generators(s.code):
            rng = random.Random(7)
            for _ in range(6):
                for inst in generators.draw_batch(db, s, sid, total=8, rng=rng):
                    bad = _kinds(inst.visual) & COMPLEX_KINDS
                    if bad:
                        offenders.append((s.code, "generated", sorted(bad)))
            db.rollback()                              # discard probe instances (read-only)
    assert offenders == [], f"complex patterns leaked into grade 1: {offenders}"


def test_complex_patterns_do_exist_above_grade1(db):
    """Sanity anchor: the complex patterns DO exist in the platform above grade 1 (so the
    guard above is meaningful, not vacuously passing). They appear in grade 2+ — e.g. N10
    (drag-order) and g3MULF1 (match)."""
    import app.main  # noqa: F401
    st = Student(name="ع", grade_id=None)
    db.add(st)
    db.commit()
    sid = st.id
    seen = set()
    for code in ("N10", "g3FREQ", "g3MULF1"):
        sk = db.execute(select(Skill).where(Skill.code == code)).scalars().first()
        if sk is None:
            continue
        rng = random.Random(3)
        for _ in range(8):
            for inst in generators.draw_batch(db, sk, sid, total=8, rng=rng):
                seen |= _kinds(inst.visual)
        db.rollback()
    assert seen & COMPLEX_KINDS, "expected complex patterns to exist above grade 1"
