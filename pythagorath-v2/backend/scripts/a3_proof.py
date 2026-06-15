"""A-3 acceptance proofs (run against a fresh DB at head).

1. Link skill B requires skill A  -> SUCCEED
2. Insert a question with a non-existent skill_id -> rejected with IntegrityError
3. Delete a skill referenced AS a prerequisite -> managed (RESTRICT prevents it;
   deleting the dependent side instead cascades the edge away) -> no orphan
"""
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
import app.models as m


def counts(s):
    return {
        t: s.execute(text(f"select count(*) from {t}")).scalar()
        for t in ("skills", "skill_prerequisites", "questions")
    }


def main():
    s = SessionLocal()

    # ---- seed parent chain down to a unit, then two sibling skills ----
    c = m.Country(name="الإمارات"); s.add(c); s.flush()
    cur = m.Curriculum(country_id=c.id, name="منهج"); s.add(cur); s.flush()
    g = m.Grade(curriculum_id=cur.id, name="الصف الثاني", order=2); s.add(g); s.flush()
    sub = m.Subject(grade_id=g.id, name="الرياضيات"); s.add(sub); s.flush()
    u = m.Unit(subject_id=sub.id, name="الجمع والطرح", order=1); s.add(u); s.flush()
    A = m.Skill(unit_id=u.id, name="الجمع ضمن ١٠", order=1, mastery_threshold=0.8)
    B = m.Skill(unit_id=u.id, name="الجمع بحمل", order=2, mastery_threshold=0.8)
    s.add_all([A, B]); s.commit()
    A_id, B_id = A.id, B.id
    print(f"seed: unit#{u.id}; skill A#{A_id}='الجمع ضمن ١٠'; skill B#{B_id}='الجمع بحمل'\n")

    # ---- CASE 1 ----
    print("===== CASE 1: link B requires A (skill_prerequisites) -> SUCCEED =====")
    s.add(m.SkillPrerequisite(skill_id=B_id, prerequisite_skill_id=A_id)); s.commit()
    row = s.execute(text(
        "select skill_id, prerequisite_skill_id from skill_prerequisites")).fetchall()
    print("  OK  edge stored:", row, " (skill_id=B requires prerequisite=A)")
    print("  counts:", counts(s), "\n")

    # ---- CASE 2 ----
    print("== CASE 2: question with NON-EXISTENT skill_id (=999999) -> REJECTED ==")
    before = counts(s)["questions"]
    try:
        s.add(m.Question(skill_id=999999, interaction_type="count",
                         difficulty=1, payload={"answer": 3}))
        s.commit()
        print("  FAILURE: inserted silently — FK NOT enforced!")
    except IntegrityError as e:
        s.rollback()
        print("  OK  rejected by database:", repr(str(e.orig)))
    print(f"  questions count unchanged: before={before}, after={counts(s)['questions']}\n")

    # ---- CASE 3a: delete A (referenced as a prerequisite) ----
    print("== CASE 3a: delete skill A (referenced AS prerequisite by B) -> PREVENTED ==")
    try:
        s.delete(s.get(m.Skill, A_id)); s.commit()
        print("  FAILURE: A deleted — would orphan B's prerequisite!")
    except IntegrityError as e:
        s.rollback()
        print("  OK  blocked by ON DELETE RESTRICT:", repr(str(e.orig)))
    still_a = s.get(m.Skill, A_id) is not None
    edge_now = s.execute(text(
        "select skill_id, prerequisite_skill_id from skill_prerequisites")).fetchall()
    print(f"  A still exists: {still_a}; edge intact (no orphan): {edge_now}\n")

    # ---- CASE 3b: delete the dependent B (controlled cascade) ----
    print("== CASE 3b: delete the DEPENDENT skill B -> SUCCEEDS, edge cascades away ==")
    s.delete(s.get(m.Skill, B_id)); s.commit()
    edge_after = s.execute(text(
        "select skill_id, prerequisite_skill_id from skill_prerequisites")).fetchall()
    a_after = s.get(m.Skill, A_id) is not None
    print(f"  OK  B deleted; A still exists: {a_after}; "
          f"skill_prerequisites rows now: {edge_after}")
    print("  -> no orphaned prerequisite remains.\n")

    # ---- BONUS: self-prerequisite blocked by CHECK ----
    print("== BONUS: self-prerequisite (skill requires itself) -> REJECTED by CHECK ==")
    try:
        s.add(m.SkillPrerequisite(skill_id=A_id, prerequisite_skill_id=A_id)); s.commit()
        print("  FAILURE: self-edge allowed!")
    except IntegrityError as e:
        s.rollback()
        print("  OK  blocked by CHECK constraint:", repr(str(e.orig)))

    s.close()


if __name__ == "__main__":
    main()
