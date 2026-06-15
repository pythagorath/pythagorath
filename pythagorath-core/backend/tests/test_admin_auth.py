"""Step C — the admin panel is gated by the 'admin' role (was wide open)."""


ADMIN_CALLS = [
    ("nodes",  lambda cl: cl.get("/api/admin/nodes")),
    ("meta",   lambda cl: cl.get("/api/admin/meta")),
]


def test_admin_api_requires_admin_role(guardian_client):
    for name, call in ADMIN_CALLS:
        assert call(guardian_client).status_code == 403, name   # logged in, not admin


def test_admin_api_blocks_anonymous(anon_client):
    for name, call in ADMIN_CALLS:
        assert call(anon_client).status_code == 401, name


def test_admin_can_access(admin_client):
    assert admin_client.get("/api/admin/nodes").status_code == 200
    assert admin_client.get("/api/admin/meta").status_code == 200


def test_admin_mutation_blocked_for_guardian(guardian_client, admin_client):
    # a real mutating endpoint must also be admin-only
    e1 = next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == "E1")
    qid = e1["questions"][0]["id"]
    assert guardian_client.delete(f"/api/admin/questions/{qid}").status_code == 403
