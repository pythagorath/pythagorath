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


# ---------- the marketing funnel: diagnosis FREE, treatment PAID ----------
def test_diagnosis_is_free_treatment_is_paid(unsubscribed_client, admin_client):
    """The new-visitor contract: an account (with consent) can DIAGNOSE a child and SEE the
    result with NO subscription, but continuous treatment (skill questions + answers) is
    walled (402). The wall sits ONLY on treatment — never on the diagnostic."""
    child = _child(unsubscribed_client, "حديث")
    cid = child["id"]
    # session entry routes a never-diagnosed child to the diagnostic — FREE (no 402)
    s = unsubscribed_client.get(f"/api/students/{cid}/session")
    assert s.status_code == 200 and s.json()["needs_diagnostic"] is True
    # the diagnostic itself — probes + an adaptive step + the batch placement — all FREE
    assert unsubscribed_client.get(f"/api/students/{cid}/diagnostic/probes").status_code == 200
    step = unsubscribed_client.post(f"/api/students/{cid}/diagnostic/adaptive", json={"answers": []})
    assert step.status_code == 200 and step.json()["done"] is False    # a probe, not a paywall
    placed = unsubscribed_client.post(f"/api/students/{cid}/diagnostic", json={"answers": []})
    assert placed.status_code == 200                                    # result visible, free
    # …but TREATMENT is walled: questions for a paid skill → 402
    paid_id, q = _skill_q(admin_client, "B3")
    assert unsubscribed_client.get(f"/api/students/{cid}/skills/{paid_id}/questions").status_code == 402
    ans = unsubscribed_client.post("/api/answers", json={
        "student_id": cid, "question_id": q["id"], "answer": q["answer"], "elapsed_ms": 1000})
    assert ans.status_code == 402


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


# ---------- family tiers (step 7 part A: max_children + period) ----------
def test_plan_tiers_reflect_to_customer(admin_client, unsubscribed_client):
    """Owner sets max_children/period → reflected to the customer-facing /api/plans."""
    admin_client.post("/api/admin/plans", json={
        "name": "عائلية", "price": 5000, "trial_days": 0, "max_children": 3, "period": "yearly"})
    plans = unsubscribed_client.get("/api/plans").json()
    fam = next(p for p in plans if p["name"] == "عائلية")
    assert fam["max_children"] == 3 and fam["period"] == "yearly" and fam["price"] == 5000


def test_plan_defaults_single_monthly(admin_client):
    p = admin_client.post("/api/admin/plans", json={"name": "أساسية", "price": 2000}).json()
    assert p["max_children"] == 1 and p["period"] == "monthly"


def test_invalid_period_and_max_children_rejected(admin_client):
    assert admin_client.post("/api/admin/plans", json={
        "name": "x", "price": 1, "period": "weekly"}).status_code == 422
    assert admin_client.post("/api/admin/plans", json={
        "name": "y", "price": 1, "max_children": 0}).status_code == 422


def test_yearly_checkout_grants_longer_access(admin_client, unsubscribed_client, db):
    plan = admin_client.post("/api/admin/plans", json={
        "name": "سنوية", "price": 20000, "trial_days": 0, "period": "yearly"}).json()
    sub = unsubscribed_client.post("/api/subscription/checkout", json={"plan_id": plan["id"]}).json()
    assert sub["has_access"] is True
    until = datetime.fromisoformat(sub["access_until"])
    assert (until - datetime.now(timezone.utc)).days > 300        # ~365, not 30


def test_child_limit_enforced(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={
        "name": "فردية", "price": 2000, "trial_days": 0, "max_children": 1}).json()
    unsubscribed_client.post("/api/subscription/checkout", json={"plan_id": plan["id"]})
    first = _child(unsubscribed_client, "أول")
    assert "id" in first                                          # within the limit
    second = unsubscribed_client.post("/api/students", json={
        "name": "ثانٍ", "consent_version": consent.CURRENT_VERSION,
        "grade_id": [g["id"] for g in unsubscribed_client.get("/api/grades").json() if g["order"] == 2][0]})
    assert second.status_code == 403                              # over the plan's limit


def test_child_limit_allows_up_to_max(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={
        "name": "عائلية", "price": 5000, "trial_days": 0, "max_children": 3}).json()
    unsubscribed_client.post("/api/subscription/checkout", json={"plan_id": plan["id"]})
    for nm in ("أ", "ب", "ج"):
        assert "id" in _child(unsubscribed_client, nm)
    over = unsubscribed_client.post("/api/students", json={
        "name": "د", "consent_version": consent.CURRENT_VERSION,
        "grade_id": [g["id"] for g in unsubscribed_client.get("/api/grades").json() if g["order"] == 2][0]})
    assert over.status_code == 403


