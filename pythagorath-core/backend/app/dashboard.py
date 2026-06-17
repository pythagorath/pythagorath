"""Guardian dashboard data — a READ-ONLY aggregation over the heart (session/path/lock/
mastery/answers), pre-translated to parent language. Touches no engine state.

Coins are a DISPLAY-ONLY derived number (no rewards store yet — the real coins system
arrives with the child UI). 'Today' is the CHILD's local Gulf day (country offset), so an
evening session counts on the right date.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import gate, parent_terms
from app.models import Answer, Grade, Question, Skill, SkillMastery, Unit

# Gulf UTC offsets: AST (+3) for SA/QA/BH/KW, GST (+4) for OM/AE. Default +3.
_GULF_OFFSET = {"SA": 3, "QA": 3, "BH": 3, "KW": 3, "OM": 4, "AE": 4}
_COUNTRY_AR = {"SA": "السعودية", "QA": "قطر", "BH": "البحرين", "KW": "الكويت",
               "OM": "عُمان", "AE": "الإمارات"}
_REASON_AR = {"new": "مهارةٌ جديدة", "continue": "يُكمل مهارته", "remediation": "علاج أساس",
              "review": "مراجعة", "done": "أتمّ مساره"}


def _streak(days: set, today) -> int:
    """Consecutive active days ending at the latest activity (current only if today/yesterday)."""
    if not days:
        return 0
    d = max(days)
    if (today - d).days > 1:
        return 0
    n = 0
    while d in days:
        n += 1
        d = d - timedelta(days=1)
    return n


def build(db: Session, student, next_skill_fn, path_skills) -> dict:
    sid = student.id
    skills = path_skills
    by_id = {s.id: s for s in skills}
    go = {g.id: g.order for g in db.execute(select(Grade)).scalars().all()}
    ug = {u.id: u.grade_id for u in db.execute(select(Unit)).scalars().all()}

    def grade_order(skill):
        return go.get(ug.get(skill.unit_id), 0)

    def desc(skill):
        return parent_terms.describe(skill.code, skill.name) if skill else ""

    mast = {sm.skill_id: sm for sm in db.execute(
        select(SkillMastery).where(SkillMastery.student_id == sid)).scalars().all()}
    mastered = [s for s in skills if mast.get(s.id) and mast[s.id].status == "mastered"]

    # streak + weekly minutes in the child's local Gulf day
    off = timedelta(hours=_GULF_OFFSET.get(student.country, 3))
    now = datetime.now(timezone.utc)
    days, week_ms = set(), 0
    for ts, ms in db.execute(select(Answer.created_at, Answer.elapsed_ms).where(
            Answer.student_id == sid)).all():
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        days.add((ts + off).date())
        if now - ts <= timedelta(days=7):
            week_ms += (ms or 0)
    streak = _streak(days, (now + off).date())

    # the path's recommendation drives location / struggle / plan / next
    nxt = next_skill_fn(db, student, skills)
    nxt_skill = by_id.get(nxt["skill_id"]) or (db.get(Skill, nxt["skill_id"]) if nxt["skill_id"] else None)
    struggling = by_id.get(nxt["remediating_for"]) or (
        db.get(Skill, nxt["remediating_for"]) if nxt["remediating_for"] else None)
    target = go.get(student.grade_id, 0)

    # location / level — where the child is, vs their grade
    if nxt["reason"] == "remediation" and struggling is not None:
        here = struggling
    else:
        here = nxt_skill
    if nxt["reason"] == "remediation":
        level = "ينزل لتقوية أساسٍ من صفٍّ سابق"
    elif here is not None and grade_order(here) < target:
        level = "يراجع أساساً من صفٍّ أدنى"
    elif here is not None and grade_order(here) > target:
        level = "متقدّمٌ على صفّه"
    else:
        level = "في مستوى صفّه"

    # struggle + root cause + plan (only when remediating)
    if nxt["reason"] == "remediation" and struggling is not None and nxt_skill is not None:
        u = gate.understanding_state(db, sid, nxt_skill.id)
        pct = min(100, round(100 * u["progress"] / u["needed"])) if u["needed"] else 0
        struggle = {
            "has": True,
            "skill": desc(struggling),
            "root": desc(nxt_skill),
            "why": f"تعثّر في «{desc(struggling)}» لأن أساسه «{desc(nxt_skill)}» يحتاج تقوية.",
            "pythagorath_line": ("لا نكتفي بالقول إنّ طفلك تعثّر — نجد السبب الجذري ونعالجه "
                                 "من أساسه، حتى لو كان في صفٍّ سابق."),
            "plan": {
                "steps": [
                    {"label": "وجدنا أصل التعثّر", "done": True},
                    {"label": f"يتدرّب الآن على «{desc(nxt_skill)}»", "done": False},
                    {"label": f"ثم يعود إلى «{desc(struggling)}»", "done": False},
                ],
                "progress_percent": pct,
            },
        }
    else:
        struggle = {"has": False,
                    "message": "لا تعثّر الآن — طفلك يتقدّم في مساره بثبات. 🌱"}

    last = sorted(mastered, key=lambda s: mast[s.id].updated_at, reverse=True)[:4]

    return {
        "child": {
            "name": student.name,
            "grade": db.get(Grade, student.grade_id).name if student.grade_id else None,
            "curriculum": _COUNTRY_AR.get(student.country, "عام"),
        },
        "streak_days": streak,
        "cards": {
            "mastered": len(mastered), "total": len(skills),
            "coins": student.coins or 0,               # the REAL persisted balance (coins.py)
            "week_minutes": round(week_ms / 60000),
        },
        "location": {"description": desc(here), "level": level},
        "struggle": struggle,
        "last_mastered": [{"skill": desc(s)} for s in last],
        "next": {"skill": desc(nxt_skill), "reason": _REASON_AR.get(nxt["reason"], nxt["reason"])},
        # debt: visible skills with no parent-friendly term (NOT shown to the parent) —
        # the child's path + the nodes surfaced now (next + the struggling root)
        "_term_debt": parent_terms.uncovered(
            [s.code for s in skills] + [s.code for s in (nxt_skill, struggling) if s is not None]),
    }
