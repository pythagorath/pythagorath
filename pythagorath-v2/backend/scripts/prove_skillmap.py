"""Proof for §3.3: master لوحة المائة (1) + ما بين العقود (2) for سالم via the
REAL engine (submit_answer), then print the skill map — expecting 1&2 mastered,
3 (العدّ بالقفز) available, 4 (التقدير) locked.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.skill import Question  # noqa: E402
from app.services.answers import submit_answer  # noqa: E402
from app.services.skillmap import build_skill_map  # noqa: E402

STUDENT_ID = 1


def master_skill(db, skill_id: int) -> None:
    qs = db.execute(
        select(Question).where(Question.skill_id == skill_id).order_by(Question.difficulty, Question.id)
    ).scalars().all()
    hard = next((q for q in qs if q.difficulty >= 3), None)
    if hard is None:
        raise SystemExit(f"skill {skill_id} has no difficulty>=3 question — cannot master")
    others = [q for q in qs if q.id != hard.id] or [hard]

    seq = []
    i = 0
    while len(seq) < 4:
        seq.append(others[i % len(others)])
        i += 1
    seq.append(hard)  # hard item LAST so it sits in the recent window

    for q in seq:
        answer = (q.payload or {}).get("answer")
        log, mastery, _ = submit_answer(db, STUDENT_ID, q.id, answer)
        print(f"  skill {skill_id} q{q.id} d{q.difficulty} -> correct={log.is_correct} "
              f"status={mastery.status} level={mastery.mastery_level:.2f}")


def main() -> None:
    db = SessionLocal()
    try:
        for sid in (1, 2):
            print(f"# mastering skill {sid}")
            master_skill(db, sid)
        print("\n# skill map for سالم:")
        smap = build_skill_map(db, STUDENT_ID, 1)
        for e in smap["skills"]:
            prereqs = ", ".join(p["name"] for p in e["prerequisites"]) or "—"
            print(f'  [{e["order"]}] {e["status"]:<9} {e["name"]}  (متطلب: {prereqs})')
    finally:
        db.close()


if __name__ == "__main__":
    main()
