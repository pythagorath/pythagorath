"""Parent dashboard — read-only progress, ownership-scoped."""
from app import consent


def _child(guardian_client, name="طفل"):
    return guardian_client.post(
        "/api/students", json={"name": name, "consent_version": consent.CURRENT_VERSION,
                               "grade_id": [g["id"] for g in guardian_client.get("/api/grades").json() if g["order"] == 2][0]}
    ).json()


def test_owner_sees_report_structure(guardian_client):
    sid = _child(guardian_client)["id"]
    r = guardian_client.get(f"/api/students/{sid}/report")
    assert r.status_code == 200
    body = r.json()
    assert body["child"]["id"] == sid
    t = body["totals"]
    # 66 = 56 (S1) + 3 (b1) + 3 (b2) + 4 (b3: Q4,Q5,DA4,V4). NULL country → WHOLE.
    assert t["nodes"] == 66
    assert t["mastered"] + t["understood"] + t["available"] + t["locked"] == 66   # partition
    assert len(body["skills"]) == 66
    # a brand-new child: nothing mastered/understood, some base nodes available
    assert t["mastered"] == 0 and t["understood"] == 0 and t["available"] >= 1


def test_report_reflects_mastery(guardian_client, admin_client):
    node = next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == "B3")
    ans = {q["id"]: q["answer"] for q in node["questions"]}
    sid = _child(guardian_client, "متعلم")["id"]

    def submit(qid, ms):
        return guardian_client.post("/api/answers", json={
            "student_id": sid, "question_id": qid, "answer": ans[qid], "elapsed_ms": ms})

    fams = {}
    for q in node["questions"]:
        fams.setdefault(q["family"], q)
    fl = list(fams.values())
    submit(fl[0]["id"], 1000)
    submit(fl[1]["id"], 1000)
    qids = [q["id"] for q in node["questions"]]
    for i in range(5):
        submit(qids[i % len(qids)], 1200)

    rep = guardian_client.get(f"/api/students/{sid}/report").json()
    assert rep["totals"]["mastered"] >= 1
    b3 = next(s for s in rep["skills"] if s["code"] == "B3")
    assert b3["status"] == "mastered" and "أتقن" in b3["label"]


def test_other_guardian_cannot_see_report_403(guardian_client, other_guardian_client):
    sid = _child(guardian_client)["id"]
    assert other_guardian_client.get(f"/api/students/{sid}/report").status_code == 403


def test_unauthenticated_report_401(anon_client, guardian_client):
    sid = _child(guardian_client)["id"]
    assert anon_client.get(f"/api/students/{sid}/report").status_code == 401
