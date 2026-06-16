"""S2 batch-2 — fractions (the new strand, unit «الكسور»).

Pins the behavioural review:
* Fr1 is ONE node with TWO real families (تسمية recognise / تجزئة produce — partition+name
  merged, like C1's build/read; the DA read/build split was for a WIDE decoupling, not this);
* Fr2 (compare) and Fr3 (set) are distinct single-family nodes;
* Fr3 REUSES the groups/share widget (set model = sharing); Fr1/Fr2 use the new isolated
  `fraction` widget; dependencies are PATH-driven (Fr3←Fr1, not V1 — Saudi has Fr3 not V1);
* country paths: Fr1 in all six, Fr2/Fr3 in Bahrain+Saudi only — scoped in BOTH dimensions.
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Question, Skill, SkillPrerequisite, Unit


def _child(client, country=None):
    body = {"name": "ك", "consent_version": consent.CURRENT_VERSION,
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


def test_fractions_are_their_own_unit(db):
    assert db.get(Unit, _skill(db, "Fr1").unit_id).name == "الكسور"


def test_fr1_is_two_real_families(db):
    """Partition + name = two faces of one act (produce ↔ recognise) → ONE node, TWO families."""
    assert gate.families_total(db, _skill(db, "Fr1").id) == 2
    assert {"تسمية", "تجزئة"} <= {q.family for q in _qs(db, "Fr1")}


def test_fr2_fr3_single_family_generalisation(db):
    for code in ("Fr2", "Fr3"):
        assert gate.families_total(db, _skill(db, code).id) == 1


def test_fr1_uses_the_isolated_fraction_widget(db):
    qs = _qs(db, "Fr1")
    assert all(q.visual["kind"] == "fraction" for q in qs)
    assert {q.visual["mode"] for q in qs} == {"name", "shade"}   # both families' modes


def test_fr2_is_fraction_compare(db):
    qs = _qs(db, "Fr2")
    assert all(q.visual["kind"] == "fraction" and q.visual["mode"] == "compare" for q in qs)


def test_fr3_reuses_groups_widget_not_a_new_one(db):
    # the set model IS sharing → it reuses the existing groups/share widget (no new kind)
    assert all(q.visual["kind"] == "groups" and q.visual["mode"] == "share" for q in _qs(db, "Fr3"))


def test_fraction_paths_by_country(guardian_client):
    for c in ("SA", "AE", "QA", "KW", "OM", "BH"):           # Fr1 (region) — all six
        assert "Fr1" in _codes(guardian_client, _child(guardian_client, c)["id"]), c
    for c in ("BH", "SA"):                                    # Fr2/Fr3 — Bahrain + Saudi only
        assert {"Fr2", "Fr3"} <= _codes(guardian_client, _child(guardian_client, c)["id"]), c
    om = _codes(guardian_client, _child(guardian_client, "OM")["id"])
    assert "Fr1" in om and om.isdisjoint({"Fr2", "Fr3"})      # Oman: Fr1 yes, Fr2/Fr3 no


def test_fraction_dependencies_are_path_driven_and_closed(db):
    names = {s.id: s.code for s in db.execute(select(Skill)).scalars().all()}
    def prereqs(code):
        # the INTRA-grade DAG = same-grade locks; cross-grade edges (descent) are excluded
        return {names[p] for p in gate.lock_prerequisites(db, _skill(db, code).id)}
    assert prereqs("Fr1") == set()       # independent visual base
    assert prereqs("Fr2") == {"Fr1"}
    assert prereqs("Fr3") == {"Fr1"}     # NOT V1 — Saudi has Fr3 but not V1 (path closure)
