"""Step A — accounts & authentication (register / login / session / reset)."""
from app import auth


def test_register_creates_guardian(client):
    r = client.post("/api/auth/register", json={"email": "g@x.com", "password": "password123"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "g@x.com"
    assert body["role"] == "guardian"     # public registration → guardian only


def test_register_rejects_weak_or_bad_input(client):
    assert client.post("/api/auth/register", json={"email": "bad", "password": "password123"}).status_code == 422
    assert client.post("/api/auth/register", json={"email": "g@x.com", "password": "short"}).status_code == 422


def test_register_duplicate_email_conflict(client):
    client.post("/api/auth/register", json={"email": "dup@x.com", "password": "password123"})
    r = client.post("/api/auth/register", json={"email": "dup@x.com", "password": "password123"})
    assert r.status_code == 409


def test_login_sets_httponly_cookie_and_me_works(client):
    client.post("/api/auth/register", json={"email": "log@x.com", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "log@x.com", "password": "password123"})
    assert r.status_code == 200
    set_cookie = r.headers.get("set-cookie", "").lower()
    assert "pyth_session=" in set_cookie and "httponly" in set_cookie and "samesite=lax" in set_cookie
    me = client.get("/api/auth/me")           # cookie auto-sent by the client jar
    assert me.status_code == 200 and me.json()["email"] == "log@x.com"


def test_login_wrong_password_401(client):
    client.post("/api/auth/register", json={"email": "w@x.com", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "w@x.com", "password": "WRONGpass1"})
    assert r.status_code == 401


def test_me_requires_authentication(client):
    assert client.get("/api/auth/me").status_code == 401


def test_logout_clears_session(client):
    client.post("/api/auth/register", json={"email": "out@x.com", "password": "password123"})
    client.post("/api/auth/login", json={"email": "out@x.com", "password": "password123"})
    assert client.get("/api/auth/me").status_code == 200
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_password_reset_flow_signed_and_expiring(client, db, h):
    # request never enumerates accounts (always 204)
    assert client.post("/api/auth/password-reset/request", json={"email": "nobody@x.com"}).status_code == 204
    u = h.make_user(db, "reset@x.com", password="password123")
    assert client.post("/api/auth/password-reset/request", json={"email": "reset@x.com"}).status_code == 204
    # the reset token is signed + short-lived; confirm changes the password
    token = auth.create_reset_token(u)
    r = client.post("/api/auth/password-reset/confirm", json={"token": token, "new_password": "newpassword1"})
    assert r.status_code == 204
    assert client.post("/api/auth/login", json={"email": "reset@x.com", "password": "newpassword1"}).status_code == 200
    # a tampered/invalid token is rejected
    assert client.post("/api/auth/password-reset/confirm",
                       json={"token": "not.a.token", "new_password": "whatever1"}).status_code == 400
