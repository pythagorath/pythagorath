"""Accounts step 6 part B — child-device pairing. SECURITY-focused: code is one-time +
expiring + wrong-code-rejected; the device cookie reaches ONLY the children list, never any
guardian/admin endpoint; the parent account is never exposed; direct setup clears the
parent session."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app import consent
from app.models import PairingCode


def _child(gc, name="منى"):
    gid = next(g for g in gc.get("/api/grades").json() if g["order"] == 2)["id"]
    return gc.post("/api/students", json={
        "name": name, "country": "SA", "grade_id": gid,
        "consent_version": consent.CURRENT_VERSION}).json()


def test_pairing_code_is_guardian_only(client):
    assert client.post("/api/auth/pairing-code").status_code == 401   # not authenticated


def test_pair_then_device_isolation(guardian_client, anon_client):
    _child(guardian_client, "منى")
    code = guardian_client.post("/api/auth/pairing-code").json()["code"]
    r = anon_client.post("/api/auth/pair", json={"code": code})       # the child device redeems
    assert r.status_code == 200
    assert "منى" in [c["name"] for c in r.json()["children"]]

    # the device cookie reaches ONLY the children list…
    assert anon_client.get("/api/device/children").status_code == 200
    # …and NEVER any guardian/admin endpoint, nor exposes the parent account:
    assert anon_client.get("/api/students").status_code == 401
    assert anon_client.get("/api/auth/me").status_code == 401         # no parent identity
    assert anon_client.get("/api/admin/overview").status_code in (401, 403)

    # one-time: the same code can't be reused
    assert anon_client.post("/api/auth/pair", json={"code": code}).status_code == 400


def test_wrong_code_rejected(anon_client):
    assert anon_client.post("/api/auth/pair", json={"code": "0000"}).status_code == 400


def test_expired_code_rejected(guardian_client, anon_client, db):
    code = guardian_client.post("/api/auth/pairing-code").json()["code"]
    pc = db.execute(select(PairingCode).where(PairingCode.code == code)).scalars().first()
    pc.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)     # force-expire
    db.commit()
    assert anon_client.post("/api/auth/pair", json={"code": code}).status_code == 400


def test_direct_setup_clears_parent_session(guardian_client):
    _child(guardian_client)
    assert guardian_client.get("/api/auth/me").status_code == 200         # has a parent session
    assert guardian_client.post("/api/auth/device-from-session").status_code == 200
    # session cleared (account not left open) but device cookie now works
    assert guardian_client.get("/api/auth/me").status_code == 401
    assert guardian_client.get("/api/device/children").status_code == 200
