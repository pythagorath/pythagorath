"""Skill map service (blueprint §3.3).

Builds the child's visual progress map for a subject: every skill of the
subject's unit(s), in order, each tagged with one of three states —

* ``mastered``  — the student's skill_mastery row is 'mastered'.
* ``available`` — not yet mastered, but EVERY prerequisite is mastered (unlocked).
* ``locked``    — not yet mastered and at least one prerequisite is unmet.

It reuses the engine's prerequisite graph so the map can never disagree with the
gate the engine enforces on submit. The single source of truth stays the
skill_mastery table — nothing is read from the browser.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.content import Subject, Unit
from app.models.skill import Question, Skill, SkillPrerequisite
from app.models.progress import SkillMastery
from app.models.user import Student
from app.services.mastery_engine import is_unlocked, unmet_prerequisites


class NotFoundError(Exception):
    """Student or subject does not exist."""


class SkillLockedError(Exception):
    """A skill whose prerequisites are not yet mastered cannot be started."""


def build_skill_map(db: Session, student_id: int, subject_id: int) -> dict:
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError(f"subject {subject_id} not found")

    # All skills under this subject's unit(s), in teaching order.
    skills = db.execute(
        select(Skill)
        .join(Unit, Skill.unit_id == Unit.id)
        .where(Unit.subject_id == subject_id)
        .order_by(Skill.order, Skill.id)
    ).scalars().all()

    # The student's mastered skill ids (single source of truth).
    mastered: set[int] = set(
        db.execute(
            select(SkillMastery.skill_id).where(
                SkillMastery.student_id == student_id,
                SkillMastery.status == "mastered",
            )
        ).scalars().all()
    )

    # Global skill-name lookup (a prerequisite may sit in another unit/subject).
    names = dict(db.execute(select(Skill.id, Skill.name)).all())

    entries = []
    for s in skills:
        prereq_ids = db.execute(
            select(SkillPrerequisite.prerequisite_skill_id).where(
                SkillPrerequisite.skill_id == s.id
            )
        ).scalars().all()
        prerequisites = [
            {"skill_id": pid, "name": names.get(pid, ""), "mastered": pid in mastered}
            for pid in prereq_ids
        ]

        # Open/lock is decided ONLY by the single gate (is_unlocked →
        # unmet_prerequisites), never re-derived here. NOTE: the diagnostic's
        # "placed_out" is intentionally NOT shown as a passed state while §2 is
        # frozen — a placed child's map must match a fresh child's (no "passed"
        # badge over skills the gate still locks). See CONTENT_AUTHORING.md.
        if s.id in mastered:
            status = "mastered"
        elif is_unlocked(db, student_id, s.id):
            status = "available"
        else:
            status = "locked"

        entries.append(
            {
                "skill_id": s.id,
                "name": s.name,
                "order": s.order,
                "status": status,
                "prerequisites": prerequisites,
            }
        )

    return {"student_id": student_id, "subject_id": subject_id, "skills": entries}


def get_skill_questions(
    db: Session, student_id: int, skill_id: int
) -> list[Question]:
    """Questions for ONE skill, to start a session on it from the map.

    Refuses (raises SkillLockedError) if the skill is locked for this student —
    the same gate the engine enforces on submit, so the map can't smuggle a child
    into a locked skill.
    """
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")
    skill = db.get(Skill, skill_id)
    if skill is None:
        raise NotFoundError(f"skill {skill_id} not found")

    if unmet_prerequisites(db, student_id, skill_id):
        raise SkillLockedError(f"skill {skill_id} is locked for student {student_id}")

    return db.execute(
        select(Question)
        .where(Question.skill_id == skill_id)
        .order_by(Question.difficulty, Question.id)
    ).scalars().all()
