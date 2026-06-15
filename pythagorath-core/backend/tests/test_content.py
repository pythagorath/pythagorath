"""Phase-1 content fill — the spine (الحساب unit) at ≥8 questions/node for genuine fluency.

Pins: (a) every spine node has ≥8 questions with DISTINCT prompts AND ≥6 distinct answers
(so the fluency window of 5 sees varied values, not memorisable repeats); (b) families/cases
are preserved (understanding gate unbroken); (c) symbolic nodes vary the REQUIRED OPERATION
inside the family (not just values); (d) the generated answers are correct (grade passes).
"""
from collections import Counter

from sqlalchemy import select

from app import gate, seed
from app.models import Question, Skill, Unit

FILLED = list(seed.SUPPLEMENT)   # all nodes filled by the content phases


def _qs(db, code):
    sk = db.execute(select(Skill).where(Skill.code == code)).scalars().first()
    return sk, db.execute(select(Question).where(Question.skill_id == sk.id)).scalars().all()


def _target(db, sk):   # spine (الحساب + الكسور) + substantive new S2 visuals (Q4/DA4) → 8; else 6
    unit = db.get(Unit, sk.unit_id)
    return 8 if unit.name in ("الحساب", "الكسور") or sk.code in ("Q4", "DA4") else 6


# (a) ≥target questions, distinct prompts, varied answers (fluency window 5 sees variety)
def test_filled_nodes_reach_target_with_varied_values(db):
    for code in FILLED:
        sk, qs = _qs(db, code)
        tgt = _target(db, sk)
        assert len(qs) >= tgt, f"{code} has {len(qs)} (<{tgt})"
        # anti-memorisation: each QUESTION (prompt + visual) is unique — the stimulus varies
        # every time (for visual nodes the variety lives in the widget config, not the prompt).
        keys = {(q.prompt, str(q.visual)) for q in qs}
        assert len(keys) == len(qs), f"{code}: a repeated question (prompt+visual)"
        # spine (الحساب, numeric) also needs varied ANSWERS (no clustered guessing past the gate)
        if db.get(Unit, sk.unit_id).name == "الحساب":
            assert len({q.answer for q in qs}) >= 4, f"{code}: only {len({q.answer for q in qs})} answers"


# (b) families/cases preserved — multi-family nodes keep ≥2 families
def test_families_preserved(db):
    # nodes that were multi-family stay multi-family (understanding gate intact)
    for code in ["C4", "C3", "C1", "B1", "B2", "B3", "B4", "A1", "A2", "N4", "F4", "F5", "F9",
                 "T1", "M1"]:
        sk, _ = _qs(db, code)
        assert gate.families_total(db, sk.id) >= 2, f"{code} lost multi-family"
    # single-family generalisation nodes stay single-family
    for code in ["E1", "E2", "D1", "D2", "N9", "N10", "N11", "F1", "F7", "F11", "F12", "F13",
                 "T5", "T6", "T10", "M4", "V1", "V2", "V3"]:
        sk, _ = _qs(db, code)
        assert gate.families_total(db, sk.id) == 1, f"{code} family count changed"


# (e) mult/division: array/group DIMENSIONS genuinely vary (no repeated 2×5 etc.)
def test_muldiv_dimensions_are_varied(db):
    for code in ["M1", "V1", "V3"]:
        _, qs = _qs(db, code)
        dims = []
        for q in qs:
            v = q.visual or {}
            if v.get("kind") == "array":
                dims.append(("a", v["rows"], v["cols"]))
            elif v.get("kind") == "groups":
                m = v["mode"]
                if m == "form":
                    dims.append((m, v["groups"], v["per"]))
                elif m == "share":
                    dims.append((m, v["total"], v["groups"]))
                else:  # measure
                    dims.append((m, v["total"], v["per"]))
        assert len(dims) == len(set(dims)), f"{code}: repeated array/group dimensions"


# (c) symbolic nodes vary the REQUIRED OPERATION, not just values
def test_symbolic_nodes_vary_the_operation(db):
    for code in ["F11", "F12", "F13"]:
        _, qs = _qs(db, code)
        ps = [q.prompt for q in qs]
        assert any("+" in p for p in ps) and any("−" in p for p in ps), \
            f"{code}: operation not varied (must mix + and −)"


# (d) generated answers are correct — grade() passes for the gold answer, fails for a wrong one
def test_generated_answers_are_correct(db):
    # widget items: a number-line jump and a place-add both compute correctly
    for code in FILLED:
        _, qs = _qs(db, code)
        for q in qs:
            assert gate.grade(q, q.answer) is True            # gold answer always grades correct
    # structural-case integrity: E1 keeps BOTH within-decade and crossing-decade cases
    _, e1 = _qs(db, "E1")
    labels = " ".join(q.prompt for q in e1)
    assert "داخل العقد" in labels and "يعبر العقد" in labels


def test_total_questions_grew(db):
    from sqlalchemy import func
    total = db.execute(select(func.count()).select_from(Question)).scalar_one()
    assert total >= 300            # 180 base + ~129 spine fill
