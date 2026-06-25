"""Security hardening of the OTP/email flow (pre-real-email): rate limiting, hashed OTP in the
cookie (not the code itself), verify brute-force cap, and the startup SECRET_KEY check.

None of this touches the engine/gate — it is the auth envelope only. The pluggable email sender
is patched to capture the code, exactly like test_register_otp."""
import jwt
import pytest

from app import config, main
from sqlalchemy import select
from app.models import User

_GOOD = {"name": "أبو ريان", "email": "sec@x.com", "whatsapp": "968" + "91234567",
         "password": "password123"}


def _capture(monkeypatch):
    box = {}
    monkeypatch.setattr("app.email.send_otp", lambda to, code: box.update(to=to, code=code))
    return box


# ----------------------------- (2) hashed code in the cookie -----------------------------
def test_pending_cookie_stores_hash_not_code(client, monkeypatch):
    box = _capture(monkeypatch)
    client.post("/api/auth/register/start", json=_GOOD)
    token = client.cookies.get(config.PENDING_COOKIE)
    assert token, "pending cookie not set"
    payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
    assert "code" not in payload                     # the raw OTP is NOT readable from the cookie
    assert payload.get("code_hash")                  # only its keyed digest is stored
    assert payload["code_hash"] != box["code"]


def test_correct_code_verifies_wrong_code_fails(client, db, monkeypatch):
    box = _capture(monkeypatch)
    client.post("/api/auth/register/start", json=_GOOD)
    assert client.post("/api/auth/register/verify", json={"code": "000000"}).status_code == 400
    ok = client.post("/api/auth/register/verify", json={"code": box["code"]})
    assert ok.status_code == 200                      # the real emailed code still works end-to-end
    assert db.execute(select(User).where(User.email == "sec@x.com")).scalars().first() is not None


# ----------------------------- (1a) verify brute-force cap -----------------------------
def test_verify_attempts_are_capped(client, monkeypatch):
    _capture(monkeypatch)
    monkeypatch.setattr(config, "OTP_MAX_VERIFY_ATTEMPTS", 2)
    client.post("/api/auth/register/start", json=_GOOD)
    assert client.post("/api/auth/register/verify", json={"code": "111111"}).status_code == 400  # try 1
    assert client.post("/api/auth/register/verify", json={"code": "222222"}).status_code == 400  # try 2
    burned = client.post("/api/auth/register/verify", json={"code": "333333"})
    assert burned.status_code == 429                  # capped → code burned, must request a new one


# ----------------------------- (1b) send rate limit -----------------------------
def test_send_rate_limit_blocks_after_max(client, monkeypatch):
    _capture(monkeypatch)
    monkeypatch.setattr(config, "OTP_SEND_MAX", 2)
    assert client.post("/api/auth/register/start", json=_GOOD).status_code == 200   # 1
    assert client.post("/api/auth/register/resend").status_code == 200              # 2
    blocked = client.post("/api/auth/register/start", json=_GOOD)
    assert blocked.status_code == 429                 # 3rd send in the window is refused
    assert "بعد قليل" in blocked.json()["detail"]     # clear Arabic "try again shortly"


def test_password_reset_is_rate_limited(client, monkeypatch):
    monkeypatch.setattr(config, "OTP_SEND_MAX", 1)
    monkeypatch.setattr("app.email.send_reset", lambda to, token: None)
    assert client.post("/api/auth/password-reset/request", json={"email": "nobody@x.com"}).status_code == 204
    # second request (same email+IP) is throttled — and reveals nothing about account existence
    assert client.post("/api/auth/password-reset/request", json={"email": "nobody@x.com"}).status_code == 429


# ----------------------------- (3) startup SECRET_KEY safety check -----------------------------
def test_security_check_warns_on_default_secret(monkeypatch):
    monkeypatch.setattr(config, "SECRET_KEY_IS_DEFAULT", True)
    monkeypatch.setattr(config, "IS_PRODUCTION", False)
    monkeypatch.setattr(config, "COOKIE_SECURE", False)
    warnings = main._security_check()
    assert any("SECRET_KEY" in w for w in warnings)   # dev → warn, does not raise


def test_security_check_refuses_default_secret_in_production(monkeypatch):
    monkeypatch.setattr(config, "SECRET_KEY_IS_DEFAULT", True)
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    with pytest.raises(RuntimeError):
        main._security_check()                        # prod + default key → refuse to boot


def test_security_check_clean_when_hardened(monkeypatch):
    monkeypatch.setattr(config, "SECRET_KEY_IS_DEFAULT", False)
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(config, "COOKIE_SECURE", True)
    assert main._security_check() == []               # strong key + HTTPS cookies → no warnings
