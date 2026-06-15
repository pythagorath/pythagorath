"""The gates (constitution v0.4):

* LOCK gate  — a skill unlocks only when ALL its prerequisites are *mastered*.
  Follows the explicit edge table (a DAG), never skill order. A skill with no
  prerequisites is open from the start.
* UNDERSTANDING gate —
    - multi-family (≥2 families): transfer across ≥2 distinct families (PROVEN,
      unchanged).
    - single-family (1 family): generalisation — correct on ≥2 DISTINCT items
      (new untrained examples), never a single answer.
* FLUENCY gate — after understanding only: accuracy over the last N fluency-phase
  answers (unchanged).

Status ladder: in_progress → understood → mastered. No one reaches mastered
without understood; no one reaches understood without passing the gate above.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Answer, Question, SkillMastery, SkillPrerequisite

# ---- durability (STRUCTURE ONLY — the review CYCLE is not activated yet) ----
# When a node is mastered it is scheduled for a later review; durability can only be
# tested by real elapsed time across a child's sessions, so the cycle (re-prompting,
# any demotion) is deferred to experiment. Here we only schedule + query. TUNABLE.
REVIEW_INTERVAL = timedelta(days=7)

# ---- understanding gate ----
FAMILIES_REQUIRED = 2        # multi-family: distinct families to transfer across
GENERALIZATION_REQUIRED = 2  # single-family: distinct correct items to generalise

# ---- fluency gate (TUNABLE — calibrated by experiment, NOT final) ----
FLUENCY_WINDOW = 5
FLUENCY_THRESHOLD = 0.8
# Per-answer speed ceiling: an answer is "fast" when it took <= this many ms from
# the question being SHOWN to submission. Fluency now requires BOTH high accuracy
# AND speed within the window. TUNABLE — calibrated by experiment, NOT sacred.
FLUENCY_MAX_MS = 8000

_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def normalise(value) -> str:
    return str(value).strip().translate(_DIGITS)


def grade(question: Question, answer) -> bool:
    return normalise(answer) == normalise(question.answer)


# ---------- lock gate ----------
def prerequisites(db: Session, skill_id: int) -> list[int]:
    return db.execute(
        select(SkillPrerequisite.prerequisite_skill_id).where(
            SkillPrerequisite.skill_id == skill_id
        )
    ).scalars().all()


# Prerequisite satisfaction for the LOCK gate. A prerequisite is satisfied when
# the student has at least UNDERSTOOD it (understood OR mastered) — NOT only when
# mastered. Constitution v0.5 separates two senses of "passage":
#   * completing a node (reaching `mastered`)   = both gates (understanding + fluency)
#   * progressing to a DEPENDENT node           = understanding the prerequisite
# The non-negotiable principle holds: no progression without understanding.
# Fluency completes the node itself; it is not a precondition for what comes after,
# and matures in parallel through practice. (Only the lock THRESHOLD changes here;
# the understanding and fluency gate logic is untouched.)
SATISFYING_STATUSES = ("understood", "mastered")


def satisfied_among(db: Session, student_id: int, skill_ids: list[int]) -> set[int]:
    """Prerequisite skills the student has at least UNDERSTOOD (understood/mastered)."""
    if not skill_ids:
        return set()
    return set(
        db.execute(
            select(SkillMastery.skill_id).where(
                SkillMastery.student_id == student_id,
                SkillMastery.skill_id.in_(skill_ids),
                SkillMastery.status.in_(SATISFYING_STATUSES),
            )
        ).scalars().all()
    )


def is_unlocked(db: Session, student_id: int, skill_id: int) -> bool:
    prereq = prerequisites(db, skill_id)
    if not prereq:
        return True
    satisfied = satisfied_among(db, student_id, prereq)
    return all(p in satisfied for p in prereq)


# ---------- understanding gate ----------
# SCOPE NOTE (draft/published): the understanding gate evaluates the node the CHILD
# actually sees — i.e. its PUBLISHED questions only. Drafts (admin work-in-progress)
# are never reached by a child and must never alter the gate, so the family/item
# counts below are scoped to ``status == "published"``. This is a SCOPE filter, not
# a logic change — the thresholds, the two gates, and the status ladder are untouched.
def families_total(db: Session, skill_id: int) -> int:
    return db.execute(
        select(func.count(func.distinct(Question.family))).where(
            Question.skill_id == skill_id,
            Question.family.is_not(None),
            Question.status == "published",
        )
    ).scalar_one()


def families_passed(db: Session, student_id: int, skill_id: int) -> list[str]:
    rows = db.execute(
        select(Question.family)
        .distinct()
        .join(Answer, Answer.question_id == Question.id)
        .where(
            Answer.student_id == student_id,
            Question.skill_id == skill_id,
            Answer.is_correct.is_(True),
            Question.family.is_not(None),
            Question.status == "published",
        )
    ).scalars().all()
    return sorted(f for f in rows if f)


def distinct_correct_items(db: Session, student_id: int, skill_id: int) -> int:
    return db.execute(
        select(func.count(func.distinct(Answer.question_id)))
        .join(Question, Answer.question_id == Question.id)
        .where(
            Answer.student_id == student_id,
            Question.skill_id == skill_id,
            Answer.is_correct.is_(True),
            Question.status == "published",
        )
    ).scalar_one()


def understanding_state(db: Session, student_id: int, skill_id: int) -> dict:
    """The understanding view, branching on family count.
    multi-family → families gate; single-family → generalisation gate."""
    total = families_total(db, skill_id)
    passed = families_passed(db, student_id, skill_id)
    if total >= 2:
        return {
            "mode": "families",
            "progress": len(passed),
            "needed": FAMILIES_REQUIRED,
            "families_passed": passed,
            "families_total": total,
        }
    # single-family (or untagged): generalisation across distinct items
    return {
        "mode": "generalization",
        "progress": distinct_correct_items(db, student_id, skill_id),
        "needed": GENERALIZATION_REQUIRED,
        "families_passed": passed,
        "families_total": total,
    }


def _understood_now(u: dict) -> bool:
    return u["progress"] >= u["needed"]


# ---------- fluency gate ----------
def _last_answer_id(db: Session, student_id: int, skill_id: int) -> int | None:
    return db.execute(
        select(func.max(Answer.id))
        .join(Question, Answer.question_id == Question.id)
        .where(Answer.student_id == student_id, Question.skill_id == skill_id)
    ).scalar()


def _fluency_view(db: Session, student_id: int, skill_id: int, after_id: int) -> dict:
    phase = db.execute(
        select(Answer.is_correct, Answer.elapsed_ms)
        .join(Question, Answer.question_id == Question.id)
        .where(
            Answer.student_id == student_id,
            Question.skill_id == skill_id,
            Answer.id > after_id,
        )
        .order_by(Answer.id.desc())
    ).all()
    window_rows = phase[:FLUENCY_WINDOW]
    window = len(window_rows)
    correct = sum(1 for c, _ in window_rows if c)
    # "fast" = measured AND within the ceiling. Unmeasured (None) is never fast.
    fast = sum(1 for _, e in window_rows if e is not None and e <= FLUENCY_MAX_MS)
    measured = [e for _, e in window_rows if e is not None]
    accuracy = (correct / window) if window else 0.0
    fast_ratio = (fast / window) if window else 0.0
    return {
        "answered": len(phase),
        "window": window,
        "correct": correct,
        "accuracy": round(accuracy, 2),
        "fast": fast,
        "fast_ratio": round(fast_ratio, 2),
        "avg_ms": int(sum(measured) / len(measured)) if measured else None,
        "speed_ceiling_ms": FLUENCY_MAX_MS,
        "needed": FLUENCY_WINDOW,
        "threshold": FLUENCY_THRESHOLD,
    }


def _meets_fluency(f: dict) -> bool:
    # mastery = enough answers, high ACCURACY, AND speed within the ceiling.
    return (
        f["window"] >= FLUENCY_WINDOW
        and f["accuracy"] >= FLUENCY_THRESHOLD
        and f["fast_ratio"] >= FLUENCY_THRESHOLD
    )


# ---------- combined view ----------
def _view(db: Session, student_id: int, skill_id: int, sm: SkillMastery | None) -> dict:
    status = sm.status if sm else "in_progress"
    fluency = None
    if sm is not None and sm.understood_answer_id is not None:
        fluency = _fluency_view(db, student_id, skill_id, sm.understood_answer_id)
    return {
        "status": status,
        "understood": status in ("understood", "mastered"),
        "mastered": status == "mastered",
        "understanding": understanding_state(db, student_id, skill_id),
        "fluency": fluency,
    }


def read_snapshot(db: Session, student_id: int, skill_id: int) -> dict:
    return _view(db, student_id, skill_id, db.get(SkillMastery, (student_id, skill_id)))


def recompute(db: Session, student_id: int, skill_id: int) -> dict:
    u = understanding_state(db, student_id, skill_id)

    sm = db.get(SkillMastery, (student_id, skill_id))
    if sm is None:
        sm = SkillMastery(student_id=student_id, skill_id=skill_id, status="in_progress")
        db.add(sm)

    # Gate 1 — understanding (sticky). Mark the fluency-phase boundary once.
    if sm.status == "in_progress" and _understood_now(u):
        sm.status = "understood"
        sm.understood_answer_id = _last_answer_id(db, student_id, skill_id)

    # Gate 2 — fluency, ONLY after understanding.
    if sm.status == "understood" and sm.understood_answer_id is not None:
        if _meets_fluency(_fluency_view(db, student_id, skill_id, sm.understood_answer_id)):
            sm.status = "mastered"
            # durability: schedule the first review at the moment of mastery (structure
            # only — nothing consumes this yet).
            sm.next_review_at = datetime.now(timezone.utc) + REVIEW_INTERVAL

    sm.updated_at = datetime.now(timezone.utc)
    db.flush()
    return _view(db, student_id, skill_id, sm)


def due_for_review(db: Session, student_id: int, now: datetime | None = None) -> list[int]:
    """Mastered skills whose scheduled review time has passed — the structure a future
    review cycle will consume. Read-only; it changes no status and starts no cycle."""
    now = now or datetime.now(timezone.utc)
    return list(
        db.execute(
            select(SkillMastery.skill_id).where(
                SkillMastery.student_id == student_id,
                SkillMastery.status == "mastered",
                SkillMastery.next_review_at.is_not(None),
                SkillMastery.next_review_at <= now,
            )
        ).scalars().all()
    )
