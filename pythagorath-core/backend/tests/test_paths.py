"""Curriculum paths + the new N+F+T inventory nodes.

Proves the shared-inventory / per-country-path model:
* a node is built ONCE; a child sees only their country's path (NULL → the whole network);
* every visible node is prerequisite-closed (no node locked by a hidden prerequisite);
* the constitutional understanding gate works UNCHANGED on the new nodes — multi-family
  nodes via the families gate, symbolic nodes via the single-family generalisation gate
  (two structural items), exactly like the existing counting nodes.
The gate/lock logic is NOT modified by any of this — paths are a display/scoping layer.
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Answer, Question, Skill, Student

NEW_CODES = {"N4", "N9", "N10", "N11", "F1", "F4", "F5", "F7", "F9",
             "F11", "F12", "F13", "T1", "T5", "T6", "T10"}


def _child(client, country=None, name="طفل"):
    body = {"name": name, "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _codes(client, sid):
    return {e["code"] for e in client.get(f"/api/students/{sid}/skillmap").json()}


# ---------- inventory size ----------
def test_inventory_is_66_nodes(guardian_client):
    """56 (S1) + 3 (b1) + 3 (b2 fractions) + 4 (b3: Q4,Q5,DA4,V4). NULL → whole."""
    sid = _child(guardian_client)["id"]
    codes = _codes(guardian_client, sid)
    assert len(codes) == 66
    assert {"C5", "A3", "A4"} <= codes                     # S2 batch-1 present
    assert {"Fr1", "Fr2", "Fr3"} <= codes                  # S2 batch-2 fractions present
    assert {"Q4", "Q5", "DA4", "V4"} <= codes              # S2 batch-3 present
    assert NEW_CODES <= codes                              # N+F+T present
    assert {f"G{i}" for i in range(1, 9)} <= codes         # geometry present
    assert {"M1", "M4", "V1", "V2", "V3"} <= codes         # mult/div present
    assert {"DA1", "DA2", "DA3"} <= codes                  # data/probability present
    assert {"Q1", "Q2", "Q3"} <= codes                     # measurement present
    assert {"P", "Z", "R1", "R2", "S1", "S2", "Ord"} <= codes  # light strands + ordinal
    assert {"A1", "A2", "B2", "C1"} <= codes               # core still there


# ---------- per-country paths ----------
def test_qatar_child_sees_only_qatar_path(guardian_client):
    sid = _child(guardian_client, "QA")["id"]
    codes = _codes(guardian_client, sid)
    # Qatar includes these (from its curriculum file)
    assert {"N4", "F4", "F5", "F11", "F13", "T5"} <= codes
    # …and NOT these (not in Qatar's first semester)
    assert codes.isdisjoint({"F1", "F7", "N9", "N10", "N11", "T1", "T6", "T10"})


def test_oman_child_differs_from_qatar(guardian_client):
    sid = _child(guardian_client, "OM")["id"]
    codes = _codes(guardian_client, sid)
    assert {"N9", "N10", "N11", "F11"} <= codes      # Oman has these
    assert codes.isdisjoint({"N4", "F1", "F5", "T1", "T5", "T6"})  # Oman lacks these (has F4 now)


def test_bahrain_is_the_broadest(guardian_client):
    """Bahrain's file is the widest N+F+T coverage — it has all 16 new nodes."""
    sid = _child(guardian_client, "BH")["id"]
    assert NEW_CODES <= _codes(guardian_client, sid)


def test_uae_path_corrected_to_real_first_semester(guardian_client):
    """UAE source was corrected (the old file was a PARTIAL first semester — units 1–2 —
    NOT the second semester). The real S1 (5 units) adds T5 (multi-addend, unit 3) and N9
    (compare, unit 5) to the UAE path. Nothing was removed."""
    codes = _codes(guardian_client, _child(guardian_client, "AE")["id"])
    assert {"T5", "N9"} <= codes                          # the additions from units 3 & 5
    # still has everything from units 1–2 (unchanged)
    assert {"N4", "Z", "M1", "F4", "F13", "S2"} <= codes


