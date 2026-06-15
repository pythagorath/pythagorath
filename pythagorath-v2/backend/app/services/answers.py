"""Answer-handling service (server-side — the browser only sends the answer).

The submission flow (blueprint §6.1), in ONE database transaction:
    1. validate student + question
    2. grade the answer against the question payload
    3. write a row to answer_log
    4. call the mastery engine to create/update the skill_mastery row
    5. commit once

Keeping steps 3+4 in a single transaction means an answer is never logged
without its mastery being updated, and vice-versa.
"""
from typing import Any

from sqlalchemy.orm import Session

from app.models.progress import AnswerLog, SkillMastery
from app.models.skill import Question
from app.models.user import Student
from app.services.mastery_engine import (
    select_next_question,
    unmet_prerequisites,
    update_skill_mastery,
)


# Map Arabic-Indic (٠-٩) AND Extended/Persian (۰-۹) digits to Western, so that
# the same number written in any numeral system compares equal ("٣٠" == "30").
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def _normalise(value: Any) -> str:
    """Loose comparison key: trims, casefolds, and unifies digit scripts so a
    child's Hindi-numeral answer matches an answer stored in any numeral form."""
    return str(value).strip().casefold().translate(_DIGITS)


def grade_answer(question: Question, answer: Any) -> bool:
    """Correct iff the answer matches ``payload['answer']``."""
    expected = (question.payload or {}).get("answer")
    return _normalise(answer) == _normalise(expected)


class NotFoundError(Exception):
    """Raised when the student or question does not exist."""


class SkillLockedError(Exception):
    """Raised when a student tries to practise a skill whose prerequisites are
    not all mastered yet (the lock gate, §6.2)."""

    def __init__(self, skill_id: int, unmet: list[int]):
        self.skill_id = skill_id
        self.unmet = unmet
        super().__init__(
            f"skill {skill_id} is locked; unmastered prerequisites: {unmet}"
        )


def _serialise_question(question: Question | None) -> dict | None:
    if question is None:
        return None
    return {
        "id": question.id,
        "skill_id": question.skill_id,
        "interaction_type": question.interaction_type,
        "difficulty": question.difficulty,
        "payload": question.payload,
    }


def submit_answer(
    db: Session, student_id: int, question_id: int, answer: Any
) -> tuple[AnswerLog, SkillMastery, dict | None]:
    """Log the answer, update mastery, and choose the next question — one txn.

    The lock gate is checked FIRST: a skill with unmastered prerequisites is
    rejected before anything is written (no answer_log, no skill_mastery).
    Returns ``(answer_log, skill_mastery, next_question_data | None)``.
    """
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")
    question = db.get(Question, question_id)
    if question is None:
        raise NotFoundError(f"question {question_id} not found")

    unmet = unmet_prerequisites(db, student_id, question.skill_id)
    if unmet:
        raise SkillLockedError(question.skill_id, unmet)

    is_correct = grade_answer(question, answer)

    log = AnswerLog(
        student_id=student_id,
        question_id=question_id,
        is_correct=is_correct,
        answer_text=str(answer),
    )
    db.add(log)
    db.flush()  # make the answer visible to the engine within this transaction

    mastery = update_skill_mastery(db, student_id, question.skill_id)

    # Decide the next question from the (flushed) up-to-date mastery state, and
    # snapshot its fields while the session is open.
    next_question = select_next_question(
        db, student_id, question.skill_id, mastery.status, question_id
    )
    next_question_data = _serialise_question(next_question)

    db.commit()
    db.refresh(log)
    db.refresh(mastery)
    return log, mastery, next_question_data
