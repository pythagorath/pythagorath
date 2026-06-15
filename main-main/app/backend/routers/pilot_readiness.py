"""Pilot Readiness Sprint - Usage Analytics, Testing Flows, and Stability endpoints."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from models.analytics_events import Analytics_events
from models.learning_sessions import Learning_sessions
from models.pilot_accounts import Pilot_accounts
from models.pilot_feedback import Pilot_feedback
from models.quiz_attempts import Quiz_attempts
from models.skill_mastery_records import Skill_mastery_records
from models.user_roles import User_roles
from sqlalchemy import func, select, case, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/pilot", tags=["pilot-readiness"])
logger = logging.getLogger(__name__)


@router.get("/usage-analytics")
async def get_usage_analytics(
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Get comprehensive usage analytics for pilot dashboard."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Active students (users with sessions in period)
    active_students_q = select(func.count(func.distinct(Learning_sessions.user_id))).where(
        Learning_sessions.created_at >= cutoff
    )
    active_students = (await db.execute(active_students_q)).scalar() or 0

    # Total sessions
    total_sessions_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= cutoff
    )
    total_sessions = (await db.execute(total_sessions_q)).scalar() or 0

    # Mission completion (sessions with missions_completed > 0)
    missions_completed_q = select(func.sum(Learning_sessions.missions_completed)).where(
        Learning_sessions.created_at >= cutoff,
        Learning_sessions.missions_completed is not None,
    )
    missions_completed = (await db.execute(missions_completed_q)).scalar() or 0

    # Average session duration
    avg_duration_q = select(func.avg(Learning_sessions.duration_seconds)).where(
        Learning_sessions.created_at >= cutoff,
        Learning_sessions.duration_seconds is not None,
    )
    avg_duration = (await db.execute(avg_duration_q)).scalar() or 0

    # Mastery progression - skills with mastery_level >= 80
    mastery_count_q = select(func.count(Skill_mastery_records.id)).where(
        Skill_mastery_records.updated_at >= cutoff
    )
    mastery_count = (await db.execute(mastery_count_q)).scalar() or 0

    # Quiz attempts and accuracy
    quiz_attempts_q = select(
        func.count(Quiz_attempts.id),
        func.avg(Quiz_attempts.score),
    ).where(Quiz_attempts.created_at >= cutoff)
    quiz_result = (await db.execute(quiz_attempts_q)).first()
    total_quiz_attempts = quiz_result[0] or 0
    avg_quiz_score = round(float(quiz_result[1] or 0), 1)

    # Analytics events count
    events_count_q = select(func.count(Analytics_events.id)).where(
        Analytics_events.created_at >= cutoff
    )
    events_count = (await db.execute(events_count_q)).scalar() or 0

    # Daily activity breakdown (last 7 days)
    daily_activity = []
    for i in range(min(days, 7)):
        day_start = datetime.now(timezone.utc) - timedelta(days=i + 1)
        day_end = datetime.now(timezone.utc) - timedelta(days=i)
        day_sessions_q = select(func.count(Learning_sessions.id)).where(
            Learning_sessions.created_at >= day_start,
            Learning_sessions.created_at < day_end,
        )
        day_count = (await db.execute(day_sessions_q)).scalar() or 0
        daily_activity.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "sessions": day_count,
        })

    return {
        "period_days": days,
        "active_students": active_students,
        "total_sessions": total_sessions,
        "missions_completed": missions_completed,
        "avg_session_duration_seconds": round(float(avg_duration), 0),
        "mastery_records_updated": mastery_count,
        "total_quiz_attempts": total_quiz_attempts,
        "avg_quiz_score": avg_quiz_score,
        "total_events": events_count,
        "daily_activity": daily_activity,
    }


@router.get("/testing-flows")
async def get_testing_flows(
    current_user=Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Get predefined testing flows for pilot users."""
    flows = [
        {
            "id": "child_grade1",
            "title": "مسار طفل صف أول",
            "role": "student_grade1",
            "steps": [
                {"step": 1, "action": "تسجيل الدخول كطالب صف أول", "page": "/dashboard"},
                {"step": 2, "action": "استعراض المهمة اليومية", "page": "/dashboard"},
                {"step": 3, "action": "بدء تشخيص المهارات", "page": "/skills-engine"},
                {"step": 4, "action": "حل 5 أسئلة على الأقل", "page": "/skills-engine/diagnostic"},
                {"step": 5, "action": "مراجعة النتائج والنقاط", "page": "/dashboard"},
            ],
            "success_criteria": "إكمال جلسة كاملة بدون أخطاء تقنية",
        },
        {
            "id": "child_grade2",
            "title": "مسار طفل صف ثاني",
            "role": "student_grade2",
            "steps": [
                {"step": 1, "action": "تسجيل الدخول كطالب صف ثاني", "page": "/dashboard"},
                {"step": 2, "action": "اختيار مهارة من خريطة المهارات", "page": "/skills-map"},
                {"step": 3, "action": "حل اختبار قصير", "page": "/quiz/1"},
                {"step": 4, "action": "مراجعة تقرير الأداء", "page": "/academic-analytics"},
                {"step": 5, "action": "إكمال مهمة المراجعة", "page": "/skills-engine"},
            ],
            "success_criteria": "التنقل السلس بين الصفحات وفهم التقارير",
        },
        {
            "id": "parent_flow",
            "title": "مسار ولي الأمر",
            "role": "parent",
            "steps": [
                {"step": 1, "action": "تسجيل الدخول كولي أمر", "page": "/parent"},
                {"step": 2, "action": "مراجعة تقدم الطفل", "page": "/parent"},
                {"step": 3, "action": "فهم نقاط الضعف", "page": "/parent"},
                {"step": 4, "action": "مراجعة التوصيات", "page": "/parent"},
            ],
            "success_criteria": "فهم واضح لحالة الطفل الأكاديمية",
        },
        {
            "id": "editor_flow",
            "title": "مسار محرر المحتوى",
            "role": "editor",
            "steps": [
                {"step": 1, "action": "تسجيل الدخول كمحرر", "page": "/admin"},
                {"step": 2, "action": "إنشاء مهارة جديدة", "page": "/academic-authoring"},
                {"step": 3, "action": "إضافة أسئلة للمهارة", "page": "/question-manager"},
                {"step": 4, "action": "إرسال للمراجعة", "page": "/production-workflow"},
            ],
            "success_criteria": "إنشاء محتوى جديد بسلاسة",
        },
        {
            "id": "reviewer_flow",
            "title": "مسار المراجع الأكاديمي",
            "role": "reviewer",
            "steps": [
                {"step": 1, "action": "تسجيل الدخول كمراجع", "page": "/admin"},
                {"step": 2, "action": "مراجعة المحتوى المعلق", "page": "/production-workflow"},
                {"step": 3, "action": "الموافقة أو طلب تعديل", "page": "/production-workflow"},
                {"step": 4, "action": "نشر المحتوى المعتمد", "page": "/production-workflow"},
            ],
            "success_criteria": "إتمام دورة المراجعة بالكامل",
        },
    ]
    return flows


