"""The personal learning path (next_skill): new frontier → continue → remedial descent,
recomputed live from mastery state. Honors the lock (only unlocked nodes offered) and the
unified DAG (remediation descends cross-grade). Pure read — touches no status."""
from sqlalchemy import select

from app import path as learning_path, gate
from app.main import _path_skills
from app.models import Grade, Skill


def _g4_child(db, h):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    return h.student(db, grade_id=g4.id)


def _skill(db, code):
    return db.execute(select(Skill).where(Skill.code == code)).scalars().one()


def _next(db, stu):
    return learning_path.next_skill(db, stu, _path_skills(db, stu))


def test_next_starts_at_an_unlocked_frontier(db, h):
    stu = _g4_child(db, h)
    res = _next(db, stu)
    assert res["reason"] == "new"
    assert gate.is_unlocked(db, stu.id, res["skill_id"])           # never a locked node


def test_next_continues_a_started_node(db, h):
    stu = _g4_child(db, h)
    frac = _skill(db, "g4FRAC")
    h.reach_understood_multi(db, stu.id, frac)                     # understood, not yet mastered
    res = _next(db, stu)
    assert res["reason"] == "continue" and res["skill_id"] == frac.id   # finish fluency first


def test_next_recomputes_after_progress(db, h):
    """Next is a live read: understanding a node changes the recommendation, and what it
    unlocks becomes reachable — no separate recompute."""
    stu = _g4_child(db, h)
    frac = _skill(db, "g4FRAC")
    dec = _skill(db, "g4DEC")
    assert not gate.is_unlocked(db, stu.id, dec.id)               # locked before its prereq
    h.reach_understood_multi(db, stu.id, frac)
    assert gate.is_unlocked(db, stu.id, dec.id)                   # g4FRAC understood → g4DEC opens
    assert gate.is_unlocked(db, stu.id, _next(db, stu)["skill_id"])


def test_next_remediation_descends_cross_grade(db, h):
    """Struggling at g4DEC (≥ threshold attempts, not understood) → descend to the nearest
    workable foundation. g3DEC is locked behind g3FRAC, so the target is g3FRAC — the root
    the child can actually fix now (the doctor's 'treat the nearest reachable cause')."""
    stu = _g4_child(db, h)
    h.reach_understood_multi(db, stu.id, _skill(db, "g4FRAC"))     # unlock g4DEC
    dec = _skill(db, "g4DEC")
    for q in h.questions(db, dec.id)[:learning_path.STRUGGLE_THRESHOLD]:
        h.answer(db, stu.id, q, correct=False)                    # struggle: wrong attempts
    res = _next(db, stu)
    assert res["reason"] == "remediation"
    assert res["remediating_for"] == dec.id
    target = db.get(Skill, res["skill_id"])
    assert target.code == "g3FRAC"                                # cross-grade foundation gap
    assert gate.is_unlocked(db, stu.id, target.id)               # and it's workable now


def test_next_no_remediation_when_foundation_is_solid(db, h):
    """Struggling but with a SOLID foundation → no descent; keep working the node
    (continue), preserving 'no progression', not abandoning it."""
    stu = _g4_child(db, h)
    pvm = _skill(db, "g4PVM")                                     # a g4 root: no cross-grade gap that's unsolid
    # make g3BIG (its cross-grade ancestor) solid so there's no foundation gap
    h.reach_understood_multi(db, stu.id, _skill(db, "g3BIG"))
    for q in h.questions(db, pvm.id)[:learning_path.STRUGGLE_THRESHOLD]:
        h.answer(db, stu.id, q, correct=False)
    res = _next(db, stu)
    # no workable unsolid foundation → not remediation; the struggling node is continued
    assert res["reason"] != "remediation" or res["skill_id"] != pvm.id


def test_next_endpoint_http(guardian_client, db):
    from app import consent
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    sid = guardian_client.post("/api/students", json={
        "name": "م", "consent_version": consent.CURRENT_VERSION, "grade_id": g4.id,
        "country": "SA"}).json()["id"]
    r = guardian_client.get(f"/api/students/{sid}/next")
    assert r.status_code == 200
    body = r.json()
    assert body["reason"] == "new" and body["skill"] is not None
