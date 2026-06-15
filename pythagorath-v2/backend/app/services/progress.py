"""Parent-facing progress (blueprint §3.4).

The mother does not want raw numbers — she wants an answer to "is my child OK
and progressing?". This builds a human-language summary and a traffic light from
the skill_mastery rows (the single source of truth), never from the browser.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress import SkillMastery
from app.models.skill import Skill
from app.models.user import Student

_LIGHT = {"mastered": "green", "in_progress": "yellow", "locked": "gray"}


class NotFoundError(Exception):
    """Student does not exist."""


def build_progress(db: Session, student_id: int) -> dict:
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError(f"student {student_id} not found")

    rows = db.execute(
        select(SkillMastery, Skill.name)
        .join(Skill, SkillMastery.skill_id == Skill.id)
        .where(SkillMastery.student_id == student_id)
        .order_by(Skill.order, Skill.id)
    ).all()

    skills = []
    mastered, working = [], []
    for sm, name in rows:
        skills.append(
            {
                "skill_id": sm.skill_id,
                "name": name,
                "status": sm.status,
                "mastery_level": sm.mastery_level,
                "light": _LIGHT.get(sm.status, "gray"),
            }
        )
        if sm.status == "mastered":
            mastered.append(name)
        elif sm.status == "in_progress":
            working.append(name)

    # Human-language summary (§3.4).
    parts: list[str] = []
    if mastered:
        parts.append(f"أتقن {student.name} " + "، ".join(mastered))
    if working:
        lead = "ويعمل الآن على " if parts else f"يعمل {student.name} الآن على "
        parts.append(lead + "، ".join(working))
    summary = "، ".join(parts) if parts else f"لم يبدأ {student.name} رحلته بعد."

    if mastered and not working:
        overall = "green"
    elif working or mastered:
        overall = "yellow"
    else:
        overall = "gray"

    return {
        "student_id": student_id,
        "student_name": student.name,
        "summary": summary,
        "overall_light": overall,
        "skills": skills,
    }