def test_ordinal_is_uae_only_generalization(guardian_client, db):
    """Ordinal numbers (الأعداد الترتيبية) — a distinct positional behaviour, UAE-only (its
    S1 uniquely has the place-value-to-1000 unit). Single-family generalisation; reuses
    shape-pick; roots in E1 (counting)."""
    from sqlalchemy import select
    from app import gate
    from app.models import Question, Skill
    # path: UAE has it; the other five do not
    assert "Ord" in _codes(guardian_client, _child(guardian_client, "AE")["id"])
    for c in ("SA", "QA", "KW", "OM", "BH"):
        assert "Ord" not in _codes(guardian_client, _child(guardian_client, c)["id"])
    # generalisation (single family) + reuses shape-pick + roots in E1
    ord_sk = db.execute(select(Skill).where(Skill.code == "Ord")).scalars().first()
    assert gate.families_total(db, ord_sk.id) == 1
    qs = db.execute(select(Question).where(Question.skill_id == ord_sk.id)).scalars().all()
    assert all(q.visual["kind"] == "shape-pick" for q in qs)
    m = {e["code"]: e for e in guardian_client.get(
        f"/api/students/{_child(guardian_client, 'AE')['id']}/skillmap").json()}
    assert [p["id"] for p in m["Ord"]["prerequisites"]] == [m["E1"]["id"]]


def test_saudi_path_corrected_by_reaudit(guardian_client):
    """Re-audit found Saudi has 6 chapters (not 5): ch5 adds estimate-sum (T6) + three
    2-digit addends (T5); ch6 (2-digit subtraction) adds estimate-difference (T10)."""
    codes = _codes(guardian_client, _child(guardian_client, "SA")["id"])
    assert {"T5", "T6", "T10"} <= codes
    assert {"DA1", "DA2", "DA3", "T1", "N9"} <= codes     # data (3 nodes) + place value
    # geometry was absent in Saudi S1 but ARRIVES in S2 (ch10) — the merged path now has it.
    assert {"G1", "G2", "G3", "G4", "G6"} <= codes


def test_oman_path_reaudit(guardian_client):
    """Re-audit of Oman's full (spiral) lesson list added 3 nodes its original strand-level
    extraction missed: F4 (خطوط الضِّعف=doubles), F13 (مثلث عائلة الحقائق=fact families),
    R1 (الدخيل=odd-one-out). Oman has no missed UNITS (spiral; content spans the whole book)."""
    codes = _codes(guardian_client, _child(guardian_client, "OM")["id"])
    assert {"F4", "F13", "R1"} <= codes
    # Oman's broad strands stay (geometry, measurement Q1/Q2/Q3, sharing, patterns)
    assert {"G7", "G8", "Q1", "Q2", "Q3", "V1", "P", "N9"} <= codes


def test_kuwait_reaudit_adds_estimation(guardian_client):
    """Re-audit: Kuwait unit 2 (العدّ إلى ١٠٠) has «التقدير» → N11 was missing."""
    codes = _codes(guardian_client, _child(guardian_client, "KW")["id"])
    assert {"N11", "N9", "N10", "R1", "R2", "G1", "M1", "V3"} <= codes   # full 7-unit spread


