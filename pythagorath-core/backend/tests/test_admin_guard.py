"""Pins the constitutional guard + the published-only scope (drafts invisible).

Uses an ADMIN client (the admin API is admin-only from Step C; admin auth works in
Step B too, so these stay green across both)."""
from app import gate


def _node(admin_client, code):
    nodes = admin_client.get("/api/admin/nodes").json()
    return next(n for n in nodes if n["code"] == code)


def _pub_fam(admin_client, code, fam):
    return [q for q in _node(admin_client, code)["questions"]
            if q["family"] == fam and q["status"] == "published"]


def _pub(admin_client, code):
    return [q for q in _node(admin_client, code)["questions"] if q["status"] == "published"]


def test_delete_last_family_question_blocked(admin_client):
    # count-agnostic (content fill made nodes larger): delete down to ONE aggregative item,
    # then deleting it — which would drop C4 to a single family — must be blocked.
    agg = _pub_fam(admin_client, "C4", "aggregative")
    for q in agg[:-1]:
        assert admin_client.delete(f"/api/admin/questions/{q['id']}").status_code == 200
    agg = _pub_fam(admin_client, "C4", "aggregative")
    assert len(agg) == 1
    r = admin_client.delete(f"/api/admin/questions/{agg[0]['id']}")
    assert r.status_code == 409
    assert "عائلة واحدة" in r.json()["detail"]


def test_single_family_min_two_items_blocked(admin_client):
    # E1 is single-family; delete down to exactly 2, then the next delete (→1) must be blocked.
    items = _pub(admin_client, "E1")
    for q in items[:-2]:
        assert admin_client.delete(f"/api/admin/questions/{q['id']}").status_code == 200
    items = _pub(admin_client, "E1")
    assert len(items) == 2
    r = admin_client.delete(f"/api/admin/questions/{items[0]['id']}")
    assert r.status_code == 409
    assert "عنصرين" in r.json()["detail"]


def test_family_required_on_create(admin_client):
    e1 = _node(admin_client, "E1")
    r = admin_client.post(f"/api/admin/skills/{e1['id']}/questions",
                          json={"family": "", "prompt": "س", "answer": "١"})
    assert r.status_code == 422


def test_new_draft_is_invisible_to_the_gate(admin_client, db, h):
    e1 = h.skill(db, "E1")
    before = gate.families_total(db, e1.id)
    admin_client.post(f"/api/admin/skills/{e1.id}/questions", json={
        "family": "magnitude", "prompt": "مسودة عائلة جديدة", "answer": "٩",
        "visual": {"kind": "number-line", "min": 0, "max": 20, "start": 13, "jump": 4, "back": True},
    })
    db.expire_all()
    assert before == 1 and gate.families_total(db, e1.id) == 1
