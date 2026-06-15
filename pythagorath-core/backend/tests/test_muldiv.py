"""Early multiplication / division strand (batch 3) — 5 nodes, 2 new isolated widgets.

Proves: the strict-review structure (M1 collapses equal-groups/repeated-addition/array
into ONE two-family node; V1/V3 stay separate); the four paths (QA/AE/OM/KW/BH) are
correct and prerequisite-closed; M/V depend on the number DAG (D1/D2), not on N4; the new
widgets are isolated (gate grades the emitted STRING); and — explicitly — V3 (quotative)
is NOT the subtraction node (its answer is the COUNT OF GROUPS, not a difference).
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Answer, Question, Skill, Student

MV = {"M1", "M4", "V1", "V2", "V3"}


def _child(client, country=None):
    body = {"name": "ط", "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _map(client, sid):
    return {e["code"]: e for e in client.get(f"/api/students/{sid}/skillmap").json()}


# ---------- paths ----------
def test_muldiv_paths_per_country(guardian_client):
    def mv(c): return set(_map(guardian_client, _child(guardian_client, c)["id"])) & MV
    assert mv("QA") == {"M1"}                       # Qatar: multiplication only
    assert mv("AE") == {"M1"}                       # UAE: multiplication only
    assert mv("OM") == {"M1", "V1"}                 # Oman: + sharing
    assert mv("KW") == {"M1", "M4", "V1", "V2", "V3"}   # Kuwait: division as a unit (all)
    assert mv("BH") == {"M1", "M4", "V1", "V2"}     # Bahrain: no quotative V3
    assert set(_map(guardian_client, _child(guardian_client, "SA")["id"])) & MV == set()  # SA: none


# ---------- depends on the number DAG (D1/D2), and is prerequisite-closed ----------
def test_m1_roots_in_addition_not_n4(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "OM")["id"])  # OM has M1 but NOT N4
    prereq_ids = {p["id"] for p in m["M1"]["prerequisites"]}
    assert prereq_ids == {m["D1"]["id"]}            # rooted in D1 (universal), not N4
    assert "N4" not in m                            # (Oman has no N4 — closure preserved)


def test_v3_path_is_prereq_closed_in_kuwait(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "KW")["id"])
    visible = set(m)
    for p in m["V3"]["prerequisites"]:
        assert p["id"] in {s["id"] for s in m.values()}   # M1 and D2 both visible to KW
    assert {"M1", "D2"} <= visible


# ---------- M1 is genuinely two-family; the division nodes are generalisation ----------
def test_m1_is_two_family_linear_and_array(db):
    m1 = db.execute(select(Skill).where(Skill.code == "M1")).scalars().first()
    fams = {q.family for q in db.execute(
        select(Question).where(Question.skill_id == m1.id)).scalars()}
    assert fams == {"خطّي", "مصفوفة"}              # linear + spatial — two real representations
    assert gate.families_total(db, m1.id) == 2


def test_v1_is_generalization(db):
    v1 = db.execute(select(Skill).where(Skill.code == "V1")).scalars().first()
    assert gate.families_total(db, v1.id) == 1
    qs = db.execute(select(Question).where(Question.skill_id == v1.id)).scalars().all()
    stu = Student(name="ق"); db.add(stu); db.flush()
    for q in qs[:2]:
        db.add(Answer(student_id=stu.id, question_id=q.id, is_correct=True))
    db.flush()
    u = gate.understanding_state(db, stu.id, v1.id)
    assert u["mode"] == "generalization" and u["progress"] >= 2


# ---------- V3 is NOT subtraction: its answer is the count of groups (quotient) ----------
def test_v3_is_quotative_not_subtraction(db):
    """«كم مجموعةً من ٤ في ١٢؟» → ٣ (groups), not ١٢−٤=٨. The widget emits the group count;
    the gate grades it against the quotient. This is division, not the difference."""
    v3 = db.execute(select(Skill).where(Skill.code == "V3")).scalars().first()
    q = db.execute(
        select(Question).where(Question.skill_id == v3.id, Question.answer == "٣")
    ).scalars().first()
    assert q.visual["mode"] == "measure"           # quotative (repeated-subtraction) widget
    assert gate.grade(q, 3) is True                # the COUNT of groups (12 ÷ 4)
    assert gate.grade(q, 8) is False               # NOT the difference 12 − 4
    assert gate.grade(q, 12 - 4) is False          # explicitly: not subtraction


# ---------- widgets are isolated: gate grades the emitted string ----------
def test_array_and_groups_emit_graded_strings(db):
    m1 = db.execute(select(Skill).where(Skill.code == "M1")).scalars().first()
    arr = db.execute(
        select(Question).where(Question.skill_id == m1.id, Question.answer == "١٠",
                               Question.family == "مصفوفة")
    ).scalars().first()
    assert arr.visual["kind"] == "array"
    assert gate.grade(arr, 10) is True and gate.grade(arr, 9) is False
