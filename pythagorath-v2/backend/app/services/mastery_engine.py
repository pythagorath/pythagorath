"""The mastery engine (blueprint §6) — lives on the server, called on every answer.

B-2 scope: after an answer is logged, create-or-update the ONE ``skill_mastery``
row for (student, skill) and recompute it from real answer data. There is exactly
one row per (student, skill) — the composite primary key guarantees no duplicates.

The mastery level is the fraction correct over the most recent attempts for that
skill (window below). Flipping status to "mastered" and unlocking the next skill
against ``skills.mastery_threshold`` is B-3 — kept separate on purpose. Here a
practised skill simply moves from "locked" to "in_progress".
"""
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.progress import AnswerLog, LearningPath, SkillMastery
from app.models.skill import Question, Skill, SkillPrerequisite

# Recent-attempts window used to compute the mastery level (blueprint example:
# "80% correct over the last 5 attempts"). The 80% threshold itself is read from
# skills.mastery_threshold in B-3, never hard-coded.
MASTERY_WINDOW = 5

# A correct answer to a question at this difficulty (or harder) must appear in the
# recent window before a skill can be mastered (Bloom / desirable difficulty).
HARD_DIFFICULTY = 3


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def placed_out_skill_ids(db: Session, student_id: int) -> set[int]:
    """Skills the student tested OUT of via the start-point diagnostic (§2):
    those positioned BEFORE ``current_position`` in their learning path.

    These satisfy prerequisites — so an advanced placement can be practised —
    but they are NOT mastery. The diagnostic never marks any skill 'mastered';
    a placed-out skill is a distinct, weaker state ("تم تجاوزها بالتشخيص") that
    is never counted as practice-earned mastery nor celebrated.
    """
    lp = db.get(LearningPath, student_id)
    if lp is None:
        return set()
    ordered = lp.ordered_skill_ids or []
    pos = lp.current_position or 0
    return set(ordered[:pos])


def unmet_prerequisites(db: Session, student_id: int, skill_id: int) -> list[int]:
    """Prerequisite skill ids this student has NOT yet satisfied.

    A skill is unlocked only when this list is empty. A skill with no
    prerequisites is always unlocked (returns []).

    THE SINGLE open/lock gate. A prerequisite counts as satisfied ONLY when it
    is mastered (earned by practice). This is the only place the rule lives — no
    other code path decides open/lock.

    FROZEN (Phase-1 debt): the diagnostic's ``placed_out`` is intentionally NOT
    a satisfier here. The §2 placement may suggest a starting point, but it must
    never grant passage — passage requires understanding, and the two-family
    understanding gate cannot exist yet (the bank is single-representation).
    Re-enable a placement/understanding satisfier only once families are authored
    (see CONTENT_AUTHORING.md, "التشخيص التكيّفي §2"). ``placed_out_skill_ids``
    is kept (used by the diagnostic record), but is deliberately unused by the
    gate.
    """
    prereq_ids = db.execute(
        select(SkillPrerequisite.prerequisite_skill_id).where(
            SkillPrerequisite.skill_id == skill_id
        )
    ).scalars().all()
    if not prereq_ids:
        return []
    mastered = set(
        db.execute(
            select(SkillMastery.skill_id).where(
                SkillMastery.student_id == student_id,
                SkillMastery.skill_id.in_(prereq_ids),
                SkillMastery.status == "mastered",
            )
        ).scalars().all()
    )
    satisfied = mastered
    return [pid for pid in prereq_ids if pid not in satisfied]


def is_unlocked(db: Session, student_id: int, skill_id: int) -> bool:
    return not unmet_prerequisites(db, student_id, skill_id)


def _pick_question_for_skill(
    db: Session,
    student_id: int,
    skill_id: int,
    exclude_question_id: int | None = None,
) -> Question | None:
    """Pick the LEAST-answered question for this student in this skill (then by
    difficulty, then id), excluding the just-answered one when alternatives exist.

    This rotates through the whole question bank instead of repeatedly returning
    the two lowest-ordered questions — the cause of the child seeing only a couple
    of questions over and over.
    """
    questions = db.execute(
        select(Question).where(Question.skill_id == skill_id)
    ).scalars().all()
    if not questions:
        return None

    # how many times this student has answered each question (for this skill)
    counts = dict(
        db.execute(
            select(AnswerLog.question_id, func.count())
            .join(Question, AnswerLog.question_id == Question.id)
            .where(
                AnswerLog.student_id == student_id,
                Question.skill_id == skill_id,
            )
            .group_by(AnswerLog.question_id)
        ).all()
    )

    pool = [q for q in questions if q.id != exclude_question_id] or questions
    pool.sort(key=lambda q: (counts.get(q.id, 0), q.difficulty, q.id))
    return pool[0]


