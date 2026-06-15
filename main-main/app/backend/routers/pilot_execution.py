"""Pilot Execution Sprint - Real usage tracking, engagement analysis, and pilot analytics."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from models.analytics_events import Analytics_events
from models.engagement_events import Engagement_events
from models.learning_sessions import Learning_sessions
from models.parent_reports import Parent_reports
from models.pilot_accounts import Pilot_accounts
from models.pilot_feedback import Pilot_feedback
from models.quiz_attempts import Quiz_attempts
from models.skill_mastery_records import Skill_mastery_records
from sqlalchemy import func, select, case, cast, Integer, Float, distinct, and_
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/pilot-execution", tags=["pilot-execution"])
logger = logging.getLogger(__name__)


@router.get("/cohort-overview")
async def get_cohort_overview(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Get pilot cohort overview - students, parents, academic team."""
    # Count by account type
    accounts_q = select(
        Pilot_accounts.account_type,
        func.count(Pilot_accounts.id),
    ).group_by(Pilot_accounts.account_type)
    accounts_result = (await db.execute(accounts_q)).all()

    cohort = {row[0]: row[1] for row in accounts_result}

    # Active vs inactive
    active_q = select(func.count(Pilot_accounts.id)).where(Pilot_accounts.is_active.is_(True))
    active_count = (await db.execute(active_q)).scalar() or 0

    total_q = select(func.count(Pilot_accounts.id))
    total_count = (await db.execute(total_q)).scalar() or 0

    # Recent activity (last 7 days)
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    active_users_q = select(func.count(distinct(Learning_sessions.user_id))).where(
        Learning_sessions.created_at >= cutoff
    )
    active_users = (await db.execute(active_users_q)).scalar() or 0

    return {
        "total_accounts": total_count,
        "active_accounts": active_count,
        "by_type": cohort,
        "students_grade1": cohort.get("student_grade1", 0),
        "students_grade2": cohort.get("student_grade2", 0),
        "parents": cohort.get("parent", 0),
        "academic_team": cohort.get("admin", 0) + cohort.get("editor", 0) + cohort.get("reviewer", 0),
        "active_last_7_days": active_users,
        "capacity": {"max": 30, "current": total_count, "remaining": max(0, 30 - total_count)},
    }


