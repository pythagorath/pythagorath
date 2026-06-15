"""Light strands (batch 6) — patterns / even-odd / readiness / problem-solving (6 nodes).

Proves: the strict-review structure (R split into two distinct-act nodes; S split by PATH
like V1/V3); the per-country paths; the dependencies (Z←N4, S1←D1/D2, S2←S1; P/R1/R2 open
bases); all six are single-family GENERALISATION nodes (no faked families); and the one new
widget `pattern` is isolated (gate grades the emitted string).
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Question, Skill

LIGHT = {"P", "Z", "R1", "R2", "S1", "S2"}


def _child(client, country=None):
    body = {"name": "ط", "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _map(client, sid):
    return {e["code"]: e for e in client.get(f"/api/students/{sid}/skillmap").json()}


# ---------- paths ----------
def test_light_paths_per_country(guardian_client):
    # S1 + S2 merged: S2 added Z to OM/BH (even/odd) and R2 to BH/OM/AE (position & direction).
    def lt(c): return set(_map(guardian_client, _child(guardian_client, c)["id"])) & LIGHT
    assert lt("OM") == {"P", "S1", "R1", "Z", "R2"}     # +Z (فردي؟) +R2 (اتجاهات اللعب)
    assert lt("SA") == {"P", "S1"}                       # Saudi: no even/odd, no position
    assert lt("QA") == {"P", "Z", "S1", "S2"}
    assert lt("AE") == {"P", "Z", "S1", "S2", "R2"}     # +R2 (position & direction)
    assert lt("BH") == {"P", "S1", "S2", "Z", "R2"}     # +Z (ch11) +R2 (ch13)
    assert lt("KW") == {"P", "Z", "R1", "R2", "S1"}     # Kuwait unchanged


# ---------- dependencies ----------
def test_dependencies(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "KW")["id"])
    # Z (even/odd) rests on COUNTING (E1) — the minimal universal prereq (re-rooted from N4
    # in S2 so OM/BH, which lack N4, stay prerequisite-closed).
    assert [p["id"] for p in m["Z"]["prerequisites"]] == [m["E1"]["id"]]
    # P, R1, R2 are open bases
    for code in ("P", "R1", "R2"):
        assert m[code]["prerequisites"] == [] and m[code]["unlocked"] is True


def test_problem_solving_chain(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "QA")["id"])
    # S1 rests on addition AND subtraction; S2 rests on S1
    assert {m["D1"]["id"], m["D2"]["id"]} == {p["id"] for p in m["S1"]["prerequisites"]}
    assert [p["id"] for p in m["S2"]["prerequisites"]] == [m["S1"]["id"]]


# ---------- all six are single-family generalisation (no faked families) ----------
def test_all_light_nodes_are_generalization(db):
    for code in LIGHT:
        sk = db.execute(select(Skill).where(Skill.code == code)).scalars().first()
        assert gate.families_total(db, sk.id) == 1, code     # single family → generalisation


# ---------- the `pattern` widget is isolated; reuse/symbolic confirmed ----------
def test_pattern_widget_isolated_and_reuse(db):
    p = db.execute(select(Skill).where(Skill.code == "P")).scalars().first()
    qs = db.execute(select(Question).where(Question.skill_id == p.id)).scalars().all()
    assert any(q.visual and q.visual["kind"] == "pattern" for q in qs)
    shape_item = next(q for q in qs if q.visual["itemType"] == "shape")
    assert gate.grade(shape_item, "دائرة") is True and gate.grade(shape_item, "مربع") is False
    # Z / R reuse shape-pick; S is symbolic (no widget)
    z = db.execute(select(Skill).where(Skill.code == "Z")).scalars().first()
    assert all(q.visual["kind"] == "shape-pick" for q in db.execute(
        select(Question).where(Question.skill_id == z.id)).scalars())
    s1 = db.execute(select(Skill).where(Skill.code == "S1")).scalars().first()
    assert all(q.visual is None for q in db.execute(
        select(Question).where(Question.skill_id == s1.id)).scalars())
    # even/odd grades the emitted label
    zq = db.execute(select(Question).where(Question.skill_id == z.id, Question.answer == "زوجي")).scalars().first()
    assert gate.grade(zq, "زوجي") is True and gate.grade(zq, "فردي") is False
