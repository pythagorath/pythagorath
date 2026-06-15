"""Geometry strand (batch 2) — 8 nodes, 3 new isolated widgets, independent DAG.

Proves: the strand is independent (G1/G2/G8 open from the start, no number prereqs);
the three geometry paths (OM/KW/BH) are correct and prerequisite-closed; the new widgets
are isolated (the gate grades the emitted answer STRING, blind to the geometry); G5 is a
genuine two-family node while the rest pass the declared generalisation gate.
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Answer, Question, Skill, Student

GEO = {f"G{i}" for i in range(1, 9)}


def _child(client, country=None):
    body = {"name": "ط", "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _map(client, sid):
    return {e["code"]: e for e in client.get(f"/api/students/{sid}/skillmap").json()}


# ---------- paths: only OM/KW/BH have geometry; each sees exactly its file's nodes ----------
def test_geometry_paths_per_country(guardian_client):
    om = set(_map(guardian_client, _child(guardian_client, "OM")["id"]))
    kw = set(_map(guardian_client, _child(guardian_client, "KW")["id"]))
    bh = set(_map(guardian_client, _child(guardian_client, "BH")["id"]))
    assert om & GEO == {"G1", "G2", "G3", "G7", "G8"}     # Oman: +symmetry +lines
    assert kw & GEO == {"G1", "G2", "G3", "G4", "G5"}     # Kuwait: +describe +congruence
    assert bh & GEO == {"G1", "G2", "G3", "G4", "G5", "G6"}  # Bahrain: +compose


def test_geometry_extends_to_s2_countries(guardian_client):
    # S2 adds geometry (same nodes, new paths) to Saudi (ch10), Qatar (u13), UAE (u10).
    assert {"G1", "G2", "G3", "G4", "G6"} <= set(_map(guardian_client, _child(guardian_client, "SA")["id"]))
    assert {"G1", "G2", "G4"} <= set(_map(guardian_client, _child(guardian_client, "QA")["id"]))
    assert {"G1", "G2", "G3", "G4"} <= set(_map(guardian_client, _child(guardian_client, "AE")["id"]))


# ---------- independent strand: bases open from the start (no number prerequisites) ----------
def test_geometry_bases_are_open_from_start(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "OM")["id"])
    for base in ("G1", "G2", "G8"):
        assert m[base]["prerequisites"] == []       # no prereqs
        assert m[base]["unlocked"] is True           # open immediately
    # a dependent geometry node is locked until its geometry prereq (not a number node)
    assert m["G7"]["unlocked"] is False
    assert [p["id"] for p in m["G7"]["prerequisites"]] == [m["G1"]["id"]]


# ---------- the new widgets are isolated: the gate grades the emitted STRING ----------
def test_shape_pick_answer_is_graded_as_string(db):
    """G1 stores answers like «مربع»; grade() matches the emitted string — no geometry seen."""
    g1 = db.execute(select(Skill).where(Skill.code == "G1")).scalars().first()
    qs = db.execute(select(Question).where(Question.skill_id == g1.id)).scalars().all()
    q = qs[0]
    assert gate.grade(q, q.answer) is True            # correct string passes
    assert gate.grade(q, "دائرة") is False            # wrong selection fails


def test_element_count_answer_is_numeric_string(db):
    g3 = db.execute(select(Skill).where(Skill.code == "G3")).scalars().first()
    faces = db.execute(
        select(Question).where(Question.skill_id == g3.id, Question.answer == "٦")
    ).scalars().first()
    assert gate.grade(faces, 6) is True               # widget emits the count (digit-normalised)
    assert gate.grade(faces, 5) is False


# ---------- gate modes: G5 genuine two-family; G1 declared generalisation ----------
def test_g5_is_two_family(db):
    g5 = db.execute(select(Skill).where(Skill.code == "G5")).scalars().first()
    assert gate.families_total(db, g5.id) == 2        # «تحقّق» + «بحث»
    qs = db.execute(select(Question).where(Question.skill_id == g5.id)).scalars().all()
    stu = Student(name="ت"); db.add(stu); db.flush()
    seen, picked = set(), []
    for q in qs:
        if q.family not in seen:
            seen.add(q.family); picked.append(q)
    for q in picked[:2]:
        db.add(Answer(student_id=stu.id, question_id=q.id, is_correct=True))
    db.flush()
    u = gate.understanding_state(db, stu.id, g5.id)
    assert u["mode"] == "families" and u["progress"] >= 2


def test_g1_is_generalization(db):
    g1 = db.execute(select(Skill).where(Skill.code == "G1")).scalars().first()
    assert gate.families_total(db, g1.id) == 1        # single family «تعرّف» (declared)
    qs = db.execute(select(Question).where(Question.skill_id == g1.id)).scalars().all()
    stu = Student(name="ع"); db.add(stu); db.flush()
    for q in qs[:2]:
        db.add(Answer(student_id=stu.id, question_id=q.id, is_correct=True))
    db.flush()
    u = gate.understanding_state(db, stu.id, g1.id)
    assert u["mode"] == "generalization" and u["progress"] >= 2