@router.get("/real-usage-tracking")
async def get_real_usage_tracking(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Comprehensive real usage tracking: DAU, session duration, completion, dropout, retry, retention, mastery."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # DAU - Daily Active Users
    dau_data = []
    for i in range(days):
        day_start = datetime.now(timezone.utc) - timedelta(days=i + 1)
        day_end = datetime.now(timezone.utc) - timedelta(days=i)
        dau_q = select(func.count(distinct(Learning_sessions.user_id))).where(
            Learning_sessions.created_at >= day_start,
            Learning_sessions.created_at < day_end,
        )
        dau = (await db.execute(dau_q)).scalar() or 0
        dau_data.append({"date": day_start.strftime("%Y-%m-%d"), "dau": dau})

    # Session duration distribution
    duration_q = select(Learning_sessions.duration_seconds).where(
        Learning_sessions.created_at >= cutoff,
        Learning_sessions.duration_seconds.isnot(None),
    )
    durations = (await db.execute(duration_q)).scalars().all()
    duration_buckets = {"0-2min": 0, "2-5min": 0, "5-10min": 0, "10-20min": 0, "20+min": 0}
    for d in durations:
        if d < 120:
            duration_buckets["0-2min"] += 1
        elif d < 300:
            duration_buckets["2-5min"] += 1
        elif d < 600:
            duration_buckets["5-10min"] += 1
        elif d < 1200:
            duration_buckets["10-20min"] += 1
        else:
            duration_buckets["20+min"] += 1

    # Mission completion rate
    sessions_with_missions_q = select(
        func.count(Learning_sessions.id),
        func.sum(Learning_sessions.missions_completed),
    ).where(Learning_sessions.created_at >= cutoff)
    missions_result = (await db.execute(sessions_with_missions_q)).first()
    total_sessions = missions_result[0] or 0
    total_missions = missions_result[1] or 0

    # Dropout points - sessions with very short duration or no questions attempted
    dropout_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= cutoff,
        Learning_sessions.duration_seconds < 60,
    )
    dropout_count = (await db.execute(dropout_q)).scalar() or 0

    # Retry behavior from engagement events
    retry_q = select(func.count(Engagement_events.id)).where(
        Engagement_events.event_type == "retry",
        Engagement_events.created_at >= cutoff,
    )
    retry_count = (await db.execute(retry_q)).scalar() or 0

    # Retention - users who came back on multiple days
    retention_q = select(
        Learning_sessions.user_id,
        func.count(distinct(func.date(Learning_sessions.created_at))),
    ).where(
        Learning_sessions.created_at >= cutoff
    ).group_by(Learning_sessions.user_id)
    retention_result = (await db.execute(retention_q)).all()
    returning_users = sum(1 for r in retention_result if r[1] > 1)
    total_users = len(retention_result)
    retention_rate = round(returning_users / total_users * 100, 1) if total_users > 0 else 0

    # Mastery progression
    mastery_q = select(
        func.count(Skill_mastery_records.id),
        func.avg(Skill_mastery_records.mastery_level),
    ).where(Skill_mastery_records.updated_at >= cutoff)
    mastery_result = (await db.execute(mastery_q)).first()
    mastery_updates = mastery_result[0] or 0
    avg_mastery = round(float(mastery_result[1] or 0), 1)

    # Misconception frequency - wrong answers by skill
    misconception_q = select(
        Engagement_events.skill_id,
        func.count(Engagement_events.id),
    ).where(
        Engagement_events.event_type == "question_answered",
        Engagement_events.is_correct.is_(False),
        Engagement_events.created_at >= cutoff,
    ).group_by(Engagement_events.skill_id).order_by(func.count(Engagement_events.id).desc()).limit(10)
    misconceptions = (await db.execute(misconception_q)).all()
    top_misconceptions = [{"skill_id": m[0], "wrong_count": m[1]} for m in misconceptions if m[0]]

    return {
        "period_days": days,
        "dau": dau_data,
        "avg_dau": round(sum(d["dau"] for d in dau_data) / max(len(dau_data), 1), 1),
        "session_duration_distribution": duration_buckets,
        "avg_session_duration": round(sum(durations) / max(len(durations), 1), 0) if durations else 0,
        "mission_completion": {
            "total_sessions": total_sessions,
            "total_missions_completed": total_missions,
            "avg_per_session": round(total_missions / max(total_sessions, 1), 1),
        },
        "dropout": {
            "count": dropout_count,
            "rate": round(dropout_count / max(total_sessions, 1) * 100, 1),
        },
        "retry_behavior": {
            "total_retries": retry_count,
            "avg_per_session": round(retry_count / max(total_sessions, 1), 1),
        },
        "retention": {
            "returning_users": returning_users,
            "total_users": total_users,
            "rate_percent": retention_rate,
        },
        "mastery_progression": {
            "records_updated": mastery_updates,
            "avg_mastery_level": avg_mastery,
        },
        "top_misconceptions": top_misconceptions,
    }