# ---------- manual payments: methods config + receipts + review (part B) ----------
_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
_PDF = "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK"


def _enable(admin_client, **kw):
    return admin_client.put("/api/admin/settings", json=kw)


def test_payment_methods_default_visa_on(guardian_client):
    info = guardian_client.get("/api/payment-info").json()
    assert info["visa"] is True and info["bank"]["on"] is False and info["phone"]["on"] is False


def test_owner_controls_visible_methods(admin_client, guardian_client):
    _enable(admin_client, pay_visa_on="", pay_bank_on="1", pay_bank="بنك مسقط — 123",
            pay_phone_on="1", pay_phone="96891234567")
    info = guardian_client.get("/api/payment-info").json()
    assert info["visa"] is False
    assert info["bank"]["on"] is True and info["bank"]["details"] == "بنك مسقط — 123"
    assert info["phone"]["on"] is True and info["phone"]["number"] == "96891234567"


def test_receipt_requires_enabled_method(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "ش", "price": 2000}).json()
    # bank not enabled → 400
    r = unsubscribed_client.post("/api/receipts", json={
        "plan_id": plan["id"], "method": "bank", "file": _IMG, "filename": "r.png"})
    assert r.status_code == 400


def test_receipt_upload_pending_then_approve_opens_wall(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={
        "name": "شهري", "price": 2000, "trial_days": 0, "period": "monthly"}).json()
    _enable(admin_client, pay_bank_on="1", pay_bank="بنك — حساب")
    # customer uploads a receipt → pending, no access yet
    up = unsubscribed_client.post("/api/receipts", json={
        "plan_id": plan["id"], "method": "bank", "file": _IMG, "filename": "إيصال.png"})
    assert up.status_code == 200 and up.json()["status"] == "pending"
    assert unsubscribed_client.get("/api/subscription").json()["has_access"] is False
    # admin sees it pending + can open the file
    pend = admin_client.get("/api/admin/receipts?status=pending").json()
    assert len(pend) == 1 and pend[0]["status"] == "pending"
    rid = pend[0]["id"]
    full = admin_client.get(f"/api/admin/receipts/{rid}").json()
    assert full["file"] == _IMG
    # approve → guardian gets access AND the child can reach paid content
    ap = admin_client.post(f"/api/admin/receipts/{rid}/approve")
    assert ap.status_code == 200 and ap.json()["status"] == "approved"
    assert unsubscribed_client.get("/api/subscription").json()["has_access"] is True
    skill_id, _ = _skill_q(admin_client, "B3")
    assert _questions(unsubscribed_client, skill_id).status_code == 200   # wall open for the child


def test_receipt_reject_shows_reason_no_access(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "ش", "price": 2000}).json()
    _enable(admin_client, pay_phone_on="1", pay_phone="96890000000")
    up = unsubscribed_client.post("/api/receipts", json={
        "plan_id": plan["id"], "method": "phone", "file": _PDF, "filename": "r.pdf"}).json()
    rid = up["id"]
    rej = admin_client.post(f"/api/admin/receipts/{rid}/reject", json={"note": "الإيصال غير واضح"})
    assert rej.status_code == 200 and rej.json()["status"] == "rejected"
    mine = unsubscribed_client.get("/api/receipts").json()
    assert mine[0]["status"] == "rejected" and mine[0]["note"] == "الإيصال غير واضح"
    assert unsubscribed_client.get("/api/subscription").json()["has_access"] is False


def test_receipt_rejects_non_image_pdf(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "ش", "price": 2000}).json()
    _enable(admin_client, pay_bank_on="1", pay_bank="x")
    bad = unsubscribed_client.post("/api/receipts", json={
        "plan_id": plan["id"], "method": "bank", "file": "data:text/plain;base64,aGk=", "filename": "x.txt"})
    assert bad.status_code == 422


def test_receipt_review_requires_admin(admin_client, guardian_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "ش", "price": 2000}).json()
    _enable(admin_client, pay_bank_on="1", pay_bank="x")
    up = unsubscribed_client.post("/api/receipts", json={
        "plan_id": plan["id"], "method": "bank", "file": _IMG}).json()
    assert guardian_client.post(f"/api/admin/receipts/{up['id']}/approve").status_code == 403


def test_receipt_double_review_blocked(admin_client, unsubscribed_client):
    plan = admin_client.post("/api/admin/plans", json={"name": "ش", "price": 2000}).json()
    _enable(admin_client, pay_bank_on="1", pay_bank="x")
    up = unsubscribed_client.post("/api/receipts", json={
        "plan_id": plan["id"], "method": "bank", "file": _IMG}).json()
    assert admin_client.post(f"/api/admin/receipts/{up['id']}/approve").status_code == 200
    assert admin_client.post(f"/api/admin/receipts/{up['id']}/approve").status_code == 409
