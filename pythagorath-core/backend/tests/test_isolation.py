"""Data-isolation — the line of defence for children's privacy.

For EVERY child-scoped endpoint: the owner reaches it (200), another guardian is
refused (403), and an unauthenticated caller is refused (401). One leak = a child's
data exposed, so every endpoint is checked explicitly.
"""


from app import consent


def _child(guardian_client, name="طفل"):
    return guardian_client.post(
        "/api/students", json={"name": name, "consent_version": consent.CURRENT_VERSION,
                               "grade_id": [g["id"] for g in guardian_client.get("/api/grades").json() if g["order"] == 2][0]}
    ).json()


def _a_question(admin_client, code="B3"):
    node = next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == code)
    return node["questions"][0]


def _child_endpoints(sid, q):
    """Every call that touches a specific child's data."""
    return [
        ("skillmap",   lambda cl: cl.get(f"/api/students/{sid}/skillmap")),
        ("progress",   lambda cl: cl.get(f"/api/students/{sid}/skills/1/progress")),
        ("questions",  lambda cl: cl.get(f"/api/students/{sid}/skills/1/questions")),
        ("reviews",    lambda cl: cl.get(f"/api/students/{sid}/reviews")),
        ("probes",     lambda cl: cl.get(f"/api/students/{sid}/diagnostic/probes")),
        ("diagnostic", lambda cl: cl.post(f"/api/students/{sid}/diagnostic", json={"answers": []})),
        ("answers",    lambda cl: cl.post("/api/answers", json={
            "student_id": sid, "question_id": q["id"], "answer": q["answer"], "elapsed_ms": 1000})),
    ]


def test_owner_can_reach_own_child(guardian_client, admin_client):
    sid = _child(guardian_client)["id"]
    q = _a_question(admin_client)
    for name, call in _child_endpoints(sid, q):
        assert call(guardian_client).status_code == 200, name
    # the children list returns ONLY this guardian's children
    assert [x["id"] for x in guardian_client.get("/api/students").json()] == [sid]


def test_other_guardian_is_forbidden_403(guardian_client, other_guardian_client, admin_client):
    sid = _child(guardian_client)["id"]          # owned by guardian 1
    q = _a_question(admin_client)
    for name, call in _child_endpoints(sid, q):
        assert call(other_guardian_client).status_code == 403, name
    # guardian 2's own list never includes guardian 1's child
    assert all(x["id"] != sid for x in other_guardian_client.get("/api/students").json())


def test_unauthenticated_is_blocked_401(anon_client, guardian_client, admin_client):
    sid = _child(guardian_client)["id"]
    q = _a_question(admin_client)
    calls = _child_endpoints(sid, q) + [
        ("list",     lambda cl: cl.get("/api/students")),
    ]
    for name, call in calls:
        assert call(anon_client).status_code == 401, name


def test_nonexistent_child_is_404_for_owner(guardian_client):
    assert guardian_client.get("/api/students/999999/skillmap").status_code == 404