@router.get("/child-engagement")
async def get_child_engagement(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Analyze child engagement: boredom, dropout, difficulty, confusing questions."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Boredom signals - sessions with low engagement score
    boredom_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= cutoff,
        Learning_sessions.engagement_score.isnot(None),
        Learning_sessions.engagement_score < 3.0,
    )
    boredom_count = (await db.execute(boredom_q)).scalar() or 0

    total_scored_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= cutoff,
        Learning_sessions.engagement_score.isnot(None),
    )
    total_scored = (await db.execute(total_scored_q)).scalar() or 0

    # Dropout analysis - where do kids leave?
    dropout_events_q = select(
        Engagement_events.page_context,
        func.count(Engagement_events.id),
    ).where(
        Engagement_events.event_type == "dropout",
        Engagement_events.created_at >= cutoff,
    ).group_by(Engagement_events.page_context).order_by(func.count(Engagement_events.id).desc()).limit(5)
    dropout_pages = (await db.execute(dropout_events_q)).all()
    dropout_locations = [{"page": d[0] or "unknown", "count": d[1]} for d in dropout_pages]

    # Hardest skills - lowest mastery levels
    hard_skills_q = select(
        Skill_mastery_records.skill_id,
        func.avg(Skill_mastery_records.mastery_level),
        func.count(Skill_mastery_records.id),
    ).where(
        Skill_mastery_records.updated_at >= cutoff
    ).group_by(Skill_mastery_records.skill_id).having(
        func.count(Skill_mastery_records.id) >= 2
    ).order_by(func.avg(Skill_mastery_records.mastery_level).asc()).limit(10)
    hard_skills = (await db.execute(hard_skills_q)).all()
    hardest_skills = [
        {"skill_id": s[0], "avg_mastery": round(float(s[1] or 0), 1), "attempts": s[2]}
        for s in hard_skills
    ]

    # Most confusing questions - highest skip/wrong rate
    confusing_q = select(
        Engagement_events.question_id,
        func.count(Engagement_events.id).label("total"),
        func.sum(case((Engagement_events.is_correct.is_(False), 1), else_=0)).label("wrong"),
    ).where(
        Engagement_events.event_type.in_(["question_answered", "question_skipped"]),
        Engagement_events.question_id.isnot(None),
        Engagement_events.created_at >= cutoff,
    ).group_by(Engagement_events.question_id).having(
        func.count(Engagement_events.id) >= 3
    ).order_by((func.sum(case((Engagement_events.is_correct.is_(False), 1), else_=0)) / func.count(Engagement_events.id)).desc()).limit(10)
    confusing_result = (await db.execute(confusing_q)).all()
    confusing_questions = [
        {"question_id": q[0], "total_attempts": q[1], "wrong_count": q[2] or 0}
        for q in confusing_result
    ]

    # Time-based engagement pattern
    engagement_by_hour_q = select(
        func.extract("hour", Learning_sessions.created_at).label("hour"),
        func.count(Learning_sessions.id),
        func.avg(Learning_sessions.engagement_score),
    ).where(
        Learning_sessions.created_at >= cutoff
    ).group_by("hour").order_by("hour")
    hourly_result = (await db.execute(engagement_by_hour_q)).all()
    hourly_engagement = [
        {"hour": int(h[0]) if h[0] else 0, "sessions": h[1], "avg_engagement": round(float(h[2] or 0), 1)}
        for h in hourly_result
    ]

    return {
        "period_days": days,
        "boredom": {
            "low_engagement_sessions": boredom_count,
            "total_scored_sessions": total_scored,
            "boredom_rate": round(boredom_count / max(total_scored, 1) * 100, 1),
        },
        "dropout_locations": dropout_locations,
        "hardest_skills": hardest_skills,
        "confusing_questions": confusing_questions,
        "hourly_engagement": hourly_engagement,
        "recommendations": _engagement_recommendations(boredom_count, total_scored, dropout_locations),
    }


def _engagement_recommendations(boredom: int, total: int, dropouts: list) -> List[str]:
    """Generate engagement improvement recommendations."""
    recs = []
    if total > 0 and boredom / total > 0.3:
        recs.append("معدل الملل مرتفع - يُنصح بتنويع أنماط الأسئلة وإضافة عناصر تفاعلية")
    if dropouts:
        top_page = dropouts[0]["page"] if dropouts else ""
        if "diagnostic" in top_page:
            recs.append("أكثر الانسحابات في التشخيص - يُنصح بتقصير جلسات التشخيص")
        elif "quiz" in top_page:
            recs.append("أكثر الانسحابات في الاختبارات - يُنصح بتقليل عدد الأسئلة")
    if not recs:
        recs.append("مستوى التفاعل جيد - استمر في المراقبة")
    return recs


