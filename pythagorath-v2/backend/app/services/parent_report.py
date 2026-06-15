"""Parent (mother) report service (blueprint §3.4).

Answers a busy, non-technical mother's real questions — in plain language, from
the SINGLE source of truth (skill_mastery + the content tree + answer_log),
never the browser:

  1. Where is my child now?      -> current unit + "mastered X of Y skills"
  2. What has he mastered?       -> list of mastered skill names
  3. In step with school?        -> he is studying his OWN grade's unit
  4. Does he need help?          -> a gentle signal when he tries a skill a lot
                                    without mastering it (from answer_log)
  5. Reassuring tone             -> the frontend composes encouraging text from
                                    this structured data.
"""
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session

from app.models.content import Grade, Subject, Unit
from app.models.progress import AnswerLog, SkillMastery
from app.models.skill import Question, Skill
from app.models.user import Student

# A skill the child is actively working on (in_progress) is flagged as "might
# need a little support" when he has tried it at least this many times but his
# overall accuracy on it is still below the comfort line. Both gates must hold so
# a child who simply hasn't practised much is never flagged.
SUPPORT_MIN_ATTEMPTS = 6
SUPPORT_MAX_ACCURACY = 0.6

_LIGHT = {"mastered": "green", "in_progress": "yellow", "not_started": "gray"}


class NotFoundError(Exception):
    """Student does not exist."""


def _current_unit(db: Session, grade_id: int, mastered: set[int]) -> Unit | None:
    """The unit the child is in now: the first unit (by subject, then order) of
    his grade that is NOT yet fully mastered; if every unit is complete, the last
    one (so a finished child still sees his latest unit)."""
    units = db.execute(
        select(Unit)
        .join(Subject, Unit.subject_id == Subject.id)
        .where(Subject.grade_id == grade_id)
        .order_by(Subject.id, Unit.order, Unit.id)
    ).scalars().all()
    if not units:
        return None

    last = None
    for unit in units:
        skill_ids = db.execute(
            select(Skill.id).where(Skill.unit_id == unit.id)
        ).scalars().all()
        last = unit
        if not skill_ids:
            continue
        if any(sid not in mastered for sid in skill_ids):
            return unit
    return last  # every unit fully mastered → his latest


def build_parent_report(db: Session, student_id: int) -> dict:
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")
    grade = db.get(Grade, student.grade_id)
    grade_name = grade.name if grade else ""

    mastered: set[int] = set(
        db.execute(
            select(SkillMastery.skill_id).where(
                SkillMastery.student_id == student_id,
                SkillMastery.status == "mastered",
            )
        ).scalars().all()
    )

    unit = _current_unit(db, student.grade_id, mastered)
    if unit is None:
        # No content for this grade yet — an explicit, calm empty report.
        return {
            "student_id": student_id,
            "student_name": student.name,
            "grade_name": grade_name,
            "overall_light": "gray",
            "unit": {"unit_name": "", "total_skills": 0, "mastered_skills": 0},
            "skills": [],
            "mastered_names": [],
            "curriculum_on_track": False,
            "support": None,
        }

    skills = db.execute(
        select(Skill).where(Skill.unit_id == unit.id).order_by(Skill.order, Skill.id)
    ).scalars().all()

    # mastery status per skill (mastered / in_progress / not_started)
    skill_ids = [s.id for s in skills]
    status_rows: dict[int, str] = {}
    if skill_ids:
        status_rows = dict(
            db.execute(
                select(SkillMastery.skill_id, SkillMastery.status).where(
                    SkillMastery.student_id == student_id,
                    SkillMastery.skill_id.in_(skill_ids),
                )
            ).all()
        )

    # per-skill attempts + correct from answer_log (for the support signal)
    attempt_rows = {
        sid: (att, cor or 0)
        for sid, att, cor in db.execute(
            select(
                Question.skill_id,
                func.count(),
                func.sum(cast(AnswerLog.is_correct, Integer)),
            )
            .join(Question, AnswerLog.question_id == Question.id)
            .where(AnswerLog.student_id == student_id)
            .group_by(Question.skill_id)
        ).all()
    }

    skill_entries = []
    mastered_names: list[str] = []
    support = None
    support_attempts = -1

    for s in skills:
        raw = status_rows.get(s.id)
        status = raw if raw in ("mastered", "in_progress") else "not_started"
        skill_entries.append(
            {
                "skill_id": s.id,
                "name": s.name,
                "status": status,
                "light": _LIGHT[status],
            }
        )
        if status == "mastered":
            mastered_names.append(s.name)

        # Support signal: only for a skill he is actively working on.
        if status == "in_progress":
            attempts, correct = attempt_rows.get(s.id, (0, 0))
            accuracy = (correct / attempts) if attempts else 1.0
            if (
                attempts >= SUPPORT_MIN_ATTEMPTS
                and accuracy < SUPPORT_MAX_ACCURACY
                and attempts > support_attempts
            ):
                support = {"skill_id": s.id, "name": s.name, "attempts": attempts}
                support_attempts = attempts

    mastered_count = sum(1 for e in skill_entries if e["status"] == "mastered")
    any_progress = any(e["status"] != "not_started" for e in skill_entries)

    if support is not None:
        overall_light = "yellow"
    elif not any_progress:
        overall_light = "gray"
    else:
        overall_light = "green"

    return {
        "student_id": student_id,
        "student_name": student.name,
        "grade_name": grade_name,
        "overall_light": overall_light,
        "unit": {
            "unit_name": unit.name,
            "total_skills": len(skills),
            "mastered_skills": mastered_count,
        },
        "skills": skill_entries,
        "mastered_names": mastered_names,
        "curriculum_on_track": True,
        "support": support,
    }
