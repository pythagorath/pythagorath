"""Data & probability strand (batch 4) — 3 nodes, 2 new isolated widgets, independent.

Proves: the strict-review structure (read vs represent are SEPARATE nodes — receptive ≠
productive; tally/pictograph/bar are collapsed into families; probability is its own node);
the SA/BH paths; the strand is independent (DA1/DA2/DA3 open bases, no number prereqs);
the widgets are isolated (gate grades the emitted STRING); and all three nodes are genuine
two-family nodes (no generalisation, no visual debt).
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Answer, Question, Skill, Student

DA = {"DA1", "DA2", "DA3"}


def _child(client, country=None):
    body = {"name": "ط", "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _map(client, sid):
    return {e["code"]: e for e in client.get(f"/api/students/{sid}/skillmap").json()}


# ---------- paths: S1 (SA/BH) + S2 extends reading/representation (QA/OM/AE) + line plot ----------
def test_data_paths_s1_and_s2(guardian_client):
    def m(c): return set(_map(guardian_client, _child(guardian_client, c)["id"]))
    assert DA <= m("SA") and DA <= m("BH")                       # full data + probability
    qa = m("QA"); assert {"DA1", "DA2", "DA4"} <= qa and "DA3" not in qa   # +line plot, no probability
    om = m("OM"); assert {"DA1", "DA2"} <= om and om.isdisjoint({"DA3", "DA4"})
    ae = m("AE"); assert {"DA1", "DA4"} <= ae and ae.isdisjoint({"DA2", "DA3"})
    assert m("KW").isdisjoint(DA | {"DA4"})                      # Kuwait still no data strand


# ---------- independent strand: all three are open bases (no prerequisites) ----------
def test_data_nodes_are_open_bases(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "SA")["id"])
    for code in DA:
        assert m[code]["prerequisites"] == []
        assert m[code]["unlocked"] is True


# ---------- read vs represent are SEPARATE nodes (distinct behaviours) ----------
def test_read_and_represent_are_distinct_nodes(db):
    da1 = db.execute(select(Skill).where(Skill.code == "DA1")).scalars().first()
    da2 = db.execute(select(Skill).where(Skill.code == "DA2")).scalars().first()
    assert da1.id != da2.id
    # DA1 read items render a GIVEN chart; DA2 build items PRODUCE one
    r = db.execute(select(Question).where(Question.skill_id == da1.id)).scalars().first()
    b = db.execute(select(Question).where(Question.skill_id == da2.id)).scalars().first()
    assert r.visual["mode"] == "read" and b.visual["mode"] == "build"


# ---------- all three nodes are genuine two-family ----------
def test_all_three_are_two_family(db):
    for code, fams in [("DA1", {"صور", "أعمدة"}),
                       ("DA2", {"إشارات", "أعمدة"}),
                       ("DA3", {"حتمية", "مقارنة"})]:
        sk = db.execute(select(Skill).where(Skill.code == code)).scalars().first()
        got = {q.family for q in db.execute(
            select(Question).where(Question.skill_id == sk.id)).scalars()}
        assert got == fams, code
        assert gate.families_total(db, sk.id) == 2


def test_da1_families_gate_reaches_understood(db):
    da1 = db.execute(select(Skill).where(Skill.code == "DA1")).scalars().first()
    qs = db.execute(select(Question).where(Question.skill_id == da1.id)).scalars().all()
    stu = Student(name="ب"); db.add(stu); db.flush()
    seen, picked = set(), []
    for q in qs:
        if q.family not in seen:
            seen.add(q.family); picked.append(q)
    for q in picked[:2]:
        db.add(Answer(student_id=stu.id, question_id=q.id, is_correct=True))
    db.flush()
    u = gate.understanding_state(db, stu.id, da1.id)
    assert u["mode"] == "families" and u["progress"] >= 2


# ---------- widgets are isolated: gate grades the emitted string ----------
def test_chart_and_likelihood_emit_graded_strings(db):
    da1 = db.execute(select(Skill).where(Skill.code == "DA1")).scalars().first()
    most = db.execute(
        select(Question).where(Question.skill_id == da1.id, Question.answer == "ج")
    ).scalars().first()
    assert most.visual["kind"] == "chart" and most.visual["ask"] == "most"
    assert gate.grade(most, "ج") is True and gate.grade(most, "أ") is False

    da3 = db.execute(select(Skill).where(Skill.code == "DA3")).scalars().first()
    imp = db.execute(
        select(Question).where(Question.skill_id == da3.id, Question.answer == "مستحيل")
    ).scalars().first()
    assert imp.visual["kind"] == "likelihood"
    assert gate.grade(imp, "مستحيل") is True and gate.grade(imp, "أكيد") is False
