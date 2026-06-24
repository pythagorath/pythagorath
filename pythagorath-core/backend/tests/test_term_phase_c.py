"""Semester dimension — phase ج (the UI/API seam). The guardian picks/edits the child's
current term; it persists on Student.term and re-filters _path_skills. No engine/gate change."""
from sqlalchemy import select

from app import consent
from app.main import _path_skills
from app.models import Grade, Skill, SkillCountry, Student, Unit


def _g2(db):
    return db.execute(select(Grade.id).where(Grade.name == "الصف الثاني")).scalar_one()


def _expected(db, country, grade_id, term):
    rows = db.execute(
        select(Skill.id, SkillCountry.term)
        .join(Unit, Skill.unit_id == Unit.id)
        .join(SkillCountry, SkillCountry.skill_id == Skill.id)
        .where(Unit.grade_id == grade_id, SkillCountry.country == country)
    ).all()
    if term is None:
        return {sid for sid, _ in rows}
    return {sid for sid, t in rows if t is None or t == term}


def _create(client, db, term):
    r = client.post("/api/students", json={
        "name": "سالم", "country": "OM", "grade_id": _g2(db),
        "term": term, "consent_version": consent.CURRENT_VERSION})
    return r


# ----------------------------- create persists term -----------------------------
def test_create_with_term_persists(guardian_client, db):
    r = _create(guardian_client, db, 1)
    assert r.status_code == 200 and r.json()["term"] == 1
    assert db.get(Student, r.json()["id"]).term == 1


def test_create_default_term_is_null(guardian_client, db):
    r = guardian_client.post("/api/students", json={
        "name": "نورة", "country": "OM", "grade_id": _g2(db),
        "consent_version": consent.CURRENT_VERSION})              # term omitted
    assert r.status_code == 200 and r.json()["term"] is None


def test_create_invalid_term_rejected(guardian_client, db):
    assert _create(guardian_client, db, 3).status_code == 422


# ----------------------------- the term actually filters -----------------------------
def test_term1_child_sees_only_first_semester(guardian_client, db):
    sid = _create(guardian_client, db, 1).json()["id"]
    st = db.get(Student, sid)
    got = {s.id for s in _path_skills(db, st)}
    assert got == _expected(db, "OM", _g2(db), 1) and len(got) > 0


def test_term_switch_changes_scope(guardian_client, db):
    sid = _create(guardian_client, db, None).json()["id"]
    gid = _g2(db)
    st = db.get(Student, sid)
    assert {s.id for s in _path_skills(db, st)} == _expected(db, "OM", gid, None)   # whole grade

    guardian_client.patch(f"/api/students/{sid}", json={"term": 1})
    db.expire_all()
    st = db.get(Student, sid)
    assert {s.id for s in _path_skills(db, st)} == _expected(db, "OM", gid, 1)       # الفصل الأول

    guardian_client.patch(f"/api/students/{sid}", json={"term": 2})
    db.expire_all()
    st = db.get(Student, sid)
    assert {s.id for s in _path_skills(db, st)} == _expected(db, "OM", gid, 2)       # الفصل الثاني


# ----------------------------- PATCH safety -----------------------------
def test_patch_clears_term_to_whole_grade(guardian_client, db):
    sid = _create(guardian_client, db, 1).json()["id"]
    r = guardian_client.patch(f"/api/students/{sid}", json={"term": None})
    assert r.status_code == 200 and r.json()["term"] is None
    db.expire_all()
    assert db.get(Student, sid).term is None


def test_patch_invalid_term_rejected(guardian_client, db):
    sid = _create(guardian_client, db, 1).json()["id"]
    assert guardian_client.patch(f"/api/students/{sid}", json={"term": 5}).status_code == 422


def test_patch_not_owner_forbidden(guardian_client, other_guardian_client, db):
    sid = _create(guardian_client, db, 1).json()["id"]
    assert other_guardian_client.patch(f"/api/students/{sid}", json={"term": 2}).status_code == 403


def test_patch_missing_child_404(guardian_client):
    assert guardian_client.patch("/api/students/999999", json={"term": 1}).status_code == 404