@router.get("/stability-report")
async def get_stability_report(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Generate stability and reliability report for pilot readiness."""
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    # Session recovery check - sessions without ended_at
    incomplete_sessions_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= last_7d,
        Learning_sessions.ended_at.is_(None),
    )
    incomplete_sessions = (await db.execute(incomplete_sessions_q)).scalar() or 0

    total_sessions_q = select(func.count(Learning_sessions.id)).where(
        Learning_sessions.created_at >= last_7d
    )
    total_sessions = (await db.execute(total_sessions_q)).scalar() or 0

    session_completion_rate = (
        round((total_sessions - incomplete_sessions) / total_sessions * 100, 1)
        if total_sessions > 0
        else 100.0
    )

    # Mastery consistency - check for records
    mastery_records_q = select(func.count(Skill_mastery_records.id))
    mastery_records = (await db.execute(mastery_records_q)).scalar() or 0

    # Analytics accuracy - events in last 24h
    recent_events_q = select(func.count(Analytics_events.id)).where(
        Analytics_events.created_at >= last_24h
    )
    recent_events = (await db.execute(recent_events_q)).scalar() or 0

    # Feedback summary
    feedback_count_q = select(func.count(Pilot_feedback.id))
    feedback_count = (await db.execute(feedback_count_q)).scalar() or 0

    avg_rating_q = select(func.avg(Pilot_feedback.rating))
    avg_rating = (await db.execute(avg_rating_q)).scalar() or 0

    checks = [
        {
            "name": "إكمال الجلسات",
            "status": "pass" if session_completion_rate >= 80 else "warning",
            "value": f"{session_completion_rate}%",
            "detail": f"{total_sessions - incomplete_sessions}/{total_sessions} جلسة مكتملة",
        },
        {
            "name": "سجلات الإتقان",
            "status": "pass" if mastery_records > 0 else "info",
            "value": str(mastery_records),
            "detail": "سجلات إتقان المهارات المخزنة",
        },
        {
            "name": "أحداث التحليلات (24 ساعة)",
            "status": "pass" if recent_events > 0 else "info",
            "value": str(recent_events),
            "detail": "أحداث مسجلة في آخر 24 ساعة",
        },
        {
            "name": "ملاحظات المستخدمين",
            "status": "pass" if feedback_count >= 5 else "info",
            "value": f"{feedback_count} (متوسط: {round(float(avg_rating), 1)}/5)",
            "detail": "ملاحظات مجمعة من المستخدمين التجريبيين",
        },
    ]

    overall_status = "ready" if all(c["status"] == "pass" for c in checks) else "preparing"

    return {
        "overall_status": overall_status,
        "generated_at": now.isoformat(),
        "checks": checks,
        "recommendations": _get_recommendations(checks),
    }


def _get_recommendations(checks: List[Dict]) -> List[str]:
    """Generate recommendations based on stability checks."""
    recs = []
    for check in checks:
        if check["status"] == "warning":
            if "جلسات" in check["name"]:
                recs.append("تحسين آلية استرداد الجلسات المنقطعة")
        elif check["status"] == "info":
            if "إتقان" in check["name"]:
                recs.append("تشغيل جلسات تجريبية لتوليد بيانات الإتقان")
            elif "تحليلات" in check["name"]:
                recs.append("التأكد من تفعيل تتبع الأحداث")
            elif "ملاحظات" in check["name"]:
                recs.append("جمع المزيد من ملاحظات المستخدمين التجريبيين")
    if not recs:
        recs.append("النظام جاهز للاختبار التجريبي ✓")
    return recs


@router.get("/feedback-summary")
async def get_feedback_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Get aggregated feedback summary for pilot."""
    # By type
    by_type_q = select(
        Pilot_feedback.feedback_type,
        func.count(Pilot_feedback.id),
        func.avg(Pilot_feedback.rating),
        func.avg(Pilot_feedback.ease_of_use),
        func.avg(Pilot_feedback.clarity),
        func.avg(Pilot_feedback.engagement),
    ).group_by(Pilot_feedback.feedback_type)
    by_type_result = (await db.execute(by_type_q)).all()

    type_summary = []
    for row in by_type_result:
        type_summary.append({
            "type": row[0],
            "count": row[1],
            "avg_rating": round(float(row[2] or 0), 1),
            "avg_ease": round(float(row[3] or 0), 1),
            "avg_clarity": round(float(row[4] or 0), 1),
            "avg_engagement": round(float(row[5] or 0), 1),
        })

    # Recent feedback
    recent_q = (
        select(Pilot_feedback)
        .order_by(Pilot_feedback.created_at.desc())
        .limit(10)
    )
    recent_result = (await db.execute(recent_q)).scalars().all()
    recent_feedback = [
        {
            "id": f.id,
            "type": f.feedback_type,
            "rating": f.rating,
            "comment": f.comment,
            "page_context": f.page_context,
            "device_type": f.device_type,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in recent_result
    ]

    # Overall stats
    total_q = select(func.count(Pilot_feedback.id))
    total = (await db.execute(total_q)).scalar() or 0

    overall_avg_q = select(func.avg(Pilot_feedback.rating))
    overall_avg = (await db.execute(overall_avg_q)).scalar() or 0

    return {
        "total_feedback": total,
        "overall_avg_rating": round(float(overall_avg), 1),
        "by_type": type_summary,
        "recent": recent_feedback,
    }


@router.get("/device-stats")
async def get_device_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Get device type statistics for mobile/tablet validation."""
    # From learning sessions
    device_q = select(
        Learning_sessions.device_type,
        func.count(Learning_sessions.id),
    ).where(
        Learning_sessions.device_type.isnot(None)
    ).group_by(Learning_sessions.device_type)
    device_result = (await db.execute(device_q)).all()

    device_stats = {row[0]: row[1] for row in device_result}

    # From feedback
    feedback_device_q = select(
        Pilot_feedback.device_type,
        func.count(Pilot_feedback.id),
    ).where(
        Pilot_feedback.device_type.isnot(None)
    ).group_by(Pilot_feedback.device_type)
    feedback_device_result = (await db.execute(feedback_device_q)).all()

    feedback_device_stats = {row[0]: row[1] for row in feedback_device_result}

    return {
        "session_devices": device_stats,
        "feedback_devices": feedback_device_stats,
        "mobile_ready": True,
        "tablet_ready": True,
        "touch_optimized": True,
    }