"""Diagnostic service (blueprint §6.3).

A short diagnostic (5–7 questions) decides where a child starts in a subject.
The questions come EXCLUSIVELY from the ``questions`` table, filtered to the
student's grade and the chosen subject. There is NO static fallback list — the
exact bug from the old project, where the diagnostic dropped onto fixed,
inappropriate questions. If the database has no suitable questions, the result
is an explicit empty list (the caller decides how to surface that).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.content import Subject, Unit
from app.models.skill import Question, Skill
from app.models.user import Student

DIAGNOSTIC_MIN = 5
DIAGNOSTIC_MAX = 7


class NotFoundError(Exception):
    """Student or subject does not exist."""


class SubjectMismatchError(Exception):
    """The subject does not belong to the student's grade."""


def get_diagnostic_questions(
    db: Session, student_id: int, subject_id: int, limit: int = DIAGNOSTIC_MAX
) -> list[Question]:
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError(f"subject {subject_id} not found")
    if subject.grade_id != student.grade_id:
        raise SubjectMismatchError(
            f"subject {subject_id} is not in student {student_id}'s grade"
        )

    # The adaptive start-point diagnostic (§2) deliberately PROBES each skill,
    # not just grabs the first N questions: one medium (d2) probe per skill in
    # teaching order, plus a hard (d3) CEILING probe on the last two skills. The
    # result ramps easy-early → hard-late and lets placement find the deepest
    # skill the child is ready for. Returned in skill order so the ramp shows.
    skills = db.execute(
        select(Skill)
        .join(Unit, Skill.unit_id == Unit.id)
        .where(Unit.subject_id == subject_id)
        .order_by(Skill.order, Skill.id)
    ).scalars().all()

    n = len(skills)
    probes: list[Question] = []
    for idx, skill in enumerate(skills):
        base = _pick_probe(db, skill.id, target=2)
        if base is not None:
            probes.append(base)
        # The last two skills also get a harder ceiling probe (a skill is only
        # "passed" if ALL its probes are correct → conservative for late skills).
        if idx >= n - 2:
            ceiling = _pick_probe(
                db, skill.id, target=3,
                exclude={base.id} if base is not None else set(),
            )
            if ceiling is not None:
                probes.append(ceiling)

    return probes[:limit]


def _pick_probe(
    db: Session, skill_id: int, target: int, exclude: set[int] = frozenset()
) -> Question | None:
    """The skill's question whose difficulty is closest to ``target`` (ties →
    easier, then lowest id), excluding any already-chosen probe. Deterministic so
    the diagnostic is stable for a given content set."""
    questions = [
        q
        for q in db.execute(
            select(Question).where(Question.skill_id == skill_id)
        ).scalars().all()
        if q.id not in exclude
    ]
    if not questions:
        return None
    questions.sort(key=lambda q: (abs(q.difficulty - target), q.difficulty, q.id))
    return questions[0]
