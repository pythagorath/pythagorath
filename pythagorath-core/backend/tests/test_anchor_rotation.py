"""Phase-5 prerequisite fix — anchor rotation in draw_batch lets SINGLE-family live nodes
reach understood→mastered (they were stuck at distinct_correct_items==1 forever). The gate
(gate.py) is untouched; only the Answer-log anchor now rotates across a family's templates.
Multi-family nodes are unaffected (their gate counts distinct FAMILIES, not anchors)."""
import random

from sqlalchemy import select

from app import gate, generators
from app.models import Answer, Skill, Student


def _drive(db, code, batches=20):
    sk = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
    st = Student(name="t", grade_id=None); db.add(st); db.commit()
    first_anchors = None
    rng = random.Random(2)
    snap = None
    for b in range(batches):
        batch = generators.draw_batch(db, sk, st.id, total=8, rng=rng)
        if b == 0:
            first_anchors = len({i.question_id for i in batch})
        for inst in batch:
            db.add(Answer(student_id=st.id, question_id=inst.question_id,
                          is_correct=True, elapsed_ms=900))
            db.flush()
        snap = gate.recompute(db, st.id, sk.id); db.commit()
        if snap["status"] == "mastered":
            break
    return first_anchors, snap["status"]


def test_single_family_nodes_are_actually_single():
    import app.main  # noqa: F401 — ensure REGISTRY populated
    for code in ("E1", "N9", "M4", "g1AREA"):
        assert len(generators.REGISTRY[code]) == 1, code


def test_single_family_now_reaches_mastered(db):
    for code in ("E1", "N9", "M4", "g1AREA"):
        first_anchors, status = _drive(db, code)
        assert first_anchors >= 2, (code, first_anchors)      # rotation gives ≥2 anchors
        assert status == "mastered", (code, status)            # was stuck in_progress before


def test_multi_family_still_masters_unchanged(db):
    for code in ("g1N20", "g1ADD", "g4PVM"):
        _, status = _drive(db, code)
        assert status == "mastered", (code, status)


def test_rotation_keeps_family_constant(db):
    # rotated anchors are all the SAME family → the multi-family families-gate is unaffected
    sk = db.execute(select(Skill).where(Skill.code == "N9")).scalars().one()
    st = Student(name="f", grade_id=None); db.add(st); db.commit()
    batch = generators.draw_batch(db, sk, st.id, total=8, rng=random.Random(1))
    assert {i.family for i in batch} == {"decompositional"}    # one family
    assert len({i.question_id for i in batch}) >= 2            # but several anchors
