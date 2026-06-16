"""Child adventure-screen data — a READ-ONLY aggregation over the heart (path / lock /
mastery / answers / personal-path), pre-translated to child-friendly language. The same
pattern as the guardian dashboard: it touches NO engine state and grants no mastery.

Stations = the child's path in journey order (skillmap order = Skill.order), each tagged
with a visual state (mastered / current / available / locked). 'current' is next_skill —
which may be a cross-grade remediation node OUTSIDE the target-grade stations; in that case
no station is current (the button still surfaces it as «تقوية أساس»). Coins / streak reuse
the dashboard's exact derivation (single source — the two surfaces must agree).
"""
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import gate, parent_terms
from app.dashboard import _GULF_OFFSET, _streak
from app.models import Answer, Grade, Skill, SkillMastery

_REASON_AR = {"new": "مهارةٌ جديدة", "continue": "يُكمل مهارته", "remediation": "تقوية أساس",
              "review": "مراجعة", "done": "أتمّ مساره"}


def _visual(status: str, unlocked: bool, is_current: bool) -> str:
    """The station's visual state for the map (purely presentational)."""
    if status == "mastered":
        return "mastered"        # مضيئة 🏆
    if is_current:
        return "current"         # نابضة
    if unlocked:
        return "available"       # متاحة الآن
    return "locked"              # مقفلة 🔒


def build(db: Session, student, next_skill_fn, path_skills) -> dict:
    sid = student.id
    skills = path_skills

    def desc(skill):
        return parent_terms.describe(skill.code, skill.name) if skill else ""

    mast = {sm.skill_id: sm for sm in db.execute(
        select(SkillMastery).where(SkillMastery.student_id == sid)).scalars().all()}
    mastered = [s for s in skills if mast.get(s.id) and mast[s.id].status == "mastered"]
    correct = db.execute(select(func.count(Answer.id)).where(
        Answer.student_id == sid, Answer.is_correct.is_(True))).scalar_one()

    # streak in the child's local Gulf day (same derivation as the parent dashboard)
    off = _GULF_OFFSET.get(student.country, 3)
    from datetime import timedelta
    offd = timedelta(hours=off)
    now = datetime.now(timezone.utc)
    days = set()
    for (ts,) in db.execute(select(Answer.created_at).where(Answer.student_id == sid)).all():
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        days.add((ts + offd).date())
    streak = _streak(days, (now + offd).date())

    # the current station = the personal path's next target (None while never diagnosed)
    needs_diagnostic = student.placement_skill_id is None
    current = None
    current_id = None
    if not needs_diagnostic:
        nxt = next_skill_fn(db, student, skills)
        current_id = nxt["skill_id"]
        cur_skill = db.get(Skill, current_id) if current_id else None
        current = {
            "skill_id": current_id,
            "name": desc(cur_skill),
            "reason": _REASON_AR.get(nxt["reason"], nxt["reason"]),
        }

    # stations — the path in journey order, each with its visual state
    stations = []
    for s in skills:
        status = mast[s.id].status if s.id in mast else "in_progress"
        unlocked = gate.is_unlocked(db, sid, s.id)
        is_current = (current_id is not None and s.id == current_id)
        stations.append({
            "id": s.id,
            "name": desc(s),
            "status": status,
            "unlocked": unlocked,
            "is_current": is_current,
            "mastered": status == "mastered",
            "visual": _visual(status, unlocked, is_current),
        })

    return {
        "child": {"name": student.name},
        "coins": len(mastered) * 10 + correct,     # DISPLAY-ONLY derived (matches dashboard)
        "streak_days": streak,
        "needs_diagnostic": needs_diagnostic,
        "current": current,                         # None only while needs_diagnostic
        "stations": stations,
    }
