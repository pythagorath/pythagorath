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

from sqlalchemy import select
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

    # current semester (display only): stations are ALREADY term-filtered (via _path_skills),
    # so "completed" = every visible station mastered. The child can't change the term — when a
    # term is done we just nudge them to ask the guardian to open the next one.
    term = getattr(student, "term", None)
    term_block = None
    if term in (1, 2):
        completed = len(stations) > 0 and all(st["mastered"] for st in stations)
        term_block = {
            "value": term,
            "label": "الفصل الأول" if term == 1 else "الفصل الثاني",
            "completed": completed,
            "has_next": term == 1,                  # a الفصل الثاني exists to move to
        }

    return {
        "child": {"name": student.name},
        "coins": student.coins or 0,                # the REAL persisted balance (coins.py)
        "streak_days": streak,
        "needs_diagnostic": needs_diagnostic,
        "current": current,                         # None only while needs_diagnostic
        "stations": stations,
        "term": term_block,                         # None when the child sees the whole grade
    }
