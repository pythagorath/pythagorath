"""Account self-service (authenticated guardian, from inside the session): edit profile,
change password, change the login email via OTP — plus cancelling a subscription.

These reuse the existing validators / OTP machinery / subscription model; the tests pin the
new endpoints' safety properties (current password verified, email changed only after the OTP
to the NEW address is confirmed, cancel stops renewal but keeps paid access)."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models import Subscription, User


def _capture(monkeypatch):
    box = {}
    monkeypatch.setattr("app.email.send_otp", lambda to, code: box.update(to=to, code=code))
    return box


# ----------------------------- profile (PATCH /api/auth/me) -----------------------------
def test_me_returns_whatsapp_field(unsubscribed_client):
    me = unsubscribed_client.get("/api/auth/me").json()
    assert "whatsapp" in me and "name" in me        # UserRead now exposes whatsapp


def test_update_profile_name_and_whatsapp(unsubscribed_client, db):
    r = unsubscribed_client.patch("/api/auth/me",
                                  json={"name": "أبو سالم", "whatsapp": "٩٦٨٩١٢٣٤٥٦٧"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "أبو سالم"
    assert body["whatsapp"] == "96891234567"        # normalised (Arabic-Indic → Latin digits)
    u = db.execute(select(User).where(User.email == "nosub@x.com")).scalars().first()
    assert u.name == "أبو سالم" and u.whatsapp == "96891234567"


def test_update_profile_partial_only_changes_sent_field(unsubscribed_client):
    unsubscribed_client.patch("/api/auth/me", json={"name": "اسم", "whatsapp": "96890000000"})
    r = unsubscribed_client.patch("/api/auth/me", json={"name": "اسم جديد"})
    assert r.status_code == 200
    assert r.json()["name"] == "اسم جديد"
    assert r.json()["whatsapp"] == "96890000000"     # untouched


def test_update_profile_bad_whatsapp_rejected(unsubscribed_client):
    assert unsubscribed_client.patch("/api/auth/me", json={"whatsapp": "123"}).status_code == 422


def test_update_profile_requires_auth(anon_client):
    assert anon_client.patch("/api/auth/me", json={"name": "x"}).status_code == 401


# ----------------------------- change password -----------------------------
def test_change_password_wrong_current_rejected(unsubscribed_client):
    r = unsubscribed_client.post("/api/auth/change-password",
                                 json={"current_password": "wrongpass", "new_password": "brandnew123"})
    assert r.status_code == 400
    # old password still works (nothing changed)
    assert unsubscribed_client.post("/api/auth/login",
                                    json={"email": "nosub@x.com", "password": "password123"}).status_code == 200


def test_change_password_success_old_fails_new_works(unsubscribed_client):
    r = unsubscribed_client.post("/api/auth/change-password",
                                 json={"current_password": "password123", "new_password": "brandnew123"})
    assert r.status_code == 204
    assert unsubscribed_client.post("/api/auth/login",
                                    json={"email": "nosub@x.com", "password": "password123"}).status_code == 401
    assert unsubscribed_client.post("/api/auth/login",
                                    json={"email": "nosub@x.com", "password": "brandnew123"}).status_code == 200


def test_change_password_too_short_rejected(unsubscribed_client):
    assert unsubscribed_client.post("/api/auth/change-password",
                                    json={"current_password": "password123", "new_password": "short"}).status_code == 422


def test_change_password_requires_auth(anon_client):
    assert anon_client.post("/api/auth/change-password",
                            json={"current_password": "a", "new_password": "brandnew123"}).status_code == 401


# ----------------------------- change login email (OTP to NEW address) -----------------------------
def test_email_change_full_flow(unsubscribed_client, db, monkeypatch):
    box = _capture(monkeypatch)
    r = unsubscribed_client.post("/api/auth/email-change/start",
                                 json={"new_email": "fresh@x.com", "password": "password123"})
    assert r.status_code == 200 and r.json()["email"] == "fresh@x.com"
    assert box["to"] == "fresh@x.com"               # OTP went to the NEW address
    # email NOT changed yet
    assert db.execute(select(User).where(User.email == "fresh@x.com")).scalars().first() is None
    v = unsubscribed_client.post("/api/auth/email-change/verify", json={"code": box["code"]})
    assert v.status_code == 200 and v.json()["email"] == "fresh@x.com"
    # login now works with the new email, not the old
    assert unsubscribed_client.post("/api/auth/login",
                                    json={"email": "fresh@x.com", "password": "password123"}).status_code == 200
    assert unsubscribed_client.post("/api/auth/login",
                                    json={"email": "nosub@x.com", "password": "password123"}).status_code == 401


def test_email_change_wrong_password_rejected(unsubscribed_client, monkeypatch):
    _capture(monkeypatch)
    r = unsubscribed_client.post("/api/auth/email-change/start",
                                 json={"new_email": "fresh@x.com", "password": "wrongpass"})
    assert r.status_code == 400


def test_email_change_to_taken_email_rejected(unsubscribed_client, db, monkeypatch):
    _capture(monkeypatch)
    # another account exists
    unsubscribed_client.post("/api/auth/register", json={"email": "taken@x.com", "password": "password123"})
    # (registering does not change our session's logged-in user)
    r = unsubscribed_client.post("/api/auth/email-change/start",
                                 json={"new_email": "taken@x.com", "password": "password123"})
    assert r.status_code == 409


def test_email_change_wrong_code_rejected(unsubscribed_client, db, monkeypatch):
    _capture(monkeypatch)
    unsubscribed_client.post("/api/auth/email-change/start",
                             json={"new_email": "fresh@x.com", "password": "password123"})
    v = unsubscribed_client.post("/api/auth/email-change/verify", json={"code": "000000"})
    assert v.status_code == 400
    # unchanged
    assert db.execute(select(User).where(User.email == "nosub@x.com")).scalars().first() is not None
    assert db.execute(select(User).where(User.email == "fresh@x.com")).scalars().first() is None


def test_email_change_verify_without_start_fails(unsubscribed_client):
    assert unsubscribed_client.post("/api/auth/email-change/verify",
                                    json={"code": "123456"}).status_code == 400


def test_email_change_requires_auth(anon_client):
    assert anon_client.post("/api/auth/email-change/start",
                            json={"new_email": "fresh@x.com", "password": "x"}).status_code == 401


# ----------------------------- cancel subscription -----------------------------
def test_cancel_keeps_access_until_period_end(guardian_client, db):
    # guardian_client has an active subscription (30 days) from the fixture
    before = guardian_client.get("/api/subscription").json()
    assert before["has_access"] is True and before["status"] == "active"

    r = guardian_client.post("/api/subscription/cancel")
    assert r.status_code == 200
    after = r.json()
    assert after["status"] == "canceled"
    assert after["has_access"] is True              # access persists until access_until
    # persisted
    sub = db.execute(select(Subscription).where(Subscription.user_id != None)  # noqa: E711
                     .order_by(Subscription.id.desc())).scalars().first()
    assert sub.status == "canceled"


def test_cancel_without_active_subscription_404(unsubscribed_client):
    assert unsubscribed_client.post("/api/subscription/cancel").status_code == 404


def test_cancel_then_expired_loses_access(guardian_client, db):
    guardian_client.post("/api/subscription/cancel")
    # force the period to have ended → canceled + past access_until = no access
    sub = db.execute(select(Subscription).order_by(Subscription.id.desc())).scalars().first()
    sub.access_until = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()
    assert guardian_client.get("/api/subscription").json()["has_access"] is False


def test_cancel_requires_auth(anon_client):
    assert anon_client.post("/api/subscription/cancel").status_code == 401
