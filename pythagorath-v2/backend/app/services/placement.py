"""Adaptive start-point placement (blueprint §2).

Grades the diagnostic probes and decides WHERE the child starts — never grants
mastery. The pedagogy:

* A skill is "passed" only when ALL its probes are correct (conservative — late
  skills carry two probes, so a single lucky guess can't place a child too far).
* Walk the unit's skills in teaching order; the landing skill is the FIRST one
  NOT passed. Fail the first skill → start at the beginning. Pass them all →
  land on the LAST skill (the child still proves it by practice; the unit is
  never declared complete for free).
* Earlier passed skills are recorded as PLACED OUT via the learning path
  (current_position), which the single lock gate honours — they satisfy
  prerequisites but are never marked 'mastered'.

Crucially: diagnostic answers are graded here but NEVER written to answer_log,
so they can't leak into the mastery engine and hand out free mastery.
"""
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.content import Subject, Unit
from app.models.progress import LearningPath
from app.models.skill import Question, Skill
from app.models.user import Student
from app.services.answers import grade_answer


class NotFoundError(Exception):
    """Student or subject does not exist."""


def compute_placement(
    db: Session, student_id: int, subject_id: int, answers: list[dict]
) -> dict:
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError(f"subject {subject_id} not found")

    skills = db.execute(
        select(Skill)
        .join(Unit, Skill.unit_id == Unit.id)
        .where(Unit.subject_id == subject_id)
        .order_by(Skill.order, Skill.id)
    ).scalars().all()
    if not skills:
        raise NotFoundError(f"subject {subject_id} has no skills")

    skill_ids_in_order = [s.id for s in skills]
    valid_ids = set(skill_ids_in_order)

    # Grade each probe and group correctness by its skill (no answer_log writes).
    correctness: dict[int, list[bool]] = defaultdict(list)
    for a in answers:
        q = db.get(Question, a["question_id"])
        if q is None or q.skill_id not in valid_ids:
            continue
        correctness[q.skill_id].append(grade_answer(q, a["answer"]))

    def passed(skill_id: int) -> bool:
        results = correctness.get(skill_id)
        return bool(results) and all(results)

    # Landing = first skill not passed; all passed → the last skill.
    landing_index = len(skills) - 1
    for idx, skill in enumerate(skills):
        if not passed(skill.id):
            landing_index = idx
            break

    # Upsert the learning path (re-diagnosis simply overwrites it).
    lp = db.get(LearningPath, student_id)
    if lp is None:
        lp = LearningPath(
            student_id=student_id,
            ordered_skill_ids=skill_ids_in_order,
            current_position=landing_index,
        )
        db.add(lp)
    else:
        lp.ordered_skill_ids = skill_ids_in_order
        lp.current_position = landing_index
    db.commit()

    landing = skills[landing_index]
    placed_out = [
        {"skill_id": s.id, "name": s.name} for s in skills[:landing_index]
    ]
    return {
        "placement_skill_id": landing.id,
        "placement_skill_name": landing.name,
        "landing_order": landing.order,
        "placed_out": placed_out,
    }
