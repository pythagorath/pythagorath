"""Country-path ENFORCEMENT at the API boundary — structural, not UI-only.

A child may only be served / answer / inspect nodes IN their country curriculum. The
path refusal (403, detail.reason='path') is STRUCTURALLY distinct from the lock
(403, detail.reason='locked') and the paywall (402) — so the frontend never confuses
"not in your curriculum" with "master the prerequisite first". Answering an out-of-path
node is refused BEFORE any state write (no progress pollution in the report/reviews).
"""
from datetime import datetime, timezone

from sqlalchemy import select

from app import consent
from app.main import _path_skills
from app.models import Answer, SkillMastery, Student


def _qa_child(client):
    return client.post("/api/students", json={
        "name": "ق", "country": "QA", "consent_version": consent.CURRENT_VERSION,
        "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}).json()


def _null_child(client, name="ن"):
    return client.post("/api/students", json={
        "name": name, "consent_version": consent.CURRENT_VERSION,
        "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}).json()


def _pub_q(node):
    return next(q for q in node["questions"] if q["status"] == "published")


def _node(admin_client, code):
    return next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == code)


def _split(db, admin_client):
    """(in_path_node, out_of_path_node) for a QA child — E1 (base, in every path) vs the
    first node QA's curriculum does NOT include (with a published question to answer)."""
    path_ids = {s.id for s in _path_skills(db, Student(name="x", country="QA"))}
    nodes = admin_client.get("/api/admin/nodes").json()
    in_node = next(n for n in nodes if n["code"] == "E1")
    out_node = next(n for n in nodes if n["id"] not in path_ids
                    and any(q["status"] == "published" for q in n["questions"]))
    return in_node, out_node


def test_questions_enforce_path(guardian_client, admin_client, db):
    cid = _qa_child(guardian_client)["id"]
    in_node, out_node = _split(db, admin_client)
    r_out = guardian_client.get(f"/api/students/{cid}/skills/{out_node['id']}/questions")
    assert r_out.status_code == 403 and r_out.json()["detail"]["reason"] == "path"
    assert guardian_client.get(
        f"/api/students/{cid}/skills/{in_node['id']}/questions").status_code == 200


def test_answers_enforce_path_no_pollution(guardian_client, admin_client, db):
    cid = _qa_child(guardian_client)["id"]
    in_node, out_node = _split(db, admin_client)
    oq = _pub_q(out_node)
    r = guardian_client.post("/api/answers", json={
        "student_id": cid, "question_id": oq["id"], "answer": oq["answer"], "elapsed_ms": 1000})
    assert r.status_code == 403 and r.json()["detail"]["reason"] == "path"
    # NO state written for the out-of-path node (no pollution surfacing in report/reviews)
    assert db.get(SkillMastery, (cid, out_node["id"])) is None
    assert db.execute(select(Answer).where(
        Answer.student_id == cid, Answer.question_id == oq["id"])).scalars().first() is None
    # the in-path base node answers normally (E1 is unlocked)
    iq = _pub_q(in_node)
    assert guardian_client.post("/api/answers", json={
        "student_id": cid, "question_id": iq["id"], "answer": iq["answer"], "elapsed_ms": 1000}
    ).status_code == 200


def test_progress_enforces_path(guardian_client, admin_client, db):
    cid = _qa_child(guardian_client)["id"]
    in_node, out_node = _split(db, admin_client)
    assert guardian_client.get(
        f"/api/students/{cid}/skills/{out_node['id']}/progress").status_code == 403
    assert guardian_client.get(
        f"/api/students/{cid}/skills/{in_node['id']}/progress").status_code == 200


def test_reviews_exclude_out_of_path(guardian_client, admin_client, db):
    cid = _qa_child(guardian_client)["id"]
    _, out_node = _split(db, admin_client)
    # a stale mastered row on an out-of-path node must NOT surface in this child's reviews
    db.add(SkillMastery(student_id=cid, skill_id=out_node["id"], status="mastered",
                        next_review_at=datetime.now(timezone.utc)))
    db.commit()
    rv = guardian_client.get(f"/api/students/{cid}/reviews").json()
    assert all(m["skill_id"] != out_node["id"] for m in rv["mastered"])
    assert out_node["id"] not in rv["due_skill_ids"]


def test_three_refusals_structurally_distinct(guardian_client, unsubscribed_client, admin_client, db):
    """path (403 reason=path) ≠ lock (403 reason=locked) ≠ paywall (402)."""
    # PATH — subscribed guardian, QA child, out-of-path node (path is checked first)
    cid = _qa_child(guardian_client)["id"]
    _, out_node = _split(db, admin_client)
    oq = _pub_q(out_node)
    path = guardian_client.post("/api/answers", json={
        "student_id": cid, "question_id": oq["id"], "answer": oq["answer"], "elapsed_ms": 1000})
    # LOCK — subscribed guardian, NULL child, a locked node (A1 needs prerequisites)
    nc = _null_child(guardian_client)["id"]
    aq = _pub_q(_node(admin_client, "A1"))
    lock = guardian_client.post("/api/answers", json={
        "student_id": nc, "question_id": aq["id"], "answer": aq["answer"], "elapsed_ms": 1000})
    # PAYWALL — unsubscribed guardian, NULL child, paid unlocked node (B3)
    pc = _null_child(unsubscribed_client, "p")["id"]
    bq = _pub_q(_node(admin_client, "B3"))
    pay = unsubscribed_client.post("/api/answers", json={
        "student_id": pc, "question_id": bq["id"], "answer": bq["answer"], "elapsed_ms": 1000})

    assert path.status_code == 403 and path.json()["detail"]["reason"] == "path"
    assert lock.status_code == 403 and lock.json()["detail"]["reason"] == "locked"
    assert pay.status_code == 402
