"""B-5 acceptance proof — next-question selection + full response.

Skills in one unit:  A (order 1) -> B (order 2, requires A) -> C (order 3, requires B).
A and B have 2 questions each, C has 1.

The full response carries: result (is_correct) + progress (status/level/attempts)
+ next_question. The SERVER decides the next question:
  * while a skill is not mastered -> next question is from the SAME skill
  * when a skill becomes mastered -> next question is from the next OPEN skill
    (B, not the still-locked C)
"""
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
import app.models as m
from fastapi.testclient import TestClient

CORRECT = "5"
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

    def skill(name, order, thr):
        sk = m.Skill(unit_id=u.id, name=name, order=order, mastery_threshold=thr)
        s.add(sk); s.flush()
        return sk.id

    A = skill("الجمع ضمن ١٠", 1, 0.8)
    B = skill("الجمع بحمل", 2, 0.8)
    C = skill("الطرح بحمل", 3, 0.8)

    def q(skill_id):
        qq = m.Question(skill_id=skill_id, interaction_type="count",
                        difficulty=1, payload={"answer": CORRECT})
        s.add(qq); s.flush()
        return qq.id

    qa1, qa2 = q(A), q(A)
    qb1, qb2 = q(B), q(B)
    qc1 = q(C)
    s.add(m.SkillPrerequisite(skill_id=B, prerequisite_skill_id=A))
    s.add(m.SkillPrerequisite(skill_id=C, prerequisite_skill_id=B))
    s.commit()
    ids = dict(sid=child.id, A=A, B=B, C=C, qa1=qa1, qa2=qa2, qb1=qb1, qc1=qc1)
    s.close()
    return ids


def skill_name(skill_id):
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        n = conn.execute(text("select name from skills where id=:i"),
                         {"i": skill_id}).scalar()
    eng.dispose()
    return n


def main():
    ids = seed()
    sid, A, B, C = ids["sid"], ids["A"], ids["B"], ids["C"]
    client = TestClient(app)
    print(f"seed: student#{sid}; A#{A} -> B#{B} (req A) -> C#{C} (req B)\n")

    def submit(qid, value):
        r = client.post("/api/submit_answer",
                        json={"student_id": sid, "question_id": qid, "answer": value})
        return r.json()

    print("=" * 72)
    print("FLOW 1 — STRUGGLING on A: not mastered -> next question stays in skill A")
    print("=" * 72)
    # a wrong answer, then climbing-but-still-below-threshold corrects
    for label, val in [("wrong", WRONG), ("correct", CORRECT),
                       ("correct", CORRECT), ("correct", CORRECT)]:
        res = submit(ids["qa1"], val)
        nq = res["next_question"]
        print(f"  answer A ({label:7}) -> is_correct={res['is_correct']!s:5} "
              f"status={res['status']:11} level={res['mastery_level']:.2f} "
              f"| next_question: skill#{nq['skill_id']} (id={nq['id']}) = {skill_name(nq['skill_id'])!r}")
        assert res["status"] != "mastered"
        assert nq["skill_id"] == A, "FAIL: next question should stay in skill A"
    print("  => A not mastered: every next_question is from skill A itself.\n")

    print("=" * 72)
    print("FLOW 2 — MASTERING A: on the answer that masters A -> next skill = B (open),")
    print("         NOT C (still locked because B is not mastered)")
    print("=" * 72)
    res = submit(ids["qa1"], CORRECT)  # 5th correct in window -> masters A
    nq = res["next_question"]
    print(f"  answer A (correct) -> status={res['status']} level={res['mastery_level']:.2f} "
          f"| next_question: skill#{nq['skill_id']} (id={nq['id']}) = {skill_name(nq['skill_id'])!r}")
    assert res["status"] == "mastered", "FAIL: A should be mastered now"
    assert nq["skill_id"] == B, "FAIL: next question should advance to skill B"
    assert nq["skill_id"] != C, "FAIL: C is locked and must not be offered"
    print("  => A mastered: server advanced to the next OPEN skill B (not locked C).\n")

    print("=" * 72)
    print("FULL RESPONSE shape (result + progress + next_question), server-decided:")
    print("=" * 72)
    import json
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
