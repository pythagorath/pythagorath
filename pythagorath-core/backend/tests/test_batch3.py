"""S2 batch-3 — the four new nodes + path extensions (completes the second semester).

Q4 (area, reuses `array` squares), Q5 (time-sequencing, symbolic), DA4 (line plot, extends
`chart`), V4 (×↔÷ inverse, symbolic). Pins behaviour, widget reuse/extension, dependencies
(path-driven + closed), and BOTH-dimension (grade × country) scoping.
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Question, Skill, SkillPrerequisite, Unit


def _child(client, country=None):
    body = {"name": "٣", "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _codes(client, sid):
    return {e["code"] for e in client.get(f"/api/students/{sid}/skillmap").json()}


def _skill(db, code):
    return db.execute(select(Skill).where(Skill.code == code)).scalars().one()


def _qs(db, code):
    return db.execute(select(Question).where(Question.skill_id == _skill(db, code).id)).scalars().all()


def test_new_nodes_in_right_units(db):
    assert db.get(Unit, _skill(db, "Q4").unit_id).name == "القياس"
    assert db.get(Unit, _skill(db, "Q5").unit_id).name == "القياس"
    assert db.get(Unit, _skill(db, "DA4").unit_id).name == "البيانات والاحتمال"
    assert db.get(Unit, _skill(db, "V4").unit_id).name == "الضرب والقسمة"


def test_q4_area_reuses_array_squares(db):
    # area = count unit squares → REUSES the array widget with square tiles (no new kind)
    assert all(q.visual["kind"] == "array" and q.visual.get("square") for q in _qs(db, "Q4"))


def test_da4_extends_chart_lineplot(db):
    # line plot = a NEW chart MODE (not a new widget kind)
    assert all(q.visual["kind"] == "chart" and q.visual["type"] == "lineplot" for q in _qs(db, "DA4"))


def test_q5_v4_are_symbolic_single_family(db):
    for code in ("Q5", "V4"):
        assert all(q.visual is None for q in _qs(db, code))         # symbolic (no widget)
        assert gate.families_total(db, _skill(db, code).id) == 1    # single-family generalisation


def test_batch3_paths_in_both_dimensions(guardian_client):
    def m(c): return _codes(guardian_client, _child(guardian_client, c)["id"])
    for c in ("BH", "SA", "QA"):            # Q4 (area)
        assert "Q4" in m(c)
    assert "Q4" not in m("OM")
    for c in ("BH", "SA", "AE", "KW"):      # Q5 (time sequencing)
        assert "Q5" in m(c)
    assert "Q5" not in m("QA")
    for c in ("QA", "AE"):                  # DA4 (line plot)
        assert "DA4" in m(c)
    assert "DA4" not in m("SA")
    assert "V4" in m("KW")                  # V4 (×↔÷) — Kuwait only
    for c in ("SA", "BH", "QA", "AE", "OM"):
        assert "V4" not in m(c)


def test_dependencies_path_driven_and_closed(db):
    names = {s.id: s.code for s in db.execute(select(Skill)).scalars().all()}
    def pr(code):
        # INTRA-grade DAG = same-grade locks; cross-grade edges (descent) are excluded
        return {names[p] for p in gate.lock_prerequisites(db, _skill(db, code).id)}
    assert pr("V4") == {"M1", "V1"}     # inverse needs both — Kuwait has both (closed)
    for code in ("Q4", "Q5", "DA4"):    # independent visual/symbolic bases
        assert pr(code) == set()


def test_q2_q3_extended_to_five_countries(guardian_client):
    # the biggest path move: clock (Q2) + money (Q3) from Oman-only → five S2 curricula
    for c in ("OM", "SA", "BH", "AE", "KW"):
        assert {"Q2", "Q3"} <= _codes(guardian_client, _child(guardian_client, c)["id"]), c
