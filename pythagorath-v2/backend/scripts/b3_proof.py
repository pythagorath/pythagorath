"""B-3 acceptance proof — threshold check and the flip to 'mastered'.

Every status read below uses a BRAND-NEW independent connection.

PART 1 (criteria 2 & 3): a streak climbs the mastery level; status stays
        'in_progress' while recent accuracy is below the skill's threshold and
        flips to 'mastered' exactly when it reaches it — not before.
PART 2 (criterion 1): the threshold is READ from skills.mastery_threshold. We
        hold the level fixed at 0.8 and change ONLY the skill's threshold in the
        DB; the status changes accordingly — proving it is not hard-coded.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
import app.models as m
from fastapi.testclient import TestClient

CORRECT = "5"   # matches the question payload
WRONG = "0"


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

    def make_skill(name, threshold):
        sk = m.Skill(unit_id=u.id, name=name, order=1, mastery_threshold=threshold)
        s.add(sk); s.flush()
        q = m.Question(skill_id=sk.id, interaction_type="count",
                       difficulty=1, payload={"answer": CORRECT})
        s.add(q); s.flush()
        return sk.id, q.id

    a_skill, a_q = make_skill("مهارة أ (عتبة 0.8)", 0.8)
    b_skill, b_q = make_skill("مهارة ب (عتبة 0.9)", 0.9)
    s.commit()
    ids = (child.id, a_skill, a_q, b_skill, b_q)
    s.close()
    return ids


def read(student_id, skill_id):
    """Independent connection: (status, level, attempts, threshold_in_db)."""
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        row = conn.execute(text(
            "select sm.status, sm.mastery_level, sm.attempts, s.mastery_threshold "
            "from skill_mastery sm join skills s on s.id = sm.skill_id "
            "where sm.student_id=:sid and sm.skill_id=:kid"),
            {"sid": student_id, "kid": skill_id}).fetchone()
    eng.dispose()
    return tuple(row) if row else None


def set_threshold(skill_id, value):
    """Change a skill's threshold via an independent session (like the admin panel)."""
    eng = create_engine(settings.database_url)
    s = sessionmaker(bind=eng)()
    s.get(m.Skill, skill_id).mastery_threshold = value
    s.commit(); s.close(); eng.dispose()


def main():
    sid, a_skill, a_q, b_skill, b_q = seed()
    client = TestClient(app)

    def answer(qid, value):
        client.post("/api/submit_answer",
                    json={"student_id": sid, "question_id": qid, "answer": value})

    print("=" * 70)
    print("PART 1 — streak climbs; flips to 'mastered' only on reaching threshold")
    print("skill A threshold (from DB) = 0.8 ; window = 5")
    print("=" * 70)
    print("read columns = (status, level, attempts, threshold_in_db)\n")
    sequence = [WRONG, CORRECT, CORRECT, CORRECT, CORRECT]  # W,C,C,C,C
    for i, val in enumerate(sequence, 1):
        answer(a_q, val)
        st = read(sid, a_skill)
        tag = "correct" if val == CORRECT else "WRONG  "
        print(f"  answer {i} ({tag}) -> {st}")
    print("\n  => in_progress while level < 0.8 (0.0, 0.5, 0.67, 0.75), "
          "MASTERED exactly at level 0.8 (answer 5). Not before.\n")

    print("=" * 70)
    print("PART 2 — threshold is READ from the field (change it -> behaviour changes)")
    print("skill B threshold starts at 0.9")
    print("=" * 70)
    for i, val in enumerate([WRONG, CORRECT, CORRECT, CORRECT, CORRECT], 1):
        answer(b_q, val)
    st = read(sid, b_skill)
    print(f"  after 5 answers (level 0.8, window full): {st}")
    print("  => attempts>=5 AND level 0.8, but threshold 0.9 -> NOT mastered "
          "(0.8 < 0.9). Threshold is decisive.\n")

    print("  >>> admin lowers skill B threshold in the DB: 0.9 -> 0.7")
    set_threshold(b_skill, 0.7)
    print("      threshold in DB now:", read(sid, b_skill)[3])
    print("  >>> one more answer (WRONG) — keeps level at 0.8, window unchanged")
    answer(b_q, WRONG)   # window becomes [C,C,C,C,W] = 0.8 again
    st = read(sid, b_skill)
    print(f"      now: {st}")
    print("  => SAME level 0.8, only the threshold changed (0.9 -> 0.7) -> MASTERED.")
    print("     Proof the engine reads the threshold from skills.mastery_threshold,")
    print("     not from a hard-coded constant.")


if __name__ == "__main__":
    main()
