"""Coins — a REWARD that is a SIDE-EFFECT of the gate result, never an input to it.

Awarded ONLY from POST /api/answers, AFTER `gate.recompute` has produced its verdict.
`recompute`/`gate.py` are NOT touched — coins read the outcome, they never feed back into
the understanding/fluency gates or the lock, so "no progression without mastery" and the
two gates are fully preserved.

Two awards (vision):
  * a SMALL one on every correct answer  → immediate sense of progress.
  * a BIG one at the mastery transition   → mastery is the grand prize.
No coins for speed, and none for a wrong answer — quality is rewarded, not haste.

Persistence: a ledger (`coin_events`) is the source of truth; `students.coins` is the
cached running balance (a real, accumulating total — not derived at display). The ledger's
unique keys make awarding idempotent: one 'correct' per answer, one 'mastery' per
(student, skill) ever. The big award is also gated by a transition check in the caller, so
re-answering an already-mastered node never re-awards it.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CoinEvent

# TUNABLE — calibrated by experiment, NOT sacred.
COINS_PER_CORRECT = 2     # small immediate reward for a correct answer
COINS_PER_MASTERY = 50    # the grand prize at the mastery transition


def _credit(db: Session, student, skill_id: int, kind: str, amount: int, answer_id=None):
    """Write one ledger event and bump the cached balance, atomically in this txn."""
    db.add(CoinEvent(student_id=student.id, skill_id=skill_id, kind=kind,
                     amount=amount, answer_id=answer_id))
    db.flush()                                   # surface a unique violation early
    student.coins = (student.coins or 0) + amount


def award_correct(db: Session, student, skill_id: int, answer_id: int) -> None:
    """+small for a correct answer. Keyed to the answer (one award per answer) — answers
    are created once per submission, so this is naturally once."""
    _credit(db, student, skill_id, "correct", COINS_PER_CORRECT, answer_id=answer_id)


def award_mastery(db: Session, student, skill_id: int) -> None:
    """+big at the mastery transition. Idempotent: skips if this skill's mastery award
    already exists (defense-in-depth alongside the caller's transition check and the DB
    partial-unique index)."""
    already = db.execute(
        select(CoinEvent.id).where(
            CoinEvent.student_id == student.id,
            CoinEvent.skill_id == skill_id,
            CoinEvent.kind == "mastery",
        )
    ).first()
    if already:
        return
    _credit(db, student, skill_id, "mastery", COINS_PER_MASTERY)
