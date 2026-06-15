"""Commercial layer — paywall (402) kept entirely separate from the lock (403)."""
from datetime import datetime, timedelta, timezone

from app import consent
from app.models import Subscription


def _child(client, name="ط"):
    return client.post("/api/students", json={"name": name, "consent_version": consent.CURRENT_VERSION,
        "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}).json()


def _skill_q(admin_client, code):
    node = next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == code)
    return node["id"], node["questions"][0]


def _questions(client, skill_id):
    """GET a skill's questions via the child-scoped path (NULL-country child → full path,
    so the paywall — not the path guard — is what these commercial tests exercise)."""
    cid = _child(client)["id"]
    return client.get(f"/api/students/{cid}/skills/{skill_id}/questions")


# ---------- paywall ----------
def test_unsubscribed_is_blocked_402(unsubscribed_client, admin_client):
    skill_id, q = _skill_q(admin_client, "B3")        # unlocked base node, not free
    r = _questions(unsubscribed_client, skill_id)
    assert r.status_code == 402
    child = _child(unsubscribed_client)
    r2 = unsubscribed_client.post("/api/answers", json={
        "student_id": child["id"], "question_id": q["id"], "answer": q["answer"], "elapsed_ms": 1000})
    assert r2.status_code == 402


def test_subscribed_can_access_paid(guardian_client, admin_client):
    skill_id, _ = _skill_q(admin_client, "B3")
    assert _questions(guardian_client, skill_id).status_code == 200


def test_is_free_opens_sample_without_subscription(unsubscribed_client, admin_client):
    e1_id, _ = _skill_q(admin_client, "E1")
    assert admin_client.patch(f"/api/admin/skills/{e1_id}/free", json={"is_free": True}).status_code == 200
    assert _questions(unsubscribed_client, e1_id).status_code == 200   # sample open
    paid_id, _ = _skill_q(admin_client, "B3")
    assert _questions(unsubscribed_client, paid_id).status_code == 402  # paid still blocked


# ---------- trial / checkout ----------
def test_trial_grants_access(unsubscribed_client, admin_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "شهري", "price": 2000, "trial_days": 7}).json()
    sub = unsubscribed_client.post("/api/subscription/trial", json={"plan_id": plan["id"]}).json()
    assert sub["has_access"] is True and sub["status"] == "trial"
    skill_id, _ = _skill_q(admin_client, "B3")
    assert _questions(unsubscribed_client, skill_id).status_code == 200


def test_checkout_activates_via_isolated_provider(unsubscribed_client, admin_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "شهري", "price": 2000, "trial_days": 0}).json()
    sub = unsubscribed_client.post("/api/subscription/checkout", json={"plan_id": plan["id"]}).json()
    assert sub["has_access"] is True and sub["status"] == "active"


def test_expired_subscription_blocks(unsubscribed_client, admin_client, db):
    me = unsubscribed_client.get("/api/auth/me").json()
    db.add(Subscription(user_id=me["id"], status="active",
                        access_until=datetime.now(timezone.utc) - timedelta(days=1)))   # expired
    db.commit()
    skill_id, _ = _skill_q(admin_client, "B3")
    assert _questions(unsubscribed_client, skill_id).status_code == 402


# ---------- the two gates never mix ----------
def test_paywall_402_distinct_from_lock_403(guardian_client, unsubscribed_client, admin_client):
    # subscribed guardian on a LOCKED skill → 403 (educational lock)
    _, a1q = _skill_q(admin_client, "A1")
    child = _child(guardian_client, "x")
    locked = guardian_client.post("/api/answers", json={
        "student_id": child["id"], "question_id": a1q["id"], "answer": a1q["answer"], "elapsed_ms": 1000})
    assert locked.status_code == 403
    # unsubscribed on an UNLOCKED paid skill → 402 (commercial paywall)
    _, b3q = _skill_q(admin_client, "B3")
    nochild = _child(unsubscribed_client, "y")
    paywalled = unsubscribed_client.post("/api/answers", json={
        "student_id": nochild["id"], "question_id": b3q["id"], "answer": b3q["answer"], "elapsed_ms": 1000})
    assert paywalled.status_code == 402
    # STRUCTURAL distinction (not message text): lock is 403 reason=locked; paywall is 402.
    assert locked.json()["detail"]["reason"] == "locked"
    assert locked.json()["detail"] != paywalled.json()["detail"]


# ---------- admin plan management ----------
def test_admin_plan_crud(admin_client):
    created = admin_client.post("/api/admin/plans", json={"name": "خطة", "price": 1500, "trial_days": 14})
    assert created.status_code == 200
    pid = created.json()["id"]
    assert admin_client.get("/api/admin/plans").status_code == 200
    patched = admin_client.patch(f"/api/admin/plans/{pid}", json={"price": 1800, "is_active": False})
    assert patched.status_code == 200 and patched.json()["price"] == 1800 and patched.json()["is_active"] is False


def test_plan_management_requires_admin(guardian_client):
    assert guardian_client.post("/api/admin/plans", json={"name": "x", "price": 1}).status_code == 403
