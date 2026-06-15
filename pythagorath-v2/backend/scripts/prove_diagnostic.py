"""Proof for §2 adaptive start-point diagnostic — FROZEN contract (Phase-1).

The placement still COMPUTES a suggested start (landing + placed_out), but that
suggestion no longer opens the gate: a placed child starts from skill 1 like a
fresh child, until the two-family understanding gate is built. Uses throwaway
students so real profiles (سالم/نورة) are untouched. Verifies:

  * strong child (passes 1&2, fails 3) -> placement SUGGESTS skill 3, but the
    landing is LOCKED (not unlocked by placement); map shows NO 'placed_out'.
  * weak child   (fails skill 1)       -> suggests skill 1 (unlocked, no prereq).
  * both: NO skill mastered, NO answer_log, and the map equals a fresh child's
    (skill 1 available, the rest locked) — zero free passage, zero placed_out.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
import app.models as m  # noqa: E402
from app.models.progress import AnswerLog, SkillMastery  # noqa: E402
from app.services.diagnostic import get_diagnostic_questions  # noqa: E402
from app.services.placement import compute_placement  # noqa: E402
from app.services.mastery_engine import is_unlocked, placed_out_skill_ids  # noqa: E402
from app.services.skillmap import build_skill_map  # noqa: E402

SUBJECT_ID = 1


def make_student(db, name):
    u = db.execute(
        select(m.User).where(m.User.email == "parent@pythagorath.local")
    ).scalars().first()
    st = m.Student(user_id=u.id, name=name, grade_id=1, country_id=1)
    db.add(st)
    db.flush()
    return st.id


def answers_for(db, probes, pass_skills):
    """Build answers: correct for skills in pass_skills, wrong otherwise."""
    out = []
    for q in probes:
        correct = (q.payload or {}).get("answer")
        out.append(
            {"question_id": q.id, "answer": correct if q.skill_id in pass_skills else "###WRONG###"}
        )
    return out


def run_case(db, name, pass_skills, expect_landing_order, expect_landing_unlocked):
    sid = make_student(db, name)
    probes = get_diagnostic_questions(db, sid, SUBJECT_ID)
    by_skill = {}
    for q in probes:
        by_skill.setdefault(q.skill_id, []).append(q.difficulty)
    print(f"\n=== {name} ===")
    print("  diagnostic probes (skill→difficulties):", by_skill, f"[{len(probes)} total]")

    res = compute_placement(db, sid, SUBJECT_ID, answers_for(db, probes, pass_skills))
    print(f"  placement SUGGESTS: order={res['landing_order']} «{res['placement_skill_name']}»"
          f"  (suggestion only; does NOT open the gate)")

    mastered = db.execute(
        select(SkillMastery).where(
            SkillMastery.student_id == sid, SkillMastery.status == "mastered"
        )
    ).scalars().all()
    logs = db.execute(
        select(func.count()).select_from(
            select(AnswerLog).where(AnswerLog.student_id == sid).subquery()
        )
    ).scalar_one()
    landing_unlocked = is_unlocked(db, sid, res["placement_skill_id"])
    smap = {e["order"]: e["status"] for e in build_skill_map(db, sid, SUBJECT_ID)["skills"]}
    fresh_map = {1: "available", 2: "locked", 3: "locked", 4: "locked"}

    print(f"  FROZEN GUARANTEES: mastered-rows={len(mastered)} (0) | answer_log={logs} (0) | "
          f"landing unlocked={landing_unlocked} (expect {expect_landing_unlocked})")
    print("  skill map by order:", smap, "(expect == fresh child)")

    ok = (
        res["landing_order"] == expect_landing_order  # suggestion still computed
        and len(mastered) == 0
        and logs == 0
        and landing_unlocked is expect_landing_unlocked
        and "placed_out" not in smap.values()  # NO placed_out anywhere
        and smap == fresh_map  # placed child's map == fresh child's map
    )
    print(f"  RESULT: {'PASS ✅' if ok else 'FAIL ❌'}")

    db.delete(db.get(m.Student, sid))
    db.flush()
    return ok


def main():
    db = SessionLocal()
    try:
        # strong: suggested skill 3, but landing LOCKED (placement doesn't open it)
        a = run_case(db, "قوي-اختبار", pass_skills={1, 2},
                     expect_landing_order=3, expect_landing_unlocked=False)
        # weak: suggested skill 1 (no prereq → unlocked, like everyone's start)
        b = run_case(db, "ضعيف-اختبار", pass_skills=set(),
                     expect_landing_order=1, expect_landing_unlocked=True)
        db.commit()
        print("\nstudents remaining:",
              [s.name for s in db.execute(select(m.Student)).scalars().all()])
        print("\nALL PROOFS:", "PASS ✅" if (a and b) else "FAIL ❌")
    finally:
        db.close()


if __name__ == "__main__":
    main()