def test_s2_batch1_three_digit_column_paths(guardian_client, db):
    """S2 batch-1 (C5, A3, A4) is country-scoped STRUCTURALLY: the five 3-digit curricula
    see it; Oman (spiral, no explicit 3-digit) does NOT — so an Oman child is never served
    a node outside their curriculum (the seven enforcement points respect SkillCountry)."""
    for c in ("SA", "BH", "QA", "KW", "AE"):
        assert {"C5", "A3", "A4"} <= _codes(guardian_client, _child(guardian_client, c)["id"]), c
    om = _codes(guardian_client, _child(guardian_client, "OM")["id"])
    assert om.isdisjoint({"C5", "A3", "A4"})               # Oman excluded (logged ambiguous)
    # the new edges: C5←C1, A3←{C5,A1}, A4←{C5,A2} — and every path stays prereq-closed
    from app.models import Skill, SkillPrerequisite
    from sqlalchemy import select
    def prereqs(code):
        sk = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        rows = db.execute(select(SkillPrerequisite.prerequisite_skill_id).where(
            SkillPrerequisite.skill_id == sk.id)).scalars().all()
        names = {s.id: s.code for s in db.execute(select(Skill)).scalars().all()}
        return {names[r] for r in rows}
    assert prereqs("C5") == {"C1"}
    assert prereqs("A3") == {"C5", "A1"}
    assert prereqs("A4") == {"C5", "A2"}


def test_country_child_sees_fewer_than_full_inventory(guardian_client):
    full = len(_codes(guardian_client, _child(guardian_client)["id"]))
    qa = len(_codes(guardian_client, _child(guardian_client, "QA")["id"]))
    assert qa < full      # a path is a strict subset of the inventory


# ---------- prerequisite-closure (no node locked by a hidden prerequisite) ----------
def test_every_country_path_is_prerequisite_closed(guardian_client):
    for country in ("SA", "AE", "QA", "KW", "OM", "BH"):
        sid = _child(guardian_client, country)["id"]
        entries = guardian_client.get(f"/api/students/{sid}/skillmap").json()
        visible_ids = {e["id"] for e in entries}
        for e in entries:
            for p in e["prerequisites"]:
                assert p["id"] in visible_ids, (
                    f"{country}: node {e['code']} depends on hidden prereq {p['id']}"
                )


# ---------- the gate works UNCHANGED on the new nodes ----------
def _seed_correct(db, sid, questions):
    for q in questions:
        db.add(Answer(student_id=sid, question_id=q.id, is_correct=True))
    db.flush()


def test_multifamily_new_node_uses_families_gate(db):
    """F4 (doubles) is a real two-family widget node → families gate."""
    f4 = db.execute(select(Skill).where(Skill.code == "F4")).scalars().first()
    assert gate.families_total(db, f4.id) >= 2
    qs = db.execute(select(Question).where(Question.skill_id == f4.id)).scalars().all()
    stu = Student(name="ث")
    db.add(stu); db.flush()
    one_per_family, seen = [], set()
    for q in qs:
        if q.family not in seen:
            seen.add(q.family); one_per_family.append(q)
        if len(seen) >= 2:
            break
    _seed_correct(db, stu.id, one_per_family)
    u = gate.understanding_state(db, stu.id, f4.id)
    assert u["mode"] == "families" and u["progress"] >= 2     # understanding reached


def test_symbolic_new_node_uses_generalization_gate(db):
    """F13 (fact families) is symbolic single-family → generalisation over two items,
    exactly like the counting nodes D1/D2/E1/E2."""
    f13 = db.execute(select(Skill).where(Skill.code == "F13")).scalars().first()
    assert gate.families_total(db, f13.id) == 1
    qs = db.execute(select(Question).where(Question.skill_id == f13.id)).scalars().all()
    assert len(qs) >= 2
    stu = Student(name="ج")
    db.add(stu); db.flush()
    _seed_correct(db, stu.id, qs[:2])
    u = gate.understanding_state(db, stu.id, f13.id)
    assert u["mode"] == "generalization" and u["progress"] >= 2


def test_paths_do_not_touch_the_gate(db):
    """Membership rows never change a node's behaviour: F4 has the same family count
    regardless of how many countries include it."""
    f4 = db.execute(select(Skill).where(Skill.code == "F4")).scalars().first()
    assert gate.families_total(db, f4.id) >= 2   # behaviour is intrinsic, not per-country
