"""Accounts step 6 — part (A): the guardian onboarding journey (sign up → add child with
consent), plus Student.created_at. Reuses the existing auth/consent/students endpoints."""
from app import consent
from app.models import Student


def _grade2(c):
    return next(g for g in c.get("/api/grades").json() if g["order"] == 2)["id"]


def test_child_has_created_at(guardian_client, db):
    r = guardian_client.post("/api/students", json={
        "name": "وداد", "country": "SA", "grade_id": _grade2(guardian_client),
        "consent_version": consent.CURRENT_VERSION})
    assert r.status_code == 200
    st = db.get(Student, r.json()["id"])
    assert st.created_at is not None                      # accounts-step column set on insert


def test_consent_is_mandatory(guardian_client):
    gid = _grade2(guardian_client)
    assert guardian_client.post("/api/students", json={"name": "ـ", "grade_id": gid}).status_code == 400
    assert guardian_client.post("/api/students", json={
        "name": "ـ", "grade_id": gid, "consent_version": "bogus"}).status_code == 400


def test_consent_record_stored(guardian_client, db):
    from app.models import ConsentRecord
    from sqlalchemy import select
    r = guardian_client.post("/api/students", json={
        "name": "هند", "country": "QA", "grade_id": _grade2(guardian_client),
        "consent_version": consent.CURRENT_VERSION})
    sid = r.json()["id"]
    rec = db.execute(select(ConsentRecord).where(ConsentRecord.student_id == sid)).scalars().first()
    assert rec is not None and rec.version == consent.CURRENT_VERSION   # legal record persisted


def test_full_signup_journey(client):
    assert client.post("/api/auth/register", json={
        "email": "newparent@x.com", "password": "password123"}).status_code in (200, 201)
    assert client.post("/api/auth/login", json={
        "email": "newparent@x.com", "password": "password123"}).status_code == 200
    assert client.get("/api/students").json() == []      # empty dashboard
    gid = next(g for g in client.get("/api/grades").json() if g["order"] == 2)["id"]
    cr = client.post("/api/students", json={
        "name": "طفل", "country": "SA", "grade_id": gid, "consent_version": consent.CURRENT_VERSION})
    assert cr.status_code == 200
    assert any(k["name"] == "طفل" for k in client.get("/api/students").json())