@router.get("/parent-feedback-layer")
async def get_parent_feedback_layer(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Get parent feedback, confusion reports, and usability notes."""
    # Parent reports summary
    reports_q = select(
        Parent_reports.report_type,
        func.count(Parent_reports.id),
    ).group_by(Parent_reports.report_type)
    reports_result = (await db.execute(reports_q)).all()
    by_type = {r[0]: r[1] for r in reports_result}

    # By severity
    severity_q = select(
        Parent_reports.severity,
        func.count(Parent_reports.id),
    ).group_by(Parent_reports.severity)
    severity_result = (await db.execute(severity_q)).all()
    by_severity = {s[0]: s[1] for s in severity_result}

    # Recent reports
    recent_q = select(Parent_reports).order_by(Parent_reports.created_at.desc()).limit(10)
    recent_result = (await db.execute(recent_q)).scalars().all()
    recent_reports = [
        {
            "id": r.id,
            "type": r.report_type,
            "description": r.description,
            "severity": r.severity,
            "page": r.page_context,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent_result
    ]

    # Parent-specific pilot feedback
    parent_feedback_q = select(
        func.count(Pilot_feedback.id),
        func.avg(Pilot_feedback.rating),
        func.avg(Pilot_feedback.ease_of_use),
        func.avg(Pilot_feedback.clarity),
    ).where(Pilot_feedback.feedback_type == "parent")
    pf_result = (await db.execute(parent_feedback_q)).first()

    # Open issues count
    open_q = select(func.count(Parent_reports.id)).where(
        Parent_reports.status == "open"
    )
    open_count = (await db.execute(open_q)).scalar() or 0

    return {
        "total_reports": sum(by_type.values()) if by_type else 0,
        "open_issues": open_count,
        "by_type": by_type,
        "by_severity": by_severity,
        "recent_reports": recent_reports,
        "parent_feedback": {
            "count": pf_result[0] or 0,
            "avg_rating": round(float(pf_result[1] or 0), 1),
            "avg_ease": round(float(pf_result[2] or 0), 1),
            "avg_clarity": round(float(pf_result[3] or 0), 1),
        },
    }


@router.get("/academic-ops-validation")
async def get_academic_ops_validation(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Validate academic operations: content production speed, review ease, skill addition, workflow efficiency."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Content production - new skills added
    from models.curriculum_skills import Curriculum_skills
    new_skills_q = select(func.count(Curriculum_skills.id)).where(
        Curriculum_skills.created_at >= cutoff
    )
    new_skills = (await db.execute(new_skills_q)).scalar() or 0

    # New questions added
    from models.curriculum_questions import Curriculum_questions
    new_questions_q = select(func.count(Curriculum_questions.id)).where(
        Curriculum_questions.created_at >= cutoff
    )
    new_questions = (await db.execute(new_questions_q)).scalar() or 0

    # Review activity - content review logs
    from models.content_review_logs import Content_review_logs
    reviews_q = select(func.count(Content_review_logs.id)).where(
        Content_review_logs.created_at >= cutoff
    )
    reviews_count = (await db.execute(reviews_q)).scalar() or 0

    # Workflow efficiency - editor feedback
    editor_feedback_q = select(
        func.count(Pilot_feedback.id),
        func.avg(Pilot_feedback.rating),
        func.avg(Pilot_feedback.ease_of_use),
    ).where(
        Pilot_feedback.feedback_type == "editor",
    )
    ef_result = (await db.execute(editor_feedback_q)).first()

    # Reviewer feedback
    reviewer_feedback_q = select(
        func.count(Pilot_feedback.id),
        func.avg(Pilot_feedback.rating),
        func.avg(Pilot_feedback.ease_of_use),
    ).where(
        Pilot_feedback.feedback_type == "reviewer",
    )
    rf_result = (await db.execute(reviewer_feedback_q)).first()

    return {
        "period_days": days,
        "content_production": {
            "new_skills": new_skills,
            "new_questions": new_questions,
            "skills_per_day": round(new_skills / max(days, 1), 1),
            "questions_per_day": round(new_questions / max(days, 1), 1),
        },
        "review_activity": {
            "total_reviews": reviews_count,
            "reviews_per_day": round(reviews_count / max(days, 1), 1),
        },
        "editor_experience": {
            "feedback_count": ef_result[0] or 0,
            "avg_rating": round(float(ef_result[1] or 0), 1),
            "avg_ease": round(float(ef_result[2] or 0), 1),
        },
        "reviewer_experience": {
            "feedback_count": rf_result[0] or 0,
            "avg_rating": round(float(rf_result[1] or 0), 1),
            "avg_ease": round(float(rf_result[2] or 0), 1),
        },
        "efficiency_score": _calc_efficiency_score(new_skills, new_questions, reviews_count, days),
    }


def _calc_efficiency_score(skills: int, questions: int, reviews: int, days: int) -> Dict[str, Any]:
    """Calculate overall workflow efficiency score."""
    production_rate = (skills + questions) / max(days, 1)
    review_rate = reviews / max(days, 1)

    score = min(100, int(production_rate * 10 + review_rate * 5))
    level = "ممتاز" if score >= 80 else "جيد" if score >= 50 else "يحتاج تحسين"

    return {"score": score, "level": level, "production_rate": round(production_rate, 1), "review_rate": round(review_rate, 1)}


@router.get("/pilot-analytics-summary")
async def get_pilot_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Comprehensive pilot analytics dashboard summary."""
    now = datetime.now(timezone.utc)
    last_7d = now - timedelta(days=7)
    last_24h = now - timedelta(hours=24)

    # DAU today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    dau_today_q = select(func.count(distinct(Learning_sessions.user_id))).where(
        Learning_sessions.created_at >= today_start
    )
    dau_today = (await db.execute(dau_today_q)).scalar() or 0

    # 7-day retention
    users_7d_q = select(
        Learning_sessions.user_id,
        func.count(distinct(func.date(Learning_sessions.created_at))),
    ).where(Learning_sessions.created_at >= last_7d).group_by(Learning_sessions.user_id)
    users_7d = (await db.execute(users_7d_q)).all()
    retention_7d = sum(1 for u in users_7d if u[1] >= 3) / max(len(users_7d), 1) * 100

    # Mastery growth
    mastery_growth_q = select(
        func.count(Skill_mastery_records.id),
    ).where(
        Skill_mastery_records.mastery_level >= 80,
        Skill_mastery_records.updated_at >= last_7d,
    )
    mastered_skills = (await db.execute(mastery_growth_q)).scalar() or 0

    # Session completion
    completed_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= last_7d,
        Learning_sessions.ended_at.isnot(None),
    )
    completed = (await db.execute(completed_q)).scalar() or 0

    total_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= last_7d
    )
    total = (await db.execute(total_q)).scalar() or 0
    completion_rate = round(completed / max(total, 1) * 100, 1)

    # Common misconceptions
    misconception_q = select(
        Engagement_events.skill_id,
        func.count(Engagement_events.id),
    ).where(
        Engagement_events.is_correct.is_(False),
        Engagement_events.created_at >= last_7d,
        Engagement_events.skill_id.isnot(None),
    ).group_by(Engagement_events.skill_id).order_by(func.count(Engagement_events.id).desc()).limit(5)
    misconceptions = (await db.execute(misconception_q)).all()

    # Question quality - questions with very high wrong rate
    quality_q = select(
        Engagement_events.question_id,
        func.count(Engagement_events.id).label("total"),
        func.sum(case((Engagement_events.is_correct.is_(True), 1), else_=0)).label("correct"),
    ).where(
        Engagement_events.event_type == "question_answered",
        Engagement_events.question_id.isnot(None),
        Engagement_events.created_at >= last_7d,
    ).group_by(Engagement_events.question_id).having(func.count(Engagement_events.id) >= 5)
    quality_result = (await db.execute(quality_q)).all()
    low_quality = [
        {"question_id": q[0], "total": q[1], "correct": q[2] or 0, "accuracy": round((q[2] or 0) / q[1] * 100, 1)}
        for q in quality_result if (q[2] or 0) / q[1] < 0.3
    ]

    # Friction points
    friction_q = select(
        Engagement_events.page_context,
        func.count(Engagement_events.id),
    ).where(
        Engagement_events.event_type.in_(["dropout", "boredom_signal", "page_exit"]),
        Engagement_events.created_at >= last_7d,
    ).group_by(Engagement_events.page_context).order_by(func.count(Engagement_events.id).desc()).limit(5)
    friction_result = (await db.execute(friction_q)).all()
    friction_points = [{"page": f[0] or "unknown", "events": f[1]} for f in friction_result]

    return {
        "dau_today": dau_today,
        "retention_7d_percent": round(retention_7d, 1),
        "mastery_growth": mastered_skills,
        "session_completion_rate": completion_rate,
        "total_sessions_7d": total,
        "common_misconceptions": [{"skill_id": m[0], "count": m[1]} for m in misconceptions],
        "low_quality_questions": low_quality[:5],
        "friction_points": friction_points,
        "pilot_health": _pilot_health_score(dau_today, retention_7d, completion_rate, len(low_quality)),
    }


