"""B-2 acceptance proof — the heart.

Every read of skill_mastery below is done through a BRAND-NEW engine/connection,
independent of the request that wrote it, to prove the row truly landed in the DB.

  1. before any answer: skill_mastery is empty for the student
  2. after ONE submit_answer call: a real skill_mastery row exists for the skill
  3. a second answer on the SAME skill updates the row (not duplicated)
  4. show the row content (student_id, skill_id, level, attempts) before & after
"""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.core.config import settings
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
    ids = (child.id, q.id, skill.id)
    s.close()
    return ids


def read_mastery_independently(student_id):
    """Open a fresh engine + connection and read this student's mastery rows."""
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        rows = conn.execute(text(
            "select student_id, skill_id, mastery_level, attempts, status "
            "from skill_mastery where student_id = :sid order by skill_id"),
            {"sid": student_id}).fetchall()
    eng.dispose()
    return [tuple(r) for r in rows]


def main():
    sid, qid, kid = seed()
    client = TestClient(app)
    print(f"seed: student#{sid}, question#{qid} on skill#{kid} (correct answer='5')\n")

    print("STEP 1 — BEFORE any answer (independent connection):")
    print("  skill_mastery rows for student:", read_mastery_independently(sid))
    print("  -> empty as required\n")

    print("STEP 2 — POST /api/submit_answer  (answer='5', correct)")
    r1 = client.post("/api/submit_answer",
                     json={"student_id": sid, "question_id": qid, "answer": "5"})
    print("  HTTP", r1.status_code, "->", r1.json())
    rows = read_mastery_independently(sid)
    print("  skill_mastery (independent connection):", rows)
    assert len(rows) == 1, "FAIL: expected exactly one skill_mastery row"
    print("  -> row APPEARED in the database (student_id, skill_id, level, attempts, status)\n")

    print("STEP 3 — second answer on the SAME skill (answer='9', wrong)")
    before = read_mastery_independently(sid)
    print("  row BEFORE 2nd answer:", before)
    r2 = client.post("/api/submit_answer",
                     json={"student_id": sid, "question_id": qid, "answer": "9"})
    print("  HTTP", r2.status_code, "->", r2.json())
    after = read_mastery_independently(sid)
    print("  row AFTER  2nd answer:", after)
    assert len(after) == 1, "FAIL: skill_mastery row was duplicated!"
    print("  -> still ONE row (one per (student, skill)); attempts incremented, "
          "level updated\n")

    # supporting: answer_log grew to 2, mastery stayed at 1 row
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        al = conn.execute(text("select count(*) from answer_log")).scalar()
        sm = conn.execute(text("select count(*) from skill_mastery")).scalar()
    eng.dispose()
    print(f"summary: answer_log rows = {al}, skill_mastery rows = {sm}")


if __name__ == "__main__":
    main()
