"""B-4 acceptance proof — the prerequisite lock/unlock gate.

Skill B requires skill A (skill_prerequisites, built in A-3).

1. While A is not mastered, B is LOCKED: POST /api/submit_answer on B is rejected
   by the server (403) and nothing is written.
2. After A is mastered, B UNLOCKS: the same call now succeeds.
3. The transition is read from an INDEPENDENT connection using the real engine
   logic (unmet_prerequisites): B locked (unmet=[A]) -> master A -> B open (unmet=[]).
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
from app.services.mastery_engine import unmet_prerequisites
import app.models as m
from fastapi.testclient import TestClient

CORRECT = "5"


def seed():
    s = SessionLocal()
    c = m.Country(name="الإمارات"); s.add(c); s.flush()
    cur = m.Curriculum(country_id=c.id, name="منهج"); s.add(cur); s.flush()
    g = m.Grade(curriculum_id=cur.id, name="الصف الثاني", order=2); s.add(g); s.flush()
    sub = m.Subject(grade_id=g.id, name="الرياضيات"); s.add(sub); s.flush()
    u = m.Unit(subject_id=sub.id, name="الجمع والطرح", order=1); s.add(u); s.flush()
    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    child = m.Student(user_id=parent.id, name="أحمد", grade_id=g.id, country_id=c.id)
    s.add(child); s.flush()

    A = m.Skill(unit_id=u.id, name="الجمع ضمن ١٠", order=1, mastery_threshold=0.8)
    B = m.Skill(unit_id=u.id, name="الجمع بحمل", order=2, mastery_threshold=0.8)
    s.add_all([A, B]); s.flush()
    qa = m.Question(skill_id=A.id, interaction_type="count", difficulty=1,
                    payload={"answer": CORRECT}); s.add(qa); s.flush()
    qb = m.Question(skill_id=B.id, interaction_type="count", difficulty=1,
                    payload={"answer": CORRECT}); s.add(qb); s.flush()
    # B requires A
    s.add(m.SkillPrerequisite(skill_id=B.id, prerequisite_skill_id=A.id))
    s.commit()
    ids = (child.id, A.id, qa.id, B.id, qb.id)
    s.close()
    return ids


def independent_lock_view(student_id, a_id, b_id):
    """Fresh connection + real engine logic."""
    eng = create_engine(settings.database_url)
    s = sessionmaker(bind=eng)()
    a_status = s.execute(text(
        "select status from skill_mastery where student_id=:s and skill_id=:k"),
        {"s": student_id, "k": a_id}).scalar()
    b_unmet = unmet_prerequisites(s, student_id, b_id)
    s.close(); eng.dispose()
    return a_status, b_unmet


def answer_log_count_for(question_id):
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        n = conn.execute(text(
            "select count(*) from answer_log where question_id=:q"),
            {"q": question_id}).scalar()
    eng.dispose()
    return n


def main():
    sid, a_id, qa, b_id, qb = seed()
    client = TestClient(app)
    print(f"seed: student#{sid}; skill A#{a_id}; skill B#{b_id} (B requires A)\n")

    print("=" * 68)
    print("STEP 1 — A not mastered => B is LOCKED")
    print("=" * 68)
    a_status, b_unmet = independent_lock_view(sid, a_id, b_id)
    print(f"  (independent) A status = {a_status!r}; B unmet prerequisites = {b_unmet}")
    print("  >>> POST submit_answer on B (locked):")
    r = client.post("/api/submit_answer",
                    json={"student_id": sid, "question_id": qb, "answer": CORRECT})
    print(f"      HTTP {r.status_code} -> {r.json()}")
    print(f"      answer_log rows for B's question: {answer_log_count_for(qb)} "
          f"(nothing written)\n")

    print("=" * 68)
    print("STEP 2 — master A (5 correct answers); A is unlocked (no prerequisites)")
    print("=" * 68)
    for _ in range(5):
        client.post("/api/submit_answer",
                    json={"student_id": sid, "question_id": qa, "answer": CORRECT})
    a_status, b_unmet = independent_lock_view(sid, a_id, b_id)
    print(f"  (independent) A status = {a_status!r}; B unmet prerequisites = {b_unmet}")

    print("\n" + "=" * 68)
    print("STEP 3 — B is now UNLOCKED => same call on B SUCCEEDS")
    print("=" * 68)
    r = client.post("/api/submit_answer",
                    json={"student_id": sid, "question_id": qb, "answer": CORRECT})
    print(f"  >>> POST submit_answer on B: HTTP {r.status_code} -> {r.json()}")
    print(f"      answer_log rows for B's question now: {answer_log_count_for(qb)}")
    a_status, b_unmet = independent_lock_view(sid, a_id, b_id)
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        b_status = conn.execute(text(
            "select status from skill_mastery where student_id=:s and skill_id=:k"),
            {"s": sid, "k": b_id}).scalar()
    eng.dispose()
    print(f"      (independent) B unmet now = {b_unmet}; B status = {b_status!r}")
    print("\n  => B went LOCKED (rejected) -> mastered A -> B OPEN (accepted).")


if __name__ == "__main__":
    main()
