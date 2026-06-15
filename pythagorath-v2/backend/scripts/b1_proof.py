"""B-1 acceptance proof.

Make a REAL HTTP call to POST /api/submit_answer and show that one call writes
exactly one new row into answer_log.
"""
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import SessionLocal
from app.main import app
import app.models as m


def seed():
    s = SessionLocal()
    c = m.Country(name="الإمارات"); s.add(c); s.flush()
    cur = m.Curriculum(country_id=c.id, name="منهج"); s.add(cur); s.flush()
    g = m.Grade(curriculum_id=cur.id, name="الصف الثاني", order=2); s.add(g); s.flush()
    sub = m.Subject(grade_id=g.id, name="الرياضيات"); s.add(sub); s.flush()
    u = m.Unit(subject_id=sub.id, name="الجمع والطرح", order=1); s.add(u); s.flush()
    skill = m.Skill(unit_id=u.id, name="الجمع ضمن ١٠", order=1, mastery_threshold=0.8)
    s.add(skill); s.flush()
    q = m.Question(skill_id=skill.id, interaction_type="count",
                   difficulty=1, payload={"answer": "5"})
    s.add(q); s.flush()
    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    child = m.Student(user_id=parent.id, name="أحمد", grade_id=g.id, country_id=c.id)
    s.add(child); s.commit()
    ids = (child.id, q.id)
    s.close()
    return ids


def answer_log_count():
    s = SessionLocal()
    n = s.execute(text("select count(*) from answer_log")).scalar()
    s.close()
    return n


def dump_rows():
    s = SessionLocal()
    rows = s.execute(text(
        "select id, student_id, question_id, is_correct, timestamp "
        "from answer_log order by id")).fetchall()
    s.close()
    return rows


def main():
    sid, qid = seed()
    client = TestClient(app)
    print(f"seed: student#{sid}, question#{qid} (correct answer = '5')\n")

    print("answer_log rows BEFORE any call:", answer_log_count())

    print("\n>>> CALL 1: POST /api/submit_answer  (answer='5', correct)")
    r1 = client.post("/api/submit_answer",
                     json={"student_id": sid, "question_id": qid, "answer": "5"})
    print("    HTTP", r1.status_code, "->", r1.json())
    print("    answer_log rows AFTER call 1:", answer_log_count())

    print("\n>>> CALL 2: POST /api/submit_answer  (answer='9', wrong)")
    r2 = client.post("/api/submit_answer",
                     json={"student_id": sid, "question_id": qid, "answer": "9"})
    print("    HTTP", r2.status_code, "->", r2.json())
    print("    answer_log rows AFTER call 2:", answer_log_count())

    print("\nactual answer_log rows now in the database:")
    for row in dump_rows():
        print("   ", tuple(row))

    print("\n>>> NEGATIVE: POST with non-existent student -> 404, no row written")
    before = answer_log_count()
    r3 = client.post("/api/submit_answer",
                     json={"student_id": 999999, "question_id": qid, "answer": "5"})
    print("    HTTP", r3.status_code, "->", r3.json())
    print(f"    answer_log unchanged: before={before}, after={answer_log_count()}")


if __name__ == "__main__":
    main()
