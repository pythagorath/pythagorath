"""A-4 + A-5 acceptance proofs (run against a fresh DB at head).

1. Manual write of a skill_mastery row (valid student_id + skill_id) then read -> OK
2. skill_mastery with a non-existent student_id OR skill_id -> IntegrityError
3. skill_mastery is the SINGLE source of truth (criterion 11-ح): a value written
   here persists and is read back through a BRAND-NEW engine/connection — proving
   progress lives in the database, not in any client/browser/localStorage.
"""
from datetime import datetime, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import SessionLocal
import app.models as m


def counts(s):
    return {
        t: s.execute(text(f"select count(*) from {t}")).scalar()
        for t in ("skill_mastery", "answer_log", "learning_path")
    }


def main():
    s = SessionLocal()

    # ---- seed: parent chain + account + child + a skill ----
    c = m.Country(name="الإمارات"); s.add(c); s.flush()
    cur = m.Curriculum(country_id=c.id, name="منهج"); s.add(cur); s.flush()
    g = m.Grade(curriculum_id=cur.id, name="الصف الثاني", order=2); s.add(g); s.flush()
    sub = m.Subject(grade_id=g.id, name="الرياضيات"); s.add(sub); s.flush()
    u = m.Unit(subject_id=sub.id, name="الجمع والطرح", order=1); s.add(u); s.flush()
    skill = m.Skill(unit_id=u.id, name="الجمع ضمن ١٠", order=1, mastery_threshold=0.8)
    s.add(skill); s.flush()
    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    child = m.Student(user_id=parent.id, name="أحمد", grade_id=g.id, country_id=c.id)
    s.add(child); s.commit()
    sid, kid = child.id, skill.id
    print(f"seed: user#{parent.id} -> student#{sid}='أحمد'; skill#{kid}='الجمع ضمن ١٠'\n")

    # ---- CASE 1: manual write then read ----
    print("===== CASE 1: write a skill_mastery row (valid ids) then read -> OK =====")
    s.add(m.SkillMastery(
        student_id=sid, skill_id=kid, mastery_level=0.6,
        status="in_progress", attempts=3, last_practiced=datetime.now(timezone.utc)))
    s.commit()
    got = s.get(m.SkillMastery, (sid, kid))
    print(f"  OK  read back: student#{got.student_id} skill#{got.skill_id} "
          f"level={got.mastery_level} status={got.status!r} attempts={got.attempts} "
          f"last_practiced={got.last_practiced}")
    print("  counts:", counts(s), "\n")

    # ---- CASE 2: bad FKs rejected ----
    print("== CASE 2: skill_mastery with NON-EXISTENT ids -> rejected by database ==")
    before = counts(s)["skill_mastery"]
    try:
        s.add(m.SkillMastery(student_id=999999, skill_id=kid, status="locked"))
        s.commit()
        print("  FAILURE: bad student_id inserted silently!")
    except IntegrityError as e:
        s.rollback()
        print("  OK  bad student_id rejected:", repr(str(e.orig)))
    try:
        s.add(m.SkillMastery(student_id=sid, skill_id=888888, status="locked"))
        s.commit()
        print("  FAILURE: bad skill_id inserted silently!")
    except IntegrityError as e:
        s.rollback()
        print("  OK  bad skill_id rejected:", repr(str(e.orig)))
    print(f"  skill_mastery count unchanged: before={before}, after={counts(s)['skill_mastery']}")

    # bonus: invalid status blocked by CHECK
    try:
        s.add(m.SkillMastery(student_id=sid, skill_id=kid, status="banana"))
        s.commit()
        print("  FAILURE: invalid status allowed!")
    except IntegrityError as e:
        s.rollback()
        print("  OK  invalid status rejected by CHECK:", repr(str(e.orig)))
    print()
    s.close()

    # ---- CASE 3: single source of truth — read via a BRAND-NEW connection ----
    print("== CASE 3: progress persists in the DB, read via a NEW engine/connection ==")
    print("   (criterion 11-ح: source of truth is the database, not localStorage)")
    fresh_engine = create_engine(settings.database_url)
    FreshSession = sessionmaker(bind=fresh_engine)
    s2 = FreshSession()
    row = s2.get(m.SkillMastery, (sid, kid))
    print(f"  OK  fresh connection reads: student#{row.student_id} skill#{row.skill_id} "
          f"level={row.mastery_level} status={row.status!r}")
    # mutate through the fresh session, then verify via yet another new connection
    row.mastery_level = 0.95
    row.status = "mastered"
    s2.commit()
    s2.close()

    another_engine = create_engine(settings.database_url)
    s3 = sessionmaker(bind=another_engine)()
    final = s3.get(m.SkillMastery, (sid, kid))
    print(f"  OK  yet another connection sees the update: level={final.mastery_level} "
          f"status={final.status!r}  -> durable across sessions/devices")
    s3.close()


if __name__ == "__main__":
    main()
