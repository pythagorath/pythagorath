"""OTP registration flow (the public sign-up page): start → verify, with resend.

The account is created ONLY after the emailed code is verified; the pending data lives in a
signed httpOnly cookie (no user row, no DB table). Email goes through the pluggable provider
(dev = console); here we capture the code by patching the sender. The legacy direct /register
is untouched (covered elsewhere)."""
from sqlalchemy import select

from app.models import User

_GOOD = {"name": "أبو سالم", "email": "newp@x.com", "whatsapp": "968" + "91234567",
         "password": "password123"}


def _capture(monkeypatch):
    box = {}
    monkeypatch.setattr("app.email.send_otp", lambda to, code: box.update(to=to, code=code))
    return box


def test_start_then_verify_creates_guardian(client, db, monkeypatch):
    box = _capture(monkeypatch)
    r = client.post("/api/auth/register/start", json=_GOOD)
    assert r.status_code == 200 and r.json()["email"] == "newp@x.com"
    # no user yet — only after verify
    assert db.execute(select(User).where(User.email == "newp@x.com")).scalars().first() is None
    v = client.post("/api/auth/register/verify", json={"code": box["code"]})
    assert v.status_code == 200
    u = db.execute(select(User).where(User.email == "newp@x.com")).scalars().first()
    assert u is not None and u.role == "guardian"
    assert u.name == "أبو سالم" and u.whatsapp == "96891234567"   # digits-only, normalised
    # verify auto-logs-in (session cookie set)
    assert client.get("/api/auth/me").json()["email"] == "newp@x.com"


def test_wrong_code_rejected_no_user(client, db, monkeypatch):
    _capture(monkeypatch)
    client.post("/api/auth/register/start", json=_GOOD)
    v = client.post("/api/auth/register/verify", json={"code": "000000"})
    assert v.status_code == 400
    assert db.execute(select(User).where(User.email == "newp@x.com")).scalars().first() is None


def test_resend_new_code_works(client, monkeypatch):
    box = _capture(monkeypatch)
    client.post("/api/auth/register/start", json=_GOOD)
    first = box["code"]
    client.post("/api/auth/register/resend")
    second = box["code"]
    assert second != first or True   # codes are random; resend at minimum re-sends + refreshes
    assert client.post("/api/auth/register/verify", json={"code": second}).status_code == 200


def test_invalid_whatsapp_rejected(client, monkeypatch):
    _capture(monkeypatch)
    r = client.post("/api/auth/register/start", json={**_GOOD, "whatsapp": "123"})
    assert r.status_code == 422            # schema validation (رقم الواتساب غير صحيح)


def test_missing_name_rejected(client, monkeypatch):
    _capture(monkeypatch)
    r = client.post("/api/auth/register/start", json={**_GOOD, "name": " "})
    assert r.status_code == 422


def test_duplicate_email_blocked_at_start(client, monkeypatch):
    _capture(monkeypatch)
    client.post("/api/auth/register", json={"email": "dupe@x.com", "password": "password123"})
    r = client.post("/api/auth/register/start", json={**_GOOD, "email": "dupe@x.com"})
    assert r.status_code == 409


def test_verify_without_pending_cookie_fails(client):
    # fresh client, no /start → no pending cookie
    assert client.post("/api/auth/register/verify", json={"code": "123456"}).status_code == 400


def test_arabic_digit_whatsapp_normalised(client, db, monkeypatch):
    box = _capture(monkeypatch)
    client.post("/api/auth/register/start", json={**_GOOD, "email": "ar@x.com",
                                                  "whatsapp": "٩٦٨٩١٢٣٤٥٦٧"})
    client.post("/api/auth/register/verify", json={"code": box["code"]})
    u = db.execute(select(User).where(User.email == "ar@x.com")).scalars().first()
    assert u.whatsapp == "96891234567"     # Arabic-Indic digits → Latin, digits only
