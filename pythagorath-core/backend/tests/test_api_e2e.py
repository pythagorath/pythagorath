"""End-to-end: mastery flow, lock, durability, country phrasing — all under auth.

A GUARDIAN client drives the child's learning; an ADMIN client reads/authors content."""
from datetime import datetime, timedelta, timezone

from app import consent


def _node(admin_client, code):
    return next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == code)


def _new_child(guardian_client, name, country=None):
    return guardian_client.post(
        "/api/students",
        json={"name": name, "country": country, "consent_version": consent.CURRENT_VERSION,
              "grade_id": [g["id"] for g in guardian_client.get("/api/grades").json() if g["order"] == 2][0]},
    ).json()


def _mastery_flow(guardian_client, admin_client, code="B3"):
    node = _node(admin_client, code)
    ans = {q["id"]: q["answer"] for q in node["questions"]}
    stu = _new_child(guardian_client, f"e2e_{code}")

    def submit(qid, ms):
        return guardian_client.post("/api/answers", json={
            "student_id": stu["id"], "question_id": qid, "answer": ans[qid], "elapsed_ms": ms,
        }).json()

    fams = {}
    for q in node["questions"]:
        fams.setdefault(q["family"], q)
    fam_first = list(fams.values())
    submit(fam_first[0]["id"], 1000)
    understood = submit(fam_first[1]["id"], 1000)
    qids = [q["id"] for q in node["questions"]]
    last = None
    for i in range(5):
        last = submit(qids[i % len(qids)], 1200)
    return stu, node, understood, last


def test_full_mastery_flow(guardian_client, admin_client):
    _, _, understood, last = _mastery_flow(guardian_client, admin_client)
    assert understood["status"] == "understood"
    assert last["status"] == "mastered"
    assert last["is_correct"] is True


def test_locked_skill_is_403(guardian_client, admin_client):
    a1 = _node(admin_client, "A1")          # has prerequisites → locked
    q = a1["questions"][0]
    stu = _new_child(guardian_client, "locked")
    r = guardian_client.post("/api/answers", json={
        "student_id": stu["id"], "question_id": q["id"], "answer": q["answer"], "elapsed_ms": 1000,
    })
    assert r.status_code == 403
    assert r.json()["detail"]["reason"] == "locked"   # structural tag, not the lock vs path message


def test_reviews_endpoint_reflects_schedule(guardian_client, admin_client):
    stu, node, _, _ = _mastery_flow(guardian_client, admin_client)
    now = guardian_client.get(f"/api/students/{stu['id']}/reviews").json()
    assert now["due_skill_ids"] == []
    future = (datetime.now(timezone.utc) + timedelta(days=999)).isoformat()
    later = guardian_client.get(f"/api/students/{stu['id']}/reviews", params={"at": future}).json()
    assert node["id"] in later["due_skill_ids"]


def test_country_phrasing_shown_to_child(guardian_client, admin_client):
    # The phrasing MECHANISM, proven through the DUAL-MODE path. The whole
    # inventory now generates (m3), so C1's generators are temporarily
    # de-registered for this test. For GENERATOR-backed serving the wording comes
    # from the generator, so template phrasing doesn't reach the child — a DECLARED
    # debt of the live-variation conversion (variation_audit.md: country wording
    # will move into generator params, the currency-debt path).
    from app import generators
    _saved = generators.REGISTRY.pop("C1", None)
    try:
        _phrasing_flow(guardian_client, admin_client)
    finally:
        if _saved is not None:
            generators.REGISTRY["C1"] = _saved


def _phrasing_flow(guardian_client, admin_client):
    a3 = _node(admin_client, "C1")   # C1: all-six (dual-mode for this test)
    created = admin_client.post(f"/api/admin/skills/{a3['id']}/questions", json={
        "family": "decompositional", "prompt": "فكِّك: ٤٧ = ٤٠ + ؟", "answer": "٧",
        "visual": {"kind": "decomposition", "mode": "expand", "whole": 47, "tens": 40},
    }).json()
    admin_client.put(f"/api/admin/questions/{created['id']}/phrasing/QA", json={"prompt": "صياغة قطرية ٤٧"})
    admin_client.post(f"/api/admin/questions/{created['id']}/publish")
    # Wording follows the CHILD's own country (no spoofable query param). C1 ∈ all six paths.
    qa_child = _new_child(guardian_client, "qa", "QA")
    om_child = _new_child(guardian_client, "om", "OM")
    qa = guardian_client.get(f"/api/students/{qa_child['id']}/skills/{a3['id']}/questions").json()
    om = guardian_client.get(f"/api/students/{om_child['id']}/skills/{a3['id']}/questions").json()
    assert next(q for q in qa if q["id"] == created["id"])["prompt"] == "صياغة قطرية ٤٧"
    assert next(q for q in om if q["id"] == created["id"])["prompt"] == "فكِّك: ٤٧ = ٤٠ + ؟"
