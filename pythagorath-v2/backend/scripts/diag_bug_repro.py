"""Reproduce the 'only 2 questions appear' behaviour in an ISOLATED temp DB
(does not touch the real dev data). Simulates the submit_answer selection loop
and logs which question ids the engine serves for one skill."""
import os
import tempfile

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
import app.models as m
from app.services.mastery_engine import select_next_question, update_skill_mastery


def main():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    eng = create_engine(f"sqlite:///{path}")
    Base.metadata.create_all(eng)
    s = sessionmaker(bind=eng)()

    # minimal hierarchy + 6 questions in one skill + a student
    c = m.Country(name="X"); s.add(c); s.flush()
    cur = m.Curriculum(country_id=c.id, name="X"); s.add(cur); s.flush()
    g = m.Grade(curriculum_id=cur.id, name="X", order=1); s.add(g); s.flush()
    sub = m.Subject(grade_id=g.id, name="X"); s.add(sub); s.flush()
    u = m.Unit(subject_id=sub.id, name="X", order=1); s.add(u); s.flush()
    skill = m.Skill(unit_id=u.id, name="X", order=1, mastery_threshold=0.8); s.add(skill); s.flush()
    qids = []
    for i in range(6):
        q = m.Question(skill_id=skill.id, interaction_type="choice", difficulty=1,
                       payload={"answer": str(i)}); s.add(q); s.flush()
        qids.append(q.id)
    usr = m.User(email="x@x", password_hash="x"); s.add(usr); s.flush()
    stu = m.Student(user_id=usr.id, name="X", grade_id=g.id, country_id=c.id); s.add(stu); s.flush()
    s.commit()

    # simulate: answer WRONG each time (so it never masters) and follow next_question
    current = qids[0]
    served = []
    for _ in range(12):
        served.append(current)
        s.add(m.AnswerLog(student_id=stu.id, question_id=current, is_correct=False)); s.flush()
        mastery = update_skill_mastery(s, stu.id, skill.id)
        nq = select_next_question(s, stu.id, skill.id, mastery.status, current)
        if nq is None:
            break
        current = nq.id
    s.close(); eng.dispose(); os.unlink(path)

    print("skill has 6 questions, ids:", qids)
    print("served order :", served)
    print("distinct served:", sorted(set(served)), f"({len(set(served))} of 6 used)")


if __name__ == "__main__":
    main()
