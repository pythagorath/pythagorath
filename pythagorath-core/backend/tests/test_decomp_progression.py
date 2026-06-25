"""Mastery-gated progression for the decomposition («التفكيك») question — GENERATION-LAYER only.

A child still building the skill (in_progress) gets the COMPLETE pattern (the number shown with
ONE place blanked, child supplies it). Once they UNDERSTAND it (understood/mastered) they get the
FULL decomposition (fill EVERY place). Both grade through the same text gate.

The heart is untouched: generation only READS mastery via gate.read_snapshot (no recompute, no
status change). The GenFn extension is opt-in (3-arg generators receive the ctx; 2-arg ones do
not) — backward compatibility is asserted below.
"""
import random

from sqlalchemy import select

from app import gate, generators
from app.models import Question, Skill, SkillMastery, Student

import app.main  # noqa: F401 — import side effect: populate the generator REGISTRY


def _g4pvm(db):
    return db.execute(select(Skill).where(Skill.code == "g4PVM")).scalars().one()


def _draw_compose(db, skill, sid, tries=12):
    """Draw batches until a compose (expanded-form) instance appears; return (prompt, answer, visual)."""
    rng = random.Random(5)
    for _ in range(tries):
        for inst in generators.draw_batch(db, skill, sid, total=8, rng=rng):
            if isinstance(inst.visual, dict) and inst.visual.get("kind") == "expanded-form":
                return inst.prompt, inst.answer, inst.visual
    return None, None, None


def test_in_progress_child_gets_complete_pattern(db):
    sk = _g4pvm(db)
    st = Student(name="مبتدئ", grade_id=None); db.add(st); db.commit()
    pr, ans, vis = _draw_compose(db, sk, st.id)
    assert vis is not None and vis.get("kind") == "expanded-form"
    assert "blank_index" in vis and not vis.get("full")          # COMPLETE: one place blanked
    q = Question(skill_id=sk.id, family="compose", prompt=pr, answer=ans)
    assert gate.grade(q, ans)                                    # the generator answer grades right
    assert gate.grade(q, vis["parts"][vis["blank_index"]]["value"])  # = the blanked place value


def test_understood_child_gets_full_decomposition(db):
    sk = _g4pvm(db)
    st = Student(name="فاهم", grade_id=None); db.add(st); db.commit()
    # mark UNDERSTOOD directly (we are NOT exercising the gate here — generation only READS status)
    db.add(SkillMastery(student_id=st.id, skill_id=sk.id, status="understood", understood_answer_id=0))
    db.commit()
    pr, ans, vis = _draw_compose(db, sk, st.id)
    assert vis is not None and vis.get("full") is True           # FULL: every place is an input
    assert "blank_index" not in vis
    q = Question(skill_id=sk.id, family="compose", prompt=pr, answer=ans)
    # the WIDGET emits the child's place inputs joined "v + v + …" (high→low) — simulate it and
    # confirm it grades correct (byte-match after the gate normalises digits)
    widget_emits = " + ".join(str(p["value"]) for p in vis["parts"])
    assert gate.grade(q, widget_emits)
    assert gate.grade(q, ans)                                    # the generator answer round-trips


def test_mastered_child_also_gets_full(db):
    sk = _g4pvm(db)
    st = Student(name="متقن", grade_id=None); db.add(st); db.commit()
    db.add(SkillMastery(student_id=st.id, skill_id=sk.id, status="mastered", understood_answer_id=0))
    db.commit()
    _, _, vis = _draw_compose(db, sk, st.id)
    assert vis is not None and vis.get("full") is True


def test_backward_compat_two_arg_generators_unaffected(db):
    """The GenFn extension is opt-in: 2-arg generators (e.g. g4PVM 'place') still draw fine through
    the same draw_batch path that now also reads mastery for the 3-arg 'compose'."""
    sk = _g4pvm(db)
    st = Student(name="ع", grade_id=None); db.add(st); db.commit()
    batch = generators.draw_batch(db, sk, st.id, total=8, rng=random.Random(1))
    assert batch
    assert any(i.family == "place" for i in batch)               # 2-arg family produced normally
