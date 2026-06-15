"""The GRADE dimension — the child's TARGET (school) grade, intersected with country.

Proves: (1) target grade is MANDATORY at create (distinct 400); (2) the path =
grade ∩ country — a child sees ONLY their target grade's units; (3) codes don't collide
across grades (the grade filter keeps each child's view single-grade; the frontend keys
navigation by id, not code). The seven enforcement points inherit grade-scoping via
_path_skills / _skill_in_path (structural), exactly like the country dimension.
"""
from sqlalchemy import select

from app import consent
from app.models import Grade, Question, Skill, Subject, Unit


def _g2(client):
    """The seeded الصف الثاني id (robust even after a second grade is added in a test)."""
    return next(g["id"] for g in client.get("/api/grades").json() if g["name"] == "الصف الثاني")


def test_grades_endpoint_lists_seeded_grades(guardian_client):
    grades = guardian_client.get("/api/grades").json()
    assert len(grades) >= 1
    assert any(g["name"] == "الصف الثاني" for g in grades)


def test_target_grade_is_mandatory(guardian_client):
    # no grade_id → 400 (mandatory), distinct from the consent 400
    r = guardian_client.post("/api/students", json={
        "name": "ب", "consent_version": consent.CURRENT_VERSION})
    assert r.status_code == 400 and "الصف" in r.json()["detail"]
    # invalid grade_id → 400
    r2 = guardian_client.post("/api/students", json={
        "name": "ب", "grade_id": 999999, "consent_version": consent.CURRENT_VERSION})
    assert r2.status_code == 400
    # valid grade → 200, and the child carries that target grade
    g2 = _g2(guardian_client)
    r3 = guardian_client.post("/api/students", json={
        "name": "ب", "grade_id": g2, "consent_version": consent.CURRENT_VERSION})
    assert r3.status_code == 200 and r3.json()["grade_id"] == g2


def _make_second_grade(db, collide_code=None):
    """Seed a SECOND grade (الصف الأول) with one unit + one skill — optionally a code that
    COLLIDES with a grade-2 code — to prove grade scoping and no cross-grade code leak."""
    subj = db.execute(select(Subject)).scalars().first()
    g1 = Grade(name="الصف الأول", order=1); db.add(g1); db.flush()
    u = Unit(subject_id=subj.id, grade_id=g1.id, name="حساب الصف الأول", order=1); db.add(u); db.flush()
    sk = Skill(unit_id=u.id, code=collide_code or "G1X", name="مهارة صف أول", order=1, state="operational")
    db.add(sk); db.flush()
    db.add(Question(skill_id=sk.id, family="aggregative", prompt="سؤال صف أول", answer="١", status="published"))
    db.commit()
    return g1.id, sk.id


def test_path_is_grade_intersect_country(guardian_client, db):
    """A grade-2 child never sees a grade-1 node; a grade-1 child sees ONLY grade-1."""
    g1_id, g1_skill = _make_second_grade(db)
    g2_id = _g2(guardian_client)
    c2 = guardian_client.post("/api/students", json={
        "name": "ص٢", "grade_id": g2_id, "consent_version": consent.CURRENT_VERSION}).json()
    ids2 = {e["id"] for e in guardian_client.get(f"/api/students/{c2['id']}/skillmap").json()}
    assert g1_skill not in ids2                      # grade-2 child does NOT see the grade-1 node
    assert len(ids2) == 66                            # full grade-2 inventory (NULL country)
    c1 = guardian_client.post("/api/students", json={
        "name": "ص١", "grade_id": g1_id, "consent_version": consent.CURRENT_VERSION}).json()
    ids1 = {e["id"] for e in guardian_client.get(f"/api/students/{c1['id']}/skillmap").json()}
    assert ids1 == {g1_skill}                         # exactly their grade's node, nothing from grade-2


def test_no_code_collision_across_grades(guardian_client, db):
    """'C5' exists in grade-2 (batch-1); seed a grade-1 skill ALSO coded 'C5'. A grade-2
    child's map has exactly ONE 'C5' (their grade's) — the grade filter defuses the
    collision, and navigation keys by id."""
    _, g1_c5 = _make_second_grade(db, collide_code="C5")
    g2_id = _g2(guardian_client)
    c2 = guardian_client.post("/api/students", json={
        "name": "ص٢", "grade_id": g2_id, "consent_version": consent.CURRENT_VERSION}).json()
    entries = guardian_client.get(f"/api/students/{c2['id']}/skillmap").json()
    c5s = [e for e in entries if e["code"] == "C5"]
    assert len(c5s) == 1 and c5s[0]["id"] != g1_c5    # the grade-2 C5, not the grade-1 one
    codes = [e["code"] for e in entries if e["code"]]
    assert len(codes) == len(set(codes))              # no duplicate codes in a single-grade view


def test_grade_isolation_owner_other_anon(guardian_client, other_guardian_client, anon_client):
    """The grade dimension doesn't weaken isolation: a child with a target grade is still
    owner-200 / other-403 / anon-401 on the grade-scoped endpoints."""
    g2 = _g2(guardian_client)
    sid = guardian_client.post("/api/students", json={
        "name": "ع", "grade_id": g2, "consent_version": consent.CURRENT_VERSION}).json()["id"]
    assert guardian_client.get(f"/api/students/{sid}/skillmap").status_code == 200
    assert other_guardian_client.get(f"/api/students/{sid}/skillmap").status_code == 403
    assert anon_client.get(f"/api/students/{sid}/skillmap").status_code == 401
