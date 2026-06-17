"""Accounts step 6 part C — secret-picture child login + child mode. THE security tests:
the child cookie reaches ONLY its own child (never a sibling), never any guardian/admin
endpoint; the secret picture is set-once then matched; a child can do their OWN adventure.
The gates/grading are byte-identical (only the auth path changed)."""
from app import consent


def _grade2(c):
    return next(g for g in c.get("/api/grades").json() if g["order"] == 2)["id"]


def _mkchild(gc, name):
    return gc.post("/api/students", json={
        "name": name, "grade_id": _grade2(gc), "consent_version": consent.CURRENT_VERSION}).json()


def _node(admin, code):
    return next(n for n in admin.get("/api/admin/nodes").json() if n["code"] == code)


def _pair(gc, device):
    code = gc.post("/api/auth/pairing-code").json()["code"]
    device.post("/api/auth/pair", json={"code": code})


def test_child_login_requires_paired_device(client):
    assert client.post("/api/device/child-login",
                       json={"student_id": 1, "secret_picture": "⭐"}).status_code == 401


def test_secret_picture_set_then_match_then_reject(guardian_client, anon_client):
    a = _mkchild(guardian_client, "أ")
    _pair(guardian_client, anon_client)
    # first login CHOOSES the picture
    assert anon_client.post("/api/device/child-login",
                            json={"student_id": a["id"], "secret_picture": "⭐"}).status_code == 200
    # a WRONG picture afterwards is rejected
    assert anon_client.post("/api/device/child-login",
                            json={"student_id": a["id"], "secret_picture": "🐶"}).status_code == 401
    # the right one matches
    assert anon_client.post("/api/device/child-login",
                            json={"student_id": a["id"], "secret_picture": "⭐"}).status_code == 200
    # an invalid (off-set) picture is refused
    assert anon_client.post("/api/device/child-login",
                            json={"student_id": a["id"], "secret_picture": "💣"}).status_code == 400


def test_child_cookie_isolation(guardian_client, anon_client):
    a = _mkchild(guardian_client, "أ")
    b = _mkchild(guardian_client, "ب")
    _pair(guardian_client, anon_client)
    anon_client.post("/api/device/child-login", json={"student_id": a["id"], "secret_picture": "⭐"})

    assert anon_client.get("/api/child/me").json()["id"] == a["id"]
    # reaches OWN adventure/session, NOT the sibling's
    assert anon_client.get(f"/api/students/{a['id']}/adventure").status_code == 200
    assert anon_client.get(f"/api/students/{b['id']}/adventure").status_code == 403
    assert anon_client.get(f"/api/students/{a['id']}/session").status_code == 200
    assert anon_client.get(f"/api/students/{b['id']}/session").status_code == 403
    # NEVER reaches guardian/admin endpoints (no parent account exposure)
    assert anon_client.get("/api/auth/me").status_code == 401
    assert anon_client.get("/api/students").status_code == 401
    assert anon_client.get("/api/admin/overview").status_code in (401, 403)


def test_child_answers_only_their_own(guardian_client, admin_client, anon_client):
    a = _mkchild(guardian_client, "أ")
    b = _mkchild(guardian_client, "ب")
    q = _node(admin_client, "B3")["questions"][0]
    _pair(guardian_client, anon_client)
    anon_client.post("/api/device/child-login", json={"student_id": a["id"], "secret_picture": "⭐"})
    # the child answers a question for THEMSELVES (the gates run unchanged)
    r = anon_client.post("/api/answers", json={
        "student_id": a["id"], "question_id": q["id"], "answer": q["answer"], "elapsed_ms": 1000})
    assert r.status_code == 200 and "is_correct" in r.json()
    # the SAME child cookie cannot answer for the sibling
    rb = anon_client.post("/api/answers", json={
        "student_id": b["id"], "question_id": q["id"], "answer": q["answer"], "elapsed_ms": 1000})
    assert rb.status_code == 403
