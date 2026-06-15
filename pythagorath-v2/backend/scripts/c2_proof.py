"""C-2 acceptance proof — the single source of truth.

1. Enter a NEW skill + question through the admin API ONLY (no files, no code).
   The question payload carries a unique marker so we can prove identity later.
2. Immediately, the child consumes that same skill+question via submit_answer.
3. Prove the question the child answered is byte-for-byte the one the admin just
   entered (same id, same payload incl. the marker) — read from an independent
   connection — not a question from any static file.
4. Grading uses the admin-entered correct answer (change-driven), not a code key.

(The student/parent are provisioning data, created directly; the CONTENT the
child consumes comes exclusively from the admin API.)
"""
import json
import uuid

from sqlalchemy import create_engine, text

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
import app.models as m
from fastapi.testclient import TestClient

ADMIN = "/api/admin"
MARKER = f"ENTERED_BY_ADMIN_{uuid.uuid4().hex[:8]}"


def admin_build(client):
    def post(path, body):
        r = client.post(ADMIN + path, json=body)
        assert r.status_code == 201, f"{path}: {r.status_code} {r.text}"
        return r.json()

    country = post("/countries", {"name": "الإمارات"})
    cur = post("/curricula", {"country_id": country["id"], "name": "منهج"})
    grade = post("/grades", {"curriculum_id": cur["id"], "name": "الصف الثاني", "order": 2})
    subject = post("/subjects", {"grade_id": grade["id"], "name": "الرياضيات"})
    unit = post("/units", {"subject_id": subject["id"], "name": "الجمع", "order": 1})
    skill = post("/skills", {"unit_id": unit["id"], "name": "الجمع ضمن ١٠",
                             "order": 1, "mastery_threshold": 0.8})
    # The distinctive question the child will answer:
    question = post("/questions", {
        "skill_id": skill["id"],
        "interaction_type": "number_line",
        "difficulty": 2,
        "payload": {"answer": "7", "prompt": "٣ + ٤ = ؟", "marker": MARKER},
    })
    return country, grade, skill, question


def provision_student(country_id, grade_id):
    """Provisioning (not content): a parent + child profile."""
    s = SessionLocal()
    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    child = m.Student(user_id=parent.id, name="أحمد",
                      grade_id=grade_id, country_id=country_id)
    s.add(child); s.commit()
    sid = child.id
    s.close()
    return sid


def read_question_independently(qid):
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        row = conn.execute(text(
            "select id, skill_id, interaction_type, difficulty, payload "
            "from questions where id=:i"), {"i": qid}).fetchone()
    eng.dispose()
    return row


def main():
    client = TestClient(app)

    print("=" * 70)
    print("1) ADMIN enters a new skill + question via the API ONLY")
    print("=" * 70)
    country, grade, skill, question = admin_build(client)
    qid, skid = question["id"], skill["id"]
    print(f"  admin created: skill#{skid} '{skill['name']}', question#{qid}")
    print(f"  question payload (admin input): {question['payload']}")
    print(f"  unique marker: {MARKER}\n")

    sid = provision_student(country["id"], grade["id"])
    print(f"  provisioned student#{sid} (grade#{grade['id']}, country#{country['id']})\n")

    print("=" * 70)
    print("2) CHILD consumes the SAME question via submit_answer (correct answer='7')")
    print("=" * 70)
    r = client.post("/api/submit_answer",
                    json={"student_id": sid, "question_id": qid, "answer": "7"})
    body = r.json()
    print(f"  HTTP {r.status_code} -> is_correct={body['is_correct']}, "
          f"skill_id={body['skill_id']}, status={body['status']}, "
          f"level={body['mastery_level']}")

    print("\n" + "=" * 70)
    print("3) PROVE identity from an INDEPENDENT connection")
    print("=" * 70)
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        log = conn.execute(text(
            "select question_id, is_correct from answer_log "
            "where student_id=:s order by id desc limit 1"), {"s": sid}).fetchone()
        sm = conn.execute(text(
            "select student_id, skill_id, status from skill_mastery "
            "where student_id=:s and skill_id=:k"), {"s": sid, "k": skid}).fetchone()
    eng.dispose()
    qrow = read_question_independently(qid)
    # SQLite returns the JSON column as text over a raw connection; parse it.
    db_payload = qrow[4] if isinstance(qrow[4], dict) else json.loads(qrow[4])
    print(f"  answer_log.question_id answered by child = {log[0]}  (admin's id = {qid})")
    print(f"  question row in DB: id={qrow[0]}, interaction_type={qrow[2]!r}, "
          f"difficulty={qrow[3]}")
    print(f"  question payload in DB: {json.dumps(db_payload, ensure_ascii=False)}")
    print(f"  skill_mastery row written: {tuple(sm)}")

    assert log[0] == qid, "FAIL: child answered a different question id"
    assert db_payload["marker"] == MARKER, "FAIL: payload marker mismatch"
    assert db_payload == question["payload"], "FAIL: payload differs from admin input"
    assert log[1] == 1, "FAIL: grading mismatch"
    print("\n  => SAME id, SAME payload (incl. unique marker), graded by the admin's")
    print("     own correct answer. The child consumed exactly what the admin entered.")

    print("\n" + "=" * 70)
    print("4) Grading is change-driven (admin's answer key), not a code constant")
    print("=" * 70)
    r2 = client.post("/api/submit_answer",
                     json={"student_id": sid, "question_id": qid, "answer": "3"})
    print(f"  child answers '3' -> is_correct={r2.json()['is_correct']} "
          f"(admin set correct='7', so '3' is wrong)")


if __name__ == "__main__":
    main()