def _pilot_health_score(dau: int, retention: float, completion: float, quality_issues: int) -> Dict[str, Any]:
    """Calculate overall pilot health score."""
    score = 0
    score += min(30, dau * 10)  # Up to 30 points for DAU
    score += min(30, retention * 0.3)  # Up to 30 for retention
    score += min(25, completion * 0.25)  # Up to 25 for completion
    score += max(0, 15 - quality_issues * 3)  # Up to 15, minus for quality issues

    score = min(100, int(score))
    status = "ممتاز" if score >= 80 else "جيد" if score >= 60 else "يحتاج متابعة" if score >= 40 else "حرج"

    return {"score": score, "status": status}


@router.post("/track-engagement")
async def track_engagement_event(
    event_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, str]:
    """Track a single engagement event from the frontend."""
    event = Engagement_events(
        user_id=current_user.get("sub", "anonymous"),
        event_type=event_data.get("event_type", "unknown"),
        skill_id=event_data.get("skill_id"),
        question_id=event_data.get("question_id"),
        session_id=event_data.get("session_id"),
        time_spent_seconds=event_data.get("time_spent_seconds"),
        is_correct=event_data.get("is_correct"),
        attempt_number=event_data.get("attempt_number"),
        page_context=event_data.get("page_context"),
        device_type=event_data.get("device_type"),
        extra_data=str(event_data.get("extra_data", "")),
    )
    db.add(event)
    await db.commit()
    return {"status": "tracked"}


@router.post("/parent-report")
async def submit_parent_report(
    report_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, str]:
    """Submit a parent report (confusion, usability, feedback)."""
    report = Parent_reports(
        user_id=current_user.get("sub", "anonymous"),
        child_user_id=report_data.get("child_user_id", ""),
        report_type=report_data.get("report_type", "feedback"),
        description=report_data.get("description", ""),
        severity=report_data.get("severity", "medium"),
        page_context=report_data.get("page_context", ""),
        status="open",
    )
    db.add(report)
    await db.commit()
    return {"status": "submitted"}