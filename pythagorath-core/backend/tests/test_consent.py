"""Registered parental consent — no child data is collected without it."""
from sqlalchemy import select

from app import consent
from app.models import ConsentRecord, Student


def test_create_child_without_consent_is_blocked(guardian_client):
    assert guardian_client.post("/api/students", json={"name": "طفل"}).status_code == 400


def test_create_child_with_wrong_version_is_blocked(guardian_client):
    r = guardian_client.post("/api/students", json={"name": "طفل", "consent_version": "v0"})
    assert r.status_code == 400


def test_no_student_row_when_consent_missing(guardian_client, db):
    before = len(db.execute(select(Student)).scalars().all())
    guardian_client.post("/api/students", json={"name": "بلا موافقة"})   # 400
    db.expire_all()
    assert len(db.execute(select(Student)).scalars().all()) == before    # nothing collected


def test_consent_is_recorded_atomically_with_child(guardian_client, db):
    r = guardian_client.post(
        "/api/students", json={"name": "ريم", "consent_version": consent.CURRENT_VERSION,
                               "grade_id": [g["id"] for g in guardian_client.get("/api/grades").json() if g["order"] == 2][0]})
    assert r.status_code == 200
    child = r.json()
    rec = db.execute(
        select(ConsentRecord).where(ConsentRecord.student_id == child["id"])
    ).scalars().first()
    assert rec is not None                       # who / which child
    assert rec.user_id is not None
    assert rec.version == consent.CURRENT_VERSION  # which version
    assert rec.accepted_at is not None             # when


def test_consent_endpoint_returns_version_and_text(guardian_client):
    r = guardian_client.get("/api/consent")
    assert r.status_code == 200
    assert r.json()["version"] == consent.CURRENT_VERSION
    assert len(r.json()["text"]) > 0


def test_consent_endpoint_requires_auth(anon_client):
    assert anon_client.get("/api/consent").status_code == 401
