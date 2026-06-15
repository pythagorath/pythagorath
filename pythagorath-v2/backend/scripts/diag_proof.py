"""Diagnostic (11-ط) acceptance proof.

1. Diagnostic pulls REAL questions from the questions table matching the
   student's grade/subject — verified from an independent connection.
2. No static FALLBACK list exists (proven by searching the source separately).
3. A subject with no questions returns an EXPLICIT empty result — it does NOT
   drop onto fixed, inappropriate questions (the old project's bug).
"""
from sqlalchemy import create_engine, text

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
import app.models as m
from fastapi.testclient import TestClient

ADMIN = "/api/admin"


def post(client, path, body):
    r = client.post(ADMIN + path, json=body)
    assert r.status_code == 201, f"{path}: {r.status_code} {r.text}"
    return r.json()


def build(client):
    country = post(client, "/countries", {"name": "الإمارات"})
    cur = post(client, "/curricula", {"country_id": country["id"], "name": "منهج"})
    grade = post(client, "/grades", {"curriculum_id": cur["id"], "name": "الصف الثاني", "order": 2})

    # Subject MATH: 2 skills, 7 questions total (admin-entered).
    math = post(client, "/subjects", {"grade_id": grade["id"], "name": "الرياضيات"})
    u1 = post(client, "/units", {"subject_id": math["id"], "name": "الجمع", "order": 1})
    sa = post(client, "/skills", {"unit_id": u1["id"], "name": "الجمع ضمن ١٠", "order": 1, "mastery_threshold": 0.8})
    sb = post(client, "/skills", {"unit_id": u1["id"], "name": "الجمع بحمل", "order": 2, "mastery_threshold": 0.8})
    for i in range(3):
        post(client, "/questions", {"skill_id": sa["id"], "interaction_type": "count",
                                    "difficulty": i + 1, "payload": {"answer": str(i)}})
    for i in range(4):
        post(client, "/questions", {"skill_id": sb["id"], "interaction_type": "drag",
                                    "difficulty": i + 1, "payload": {"answer": str(i)}})

    # Subject SCIENCE under the same grade with a skill but ZERO questions.
    sci = post(client, "/subjects", {"grade_id": grade["id"], "name": "العلوم"})
    u2 = post(client, "/units", {"subject_id": sci["id"], "name": "الكائنات", "order": 1})
    post(client, "/skills", {"unit_id": u2["id"], "name": "الحواس", "order": 1, "mastery_threshold": 0.8})

    return country["id"], grade["id"], math["id"], sci["id"]


def provision_student(country_id, grade_id):
    s = SessionLocal()
    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    child = m.Student(user_id=parent.id, name="أحمد", grade_id=grade_id, country_id=country_id)
    s.add(child); s.commit()
    sid = child.id
    s.close()
    return sid


def db_question_ids_for_subject(subject_id):
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        ids = conn.execute(text(
            "select q.id from questions q "
            "join skills s on s.id = q.skill_id "
            "join units u on u.id = s.unit_id "
            "where u.subject_id = :sub order by q.id"), {"sub": subject_id}).scalars().all()
    eng.dispose()
    return set(ids)


def main():
    client = TestClient(app)
    country_id, grade_id, math_id, sci_id = build(client)
    sid = provision_student(country_id, grade_id)
    print(f"setup: student#{sid} grade#{grade_id}; MATH subject#{math_id} (7 Qs), "
          f"SCIENCE subject#{sci_id} (0 Qs)\n")

    print("=" * 70)
    print("1) DIAGNOSTIC for MATH -> real questions from the DB (grade/subject match)")
    print("=" * 70)
    r = client.get(f"/api/diagnostic?student_id={sid}&subject_id={math_id}")
    body = r.json()
    returned_ids = [q["id"] for q in body["questions"]]
    print(f"  HTTP {r.status_code}; count={body['count']}")
    for q in body["questions"]:
        print(f"    question#{q['id']} skill#{q['skill_id']} "
              f"type={q['interaction_type']!r} diff={q['difficulty']}")
    db_ids = db_question_ids_for_subject(math_id)
    print(f"\n  (independent) question ids in DB for MATH: {sorted(db_ids)}")
    print(f"  returned diagnostic ids:                  {sorted(returned_ids)}")
    assert 5 <= body["count"] <= 7, "FAIL: diagnostic size out of 5–7"
    assert set(returned_ids) <= db_ids, "FAIL: a returned question is not in the DB subject!"
    assert set(returned_ids) == db_ids, "FAIL: returned set != DB set"
    print("  => every diagnostic question is a real DB row for this grade/subject.\n")

    print("=" * 70)
    print("2) DIAGNOSTIC for SCIENCE (no questions) -> EXPLICIT empty, no fallback")
    print("=" * 70)
    r = client.get(f"/api/diagnostic?student_id={sid}&subject_id={sci_id}")
    body = r.json()
    print(f"  HTTP {r.status_code}; count={body['count']}; questions={body['questions']}")
    assert body["count"] == 0 and body["questions"] == [], \
        "FAIL: expected explicit empty result"
    print("  => empty result returned explicitly. It did NOT fall back to static")
    print("     questions (the old project's diagnostic bug).")


if __name__ == "__main__":
    main()