def _next_open_skill(db: Session, student_id: int, current_skill_id: int) -> Skill | None:
    """The next skill (by order, in the same unit) that is unlocked and not yet
    mastered. Locked skills are skipped — never offered."""
    current = db.get(Skill, current_skill_id)
    candidates = db.execute(
        select(Skill)
        .where(Skill.unit_id == current.unit_id, Skill.order > current.order)
        .order_by(Skill.order, Skill.id)
    ).scalars().all()
    for skill in candidates:
        if not is_unlocked(db, student_id, skill.id):
            continue
        mastery = db.get(SkillMastery, (student_id, skill.id))
        if mastery is not None and mastery.status == "mastered":
            continue
        return skill
    return None


def select_next_question(
    db: Session,
    student_id: int,
    skill_id: int,
    status: str,
    just_answered_question_id: int,
) -> Question | None:
    """Choose what to show next (blueprint §6.1, step 6).

    * skill not yet mastered  -> another question from the SAME skill
    * skill mastered          -> a question from the next OPEN skill (never locked)
    """
    if status != "mastered":
        return _pick_question_for_skill(
            db, student_id, skill_id, exclude_question_id=just_answered_question_id
        )
    next_skill = _next_open_skill(db, student_id, skill_id)
    if next_skill is None:
        return None
    return _pick_question_for_skill(db, student_id, next_skill.id)


def update_skill_mastery(
    db: Session, student_id: int, skill_id: int
) -> SkillMastery:
    """Recompute and persist the (student, skill) mastery row from answer_log.

    Assumes the triggering answer has already been written to answer_log in the
    same session (flushed), so it is included in the computation.
    """
    base = (
        select(AnswerLog.is_correct)
        .join(Question, AnswerLog.question_id == Question.id)
        .where(AnswerLog.student_id == student_id, Question.skill_id == skill_id)
    )

    total_attempts = db.execute(
        select(func.count()).select_from(base.subquery())
    ).scalar_one()

    # Recent window: each answer's correctness AND its question difficulty.
    recent = db.execute(
        select(AnswerLog.is_correct, Question.difficulty)
        .join(Question, AnswerLog.question_id == Question.id)
        .where(AnswerLog.student_id == student_id, Question.skill_id == skill_id)
        .order_by(AnswerLog.id.desc())
        .limit(MASTERY_WINDOW)
    ).all()
    correct_recent = sum(1 for is_correct, _ in recent if is_correct)
    level = correct_recent / len(recent) if recent else 0.0

    # Desirable difficulty (Bloom): mastery requires at least one CORRECT answer
    # to a hard question (difficulty >= HARD_DIFFICULTY) within the recent window —
    # no mastery by solving only easy items.
    has_hard_correct = any(
        is_correct and (difficulty or 0) >= HARD_DIFFICULTY
        for is_correct, difficulty in recent
    )

    # The threshold is READ from this skill's own row — never hard-coded — so the
    # admin panel can tune it per skill (§6.2).
    skill = db.get(Skill, skill_id)
    threshold = skill.mastery_threshold

    mastery = db.get(SkillMastery, (student_id, skill_id))
    if mastery is None:
        mastery = SkillMastery(
            student_id=student_id, skill_id=skill_id, status="locked"
        )
        db.add(mastery)

    mastery.mastery_level = level
    mastery.attempts = total_attempts
    mastery.last_practiced = _utcnow()

    # Status: mastery is "sticky" once earned. Otherwise a practised skill is
    # "in_progress", and becomes "mastered" only when ALL hold: a full recent
    # window, recent accuracy meets the skill's threshold, AND the window
    # included at least one correct HARD item (desirable difficulty).
    if mastery.status != "mastered":
        if (
            total_attempts >= MASTERY_WINDOW
            and level >= threshold
            and has_hard_correct
        ):
            mastery.status = "mastered"
        else:
            mastery.status = "in_progress"

    db.flush()
    return mastery
