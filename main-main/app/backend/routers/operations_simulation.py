import logging
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.content_review_logs import Content_review_logs
from models.curriculum_domains import Curriculum_domains
from models.curriculum_questions import Curriculum_questions
from models.curriculum_skills import Curriculum_skills
from models.skill_prerequisites import Skill_prerequisites
from models.skill_remediation_paths import Skill_remediation_paths

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/operations", tags=["operations_simulation"])


# ---------- Schemas ----------
class AIQuestionDraft(BaseModel):
    skill_id: int
    question_text: str
    question_type: str = "multiple_choice"
    option_a: str
    option_b: str
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: str = "medium"
    misconception_tag: Optional[str] = None


class ReviewAction(BaseModel):
    question_id: int
    action: str  # 'approve', 'revise', 'reject'
    reviewer_notes: Optional[str] = None
    revised_text: Optional[str] = None


class ScalingSimRequest(BaseModel):
    num_skills: int = 100
    num_questions_per_skill: int = 10
    num_reviewers: int = 3


class FrictionPoint(BaseModel):
    area: str
    severity: str  # 'high', 'medium', 'low'
    description: str
    recommendation: str
    metric_value: Optional[float] = None


class OperationalMetrics(BaseModel):
    total_skills: int
    total_questions: int
    total_reviews: int
    avg_time_to_publish_days: float
    pending_reviews: int
    low_quality_questions: int
    skills_missing_remediation: int
    skills_missing_retention: int
    approval_bottleneck_count: int
    content_velocity_per_day: float
    friction_points: List[FrictionPoint]


class ContentLifecycleItem(BaseModel):
    entity_type: str
    entity_id: int
    name: str
    current_status: str
    transitions: List[Dict[str, Any]]
    days_in_current_status: int
    total_lifecycle_days: int


class WorkflowSimulationResult(BaseModel):
    simulated_roles: List[str]
    actions_performed: List[Dict[str, Any]]
    bottlenecks_detected: List[str]
    avg_review_time_hours: float
    rejection_rate: float
    total_items_processed: int


# ---------- AI-Assisted Question Workflow ----------
AI_WORKFLOW_STAGES = ["ai_draft", "academic_review", "revision", "approved", "published"]


@router.post("/ai-question-draft")
async def create_ai_question_draft(req: AIQuestionDraft, db: AsyncSession = Depends(get_db)):
    """Create an AI-generated question draft (status = ai_draft, NOT published)"""
    try:
        # Verify skill exists
        skill_result = await db.execute(
            select(Curriculum_skills).where(Curriculum_skills.id == req.skill_id)
        )
        skill = skill_result.scalar_one_or_none()
        if not skill:
            raise HTTPException(status_code=404, detail="Skill not found")

        # Create question with ai_draft status (never directly published)
        question = Curriculum_questions(
            skill_id=req.skill_id,
            question_text=req.question_text,
            question_type=req.question_type,
            option_a=req.option_a,
            option_b=req.option_b,
            option_c=req.option_c,
            option_d=req.option_d,
            correct_answer=req.correct_answer,
            explanation=req.explanation,
            difficulty=req.difficulty,
            misconception_tag=req.misconception_tag,
            review_status="draft",
            review_notes="AI-generated draft - requires academic review",
            has_visual=False,
            performance_score=0.0,
            attempt_count=0,
        )
        db.add(question)
        await db.flush()

        # Log the creation
        log = Content_review_logs(
            user_id="system_ai",
            entity_type="question",
            entity_id=question.id,
            action="ai_draft_created",
            previous_status="",
            new_status="draft",
            notes="AI-generated question draft created - pending academic review",
        )
        db.add(log)
        await db.commit()
        await db.refresh(question)

        return {
            "success": True,
            "question_id": question.id,
            "status": "draft",
            "message": "AI draft created. Requires academic review before publishing.",
            "next_step": "academic_review",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating AI draft: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review-question")
async def review_question(req: ReviewAction, db: AsyncSession = Depends(get_db)):
    """Academic reviewer reviews a question (approve/revise/reject)"""
    try:
        result = await db.execute(
            select(Curriculum_questions).where(Curriculum_questions.id == req.question_id)
        )
        question = result.scalar_one_or_none()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        current_status = question.review_status or "draft"

        if req.action == "approve":
            new_status = "approved"
        elif req.action == "revise":
            new_status = "draft"
            if req.revised_text:
                await db.execute(
                    update(Curriculum_questions)
                    .where(Curriculum_questions.id == req.question_id)
                    .values(question_text=req.revised_text)
                )
        elif req.action == "reject":
            new_status = "draft"
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

        await db.execute(
            update(Curriculum_questions)
            .where(Curriculum_questions.id == req.question_id)
            .values(
                review_status=new_status,
                review_notes=req.reviewer_notes or question.review_notes,
            )
        )

        log = Content_review_logs(
            user_id="academic_reviewer",
            entity_type="question",
            entity_id=req.question_id,
            action=f"review_{req.action}",
            previous_status=current_status,
            new_status=new_status,
            notes=req.reviewer_notes,
        )
        db.add(log)
        await db.commit()

        return {
            "success": True,
            "question_id": req.question_id,
            "previous_status": current_status,
            "new_status": new_status,
            "action": req.action,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing question: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Content Lifecycle Tracking ----------
@router.get("/content-lifecycle")
async def get_content_lifecycle(
    entity_type: str = "skill",
    status_filter: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get content lifecycle tracking for skills or questions"""
    try:
        items: List[ContentLifecycleItem] = []

        if entity_type == "skill":
            query = select(Curriculum_skills)
            if status_filter:
                query = query.where(Curriculum_skills.status == status_filter)
            query = query.order_by(Curriculum_skills.updated_at.desc()).limit(limit)
            result = await db.execute(query)
            entities = result.scalars().all()

            for entity in entities:
                # Get transition history
                logs_result = await db.execute(
                    select(Content_review_logs)
                    .where(
                        and_(
                            Content_review_logs.entity_type == "skill",
                            Content_review_logs.entity_id == entity.id,
                        )
                    )
                    .order_by(Content_review_logs.created_at.asc())
                )
                logs = logs_result.scalars().all()

                transitions = [
                    {
                        "from": log.previous_status,
                        "to": log.new_status,
                        "action": log.action,
                        "date": str(log.created_at) if log.created_at else None,
                        "notes": log.notes,
                    }
                    for log in logs
                ]

                days_in_current = (
                    (datetime.now() - entity.updated_at).days
                    if entity.updated_at
                    else 0
                )
                total_days = (
                    (datetime.now() - entity.created_at).days
                    if entity.created_at
                    else 0
                )

                items.append(
                    ContentLifecycleItem(
                        entity_type="skill",
                        entity_id=entity.id,
                        name=entity.name,
                        current_status=entity.status or "draft",
                        transitions=transitions,
                        days_in_current_status=days_in_current,
                        total_lifecycle_days=total_days,
                    )
                )

        elif entity_type == "question":
            query = select(Curriculum_questions)
            if status_filter:
                query = query.where(Curriculum_questions.review_status == status_filter)
            query = query.order_by(Curriculum_questions.updated_at.desc()).limit(limit)
            result = await db.execute(query)
            entities = result.scalars().all()

            for entity in entities:
                logs_result = await db.execute(
                    select(Content_review_logs)
                    .where(
                        and_(
                            Content_review_logs.entity_type == "question",
                            Content_review_logs.entity_id == entity.id,
                        )
                    )
                    .order_by(Content_review_logs.created_at.asc())
                )
                logs = logs_result.scalars().all()

                transitions = [
                    {
                        "from": log.previous_status,
                        "to": log.new_status,
                        "action": log.action,
                        "date": str(log.created_at) if log.created_at else None,
                        "notes": log.notes,
                    }
                    for log in logs
                ]

                days_in_current = (
                    (datetime.now() - entity.updated_at).days
                    if entity.updated_at
                    else 0
                )
                total_days = (
                    (datetime.now() - entity.created_at).days
                    if entity.created_at
                    else 0
                )

                items.append(
                    ContentLifecycleItem(
                        entity_type="question",
                        entity_id=entity.id,
                        name=entity.question_text[:60] + "..." if len(entity.question_text) > 60 else entity.question_text,
                        current_status=entity.review_status or "draft",
                        transitions=transitions,
                        days_in_current_status=days_in_current,
                        total_lifecycle_days=total_days,
                    )
                )

        return {"items": items, "total": len(items)}
    except Exception as e:
        logger.error(f"Error in content lifecycle: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Internal Analytics ----------
@router.get("/analytics")
async def get_operational_analytics(db: AsyncSession = Depends(get_db)):
    """Get comprehensive operational analytics and friction detection"""
    try:
        # Total counts
        total_skills_r = await db.execute(select(func.count(Curriculum_skills.id)))
        total_skills = total_skills_r.scalar() or 0

        total_questions_r = await db.execute(select(func.count(Curriculum_questions.id)))
        total_questions = total_questions_r.scalar() or 0

        total_reviews_r = await db.execute(select(func.count(Content_review_logs.id)))
        total_reviews = total_reviews_r.scalar() or 0

        # Pending reviews (items in 'review' status)
        pending_skills_r = await db.execute(
            select(func.count(Curriculum_skills.id)).where(Curriculum_skills.status == "review")
        )
        pending_questions_r = await db.execute(
            select(func.count(Curriculum_questions.id)).where(
                Curriculum_questions.review_status == "review"
            )
        )
        pending_reviews = (pending_skills_r.scalar() or 0) + (pending_questions_r.scalar() or 0)

        # Low quality questions (low performance_score or high attempt_count with low score)
        low_quality_r = await db.execute(
            select(func.count(Curriculum_questions.id)).where(
                and_(
                    Curriculum_questions.performance_score != None,
                    Curriculum_questions.performance_score < 0.3,
                    Curriculum_questions.attempt_count > 5,
                )
            )
        )
        low_quality_questions = low_quality_r.scalar() or 0

        # Skills missing remediation
        missing_remediation_r = await db.execute(
            select(func.count(Curriculum_skills.id)).where(
                and_(
                    Curriculum_skills.remediation_required == True,
                    ~Curriculum_skills.id.in_(
                        select(Skill_remediation_paths.skill_id)
                    ),
                )
            )
        )
        skills_missing_remediation = missing_remediation_r.scalar() or 0

        # Skills missing retention review setup
        missing_retention_r = await db.execute(
            select(func.count(Curriculum_skills.id)).where(
                and_(
                    Curriculum_skills.retention_review_days != None,
                    Curriculum_skills.retention_review_days > 0,
                    Curriculum_skills.status == "published",
                )
            )
        )
        # Count published skills that have retention set but no retention-tagged questions
        retention_skills = missing_retention_r.scalar() or 0
        retention_questions_r = await db.execute(
            select(func.count(func.distinct(Curriculum_questions.skill_id))).where(
                and_(
                    Curriculum_questions.retention_tag != None,
                    Curriculum_questions.retention_tag != "",
                )
            )
        )
        skills_with_retention_q = retention_questions_r.scalar() or 0
        skills_missing_retention = max(0, retention_skills - skills_with_retention_q)

        # Approval bottleneck: items stuck in 'approved' for more than 3 days
        three_days_ago = datetime.now() - timedelta(days=3)
        bottleneck_skills_r = await db.execute(
            select(func.count(Curriculum_skills.id)).where(
                and_(
                    Curriculum_skills.status == "approved",
                    Curriculum_skills.updated_at < three_days_ago,
                )
            )
        )
        bottleneck_questions_r = await db.execute(
            select(func.count(Curriculum_questions.id)).where(
                and_(
                    Curriculum_questions.review_status == "approved",
                    Curriculum_questions.updated_at < three_days_ago,
                )
            )
        )
        approval_bottleneck_count = (bottleneck_skills_r.scalar() or 0) + (
            bottleneck_questions_r.scalar() or 0
        )

        # Content velocity (items published in last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        published_recent_r = await db.execute(
            select(func.count(Content_review_logs.id)).where(
                and_(
                    Content_review_logs.new_status == "published",
                    Content_review_logs.created_at > seven_days_ago,
                )
            )
        )
        published_recent = published_recent_r.scalar() or 0
        content_velocity = published_recent / 7.0

        # Average time to publish (estimate from review logs)
        avg_time_to_publish = 0.0
        publish_logs_r = await db.execute(
            select(Content_review_logs)
            .where(Content_review_logs.new_status == "published")
            .order_by(Content_review_logs.created_at.desc())
            .limit(50)
        )
        publish_logs = publish_logs_r.scalars().all()
        if publish_logs:
            total_days_sum = 0
            count = 0
            for log in publish_logs:
                # Find earliest log for same entity
                first_log_r = await db.execute(
                    select(Content_review_logs.created_at)
                    .where(
                        and_(
                            Content_review_logs.entity_type == log.entity_type,
                            Content_review_logs.entity_id == log.entity_id,
                        )
                    )
                    .order_by(Content_review_logs.created_at.asc())
                    .limit(1)
                )
                first_log = first_log_r.scalar_one_or_none()
                if first_log and log.created_at:
                    diff = (log.created_at - first_log).total_seconds() / 86400
                    total_days_sum += diff
                    count += 1
            avg_time_to_publish = total_days_sum / count if count > 0 else 0.0

        # Friction detection
        friction_points: List[FrictionPoint] = []

        if pending_reviews > 10:
            friction_points.append(
                FrictionPoint(
                    area="مراجعة المحتوى",
                    severity="high",
                    description=f"{pending_reviews} عنصر في انتظار المراجعة",
                    recommendation="زيادة عدد المراجعين أو تقليل حجم الدفعات",
                    metric_value=float(pending_reviews),
                )
            )

        if approval_bottleneck_count > 5:
            friction_points.append(
                FrictionPoint(
                    area="اعتماد المحتوى",
                    severity="high",
                    description=f"{approval_bottleneck_count} عنصر معتمد لم يُنشر منذ 3+ أيام",
                    recommendation="تسريع عملية النشر بعد الاعتماد",
                    metric_value=float(approval_bottleneck_count),
                )
            )

        if low_quality_questions > 0:
            friction_points.append(
                FrictionPoint(
                    area="جودة الأسئلة",
                    severity="medium" if low_quality_questions < 10 else "high",
                    description=f"{low_quality_questions} سؤال بأداء ضعيف",
                    recommendation="مراجعة الأسئلة ذات الأداء المنخفض وتحسينها أو استبدالها",
                    metric_value=float(low_quality_questions),
                )
            )

        if skills_missing_remediation > 0:
            friction_points.append(
                FrictionPoint(
                    area="المسارات العلاجية",
                    severity="medium",
                    description=f"{skills_missing_remediation} مهارة تتطلب علاج بدون مسار علاجي",
                    recommendation="إنشاء مسارات علاجية للمهارات المفقودة",
                    metric_value=float(skills_missing_remediation),
                )
            )

        if skills_missing_retention > 0:
            friction_points.append(
                FrictionPoint(
                    area="مراجعة الاحتفاظ",
                    severity="low",
                    description=f"{skills_missing_retention} مهارة منشورة بدون أسئلة احتفاظ",
                    recommendation="إضافة أسئلة مراجعة احتفاظ للمهارات المنشورة",
                    metric_value=float(skills_missing_retention),
                )
            )

        if content_velocity < 1.0:
            friction_points.append(
                FrictionPoint(
                    area="سرعة الإنتاج",
                    severity="medium",
                    description=f"سرعة النشر {content_velocity:.1f} عنصر/يوم - أقل من المستهدف",
                    recommendation="تبسيط خطوات المراجعة أو استخدام AI لتسريع إنشاء المسودات",
                    metric_value=content_velocity,
                )
            )

        # Check for skills without enough questions
        skills_low_q_r = await db.execute(
            select(func.count(Curriculum_skills.id))
            .where(Curriculum_skills.status == "published")
            .where(
                ~Curriculum_skills.id.in_(
                    select(Curriculum_questions.skill_id)
                    .group_by(Curriculum_questions.skill_id)
                    .having(func.count(Curriculum_questions.id) >= 3)
                )
            )
        )
        skills_low_q = skills_low_q_r.scalar() or 0
        if skills_low_q > 0:
            friction_points.append(
                FrictionPoint(
                    area="تغطية الأسئلة",
                    severity="high",
                    description=f"{skills_low_q} مهارة منشورة بأقل من 3 أسئلة",
                    recommendation="إنشاء أسئلة إضافية باستخدام AI drafts",
                    metric_value=float(skills_low_q),
                )
            )

        return OperationalMetrics(
            total_skills=total_skills,
            total_questions=total_questions,
            total_reviews=total_reviews,
            avg_time_to_publish_days=round(avg_time_to_publish, 1),
            pending_reviews=pending_reviews,
            low_quality_questions=low_quality_questions,
            skills_missing_remediation=skills_missing_remediation,
            skills_missing_retention=skills_missing_retention,
            approval_bottleneck_count=approval_bottleneck_count,
            content_velocity_per_day=round(content_velocity, 2),
            friction_points=friction_points,
        )
    except Exception as e:
        logger.error(f"Error in operational analytics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Workflow Simulation ----------
@router.post("/simulate-workflow")
async def simulate_workflow(db: AsyncSession = Depends(get_db)):
    """Simulate a complete academic workflow with multiple roles"""
    try:
        actions_performed: List[Dict[str, Any]] = []
        bottlenecks: List[str] = []

        # Get some draft skills and questions to simulate on
        draft_skills_r = await db.execute(
            select(Curriculum_skills)
            .where(Curriculum_skills.status == "draft")
            .limit(10)
        )
        draft_skills = draft_skills_r.scalars().all()

        draft_questions_r = await db.execute(
            select(Curriculum_questions)
            .where(Curriculum_questions.review_status == "draft")
            .limit(20)
        )
        draft_questions = draft_questions_r.scalars().all()

        # Simulate editor creating content
        editor_actions = 0
        for skill in draft_skills[:3]:
            await db.execute(
                update(Curriculum_skills)
                .where(Curriculum_skills.id == skill.id)
                .values(status="review")
            )
            log = Content_review_logs(
                user_id="sim_editor",
                entity_type="skill",
                entity_id=skill.id,
                action="submit_for_review",
                previous_status="draft",
                new_status="review",
                notes="Simulated: Editor submitted for review",
            )
            db.add(log)
            editor_actions += 1
            actions_performed.append({
                "role": "academic_editor",
                "action": "submit_for_review",
                "entity": f"skill #{skill.id}",
                "result": "moved to review",
            })

        # Simulate reviewer reviewing content
        reviewer_actions = 0
        review_skills_r = await db.execute(
            select(Curriculum_skills)
            .where(Curriculum_skills.status == "review")
            .limit(5)
        )
        review_skills = review_skills_r.scalars().all()

        rejections = 0
        for skill in review_skills:
            # 70% approval rate
            if random.random() < 0.7:
                await db.execute(
                    update(Curriculum_skills)
                    .where(Curriculum_skills.id == skill.id)
                    .values(status="approved")
                )
                new_status = "approved"
                action = "approve"
            else:
                await db.execute(
                    update(Curriculum_skills)
                    .where(Curriculum_skills.id == skill.id)
                    .values(status="draft")
                )
                new_status = "draft"
                action = "reject"
                rejections += 1

            log = Content_review_logs(
                user_id="sim_reviewer",
                entity_type="skill",
                entity_id=skill.id,
                action=f"review_{action}",
                previous_status="review",
                new_status=new_status,
                notes=f"Simulated: Reviewer {action}",
            )
            db.add(log)
            reviewer_actions += 1
            actions_performed.append({
                "role": "reviewer",
                "action": action,
                "entity": f"skill #{skill.id}",
                "result": f"moved to {new_status}",
            })

        # Simulate admin publishing
        admin_actions = 0
        approved_skills_r = await db.execute(
            select(Curriculum_skills)
            .where(Curriculum_skills.status == "approved")
            .limit(3)
        )
        approved_skills = approved_skills_r.scalars().all()

        for skill in approved_skills:
            await db.execute(
                update(Curriculum_skills)
                .where(Curriculum_skills.id == skill.id)
                .values(status="published")
            )
            log = Content_review_logs(
                user_id="sim_admin",
                entity_type="skill",
                entity_id=skill.id,
                action="publish",
                previous_status="approved",
                new_status="published",
                notes="Simulated: Admin published",
            )
            db.add(log)
            admin_actions += 1
            actions_performed.append({
                "role": "admin",
                "action": "publish",
                "entity": f"skill #{skill.id}",
                "result": "published",
            })

        # Similarly for questions
        for q in draft_questions[:5]:
            await db.execute(
                update(Curriculum_questions)
                .where(Curriculum_questions.id == q.id)
                .values(review_status="review")
            )
            log = Content_review_logs(
                user_id="sim_editor",
                entity_type="question",
                entity_id=q.id,
                action="submit_for_review",
                previous_status="draft",
                new_status="review",
                notes="Simulated: Editor submitted question for review",
            )
            db.add(log)
            actions_performed.append({
                "role": "academic_editor",
                "action": "submit_for_review",
                "entity": f"question #{q.id}",
                "result": "moved to review",
            })

        await db.commit()

        # Detect bottlenecks
        total_actions = editor_actions + reviewer_actions + admin_actions
        rejection_rate = rejections / max(reviewer_actions, 1)

        if rejection_rate > 0.4:
            bottlenecks.append("معدل رفض مرتفع (>40%) - قد يحتاج المحررون لإرشادات أوضح")
        if len(approved_skills) == 0 and len(review_skills) > 3:
            bottlenecks.append("عنق زجاجة في الاعتماد - عناصر كثيرة في المراجعة بدون اعتماد")
        if admin_actions == 0 and len(approved_skills) > 0:
            bottlenecks.append("تأخر في النشر - عناصر معتمدة لم تُنشر")

        return WorkflowSimulationResult(
            simulated_roles=["academic_editor", "reviewer", "admin"],
            actions_performed=actions_performed,
            bottlenecks_detected=bottlenecks,
            avg_review_time_hours=random.uniform(2.0, 24.0),
            rejection_rate=round(rejection_rate, 2),
            total_items_processed=total_actions + len(draft_questions[:5]),
        )
    except Exception as e:
        logger.error(f"Error in workflow simulation: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Scaling Simulation ----------
@router.post("/simulate-scaling")
async def simulate_scaling(req: ScalingSimRequest, db: AsyncSession = Depends(get_db)):
    """Simulate content scaling to detect organizational collapse"""
    try:
        # Don't actually create 100 skills - just analyze current capacity
        current_skills_r = await db.execute(select(func.count(Curriculum_skills.id)))
        current_skills = current_skills_r.scalar() or 0

        current_questions_r = await db.execute(select(func.count(Curriculum_questions.id)))
        current_questions = current_questions_r.scalar() or 0

        # Calculate scaling metrics
        target_skills = req.num_skills
        target_questions = req.num_skills * req.num_questions_per_skill
        skills_gap = max(0, target_skills - current_skills)
        questions_gap = max(0, target_questions - current_questions)

        # Estimate time to reach target
        # Based on current velocity
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_skills_r = await db.execute(
            select(func.count(Curriculum_skills.id)).where(
                Curriculum_skills.created_at > seven_days_ago
            )
        )
        recent_skills = recent_skills_r.scalar() or 0
        skills_per_day = recent_skills / 7.0

        recent_questions_r = await db.execute(
            select(func.count(Curriculum_questions.id)).where(
                Curriculum_questions.created_at > seven_days_ago
            )
        )
        recent_questions = recent_questions_r.scalar() or 0
        questions_per_day = recent_questions / 7.0

        days_to_target_skills = skills_gap / max(skills_per_day, 0.1)
        days_to_target_questions = questions_gap / max(questions_per_day, 0.1)

        # Reviewer capacity analysis
        reviews_per_day_r = await db.execute(
            select(func.count(Content_review_logs.id)).where(
                Content_review_logs.created_at > seven_days_ago
            )
        )
        reviews_per_day = (reviews_per_day_r.scalar() or 0) / 7.0
        review_capacity_per_reviewer = reviews_per_day / max(req.num_reviewers, 1)

        # Scaling risks
        risks: List[Dict[str, Any]] = []

        if days_to_target_skills > 90:
            risks.append({
                "risk": "بطء إنتاج المهارات",
                "severity": "high",
                "detail": f"يحتاج {days_to_target_skills:.0f} يوم للوصول لـ {target_skills} مهارة",
                "mitigation": "استخدام AI drafts لتسريع الإنشاء",
            })

        if days_to_target_questions > 180:
            risks.append({
                "risk": "فجوة كبيرة في الأسئلة",
                "severity": "high",
                "detail": f"يحتاج {days_to_target_questions:.0f} يوم للوصول لـ {target_questions} سؤال",
                "mitigation": "زيادة استخدام AI drafts مع مراجعة أكاديمية مبسطة",
            })

        if review_capacity_per_reviewer > 20:
            risks.append({
                "risk": "حمل زائد على المراجعين",
                "severity": "medium",
                "detail": f"كل مراجع يحتاج مراجعة {review_capacity_per_reviewer:.0f} عنصر/يوم",
                "mitigation": "إضافة مراجعين أو تقليل نطاق المراجعة",
            })

        # Domain distribution check
        domain_dist_r = await db.execute(
            select(Curriculum_skills.domain_id, func.count(Curriculum_skills.id))
            .group_by(Curriculum_skills.domain_id)
        )
        domain_dist = {row[0]: row[1] for row in domain_dist_r.fetchall()}
        if domain_dist:
            max_domain = max(domain_dist.values())
            min_domain = min(domain_dist.values()) if len(domain_dist) > 1 else max_domain
            if max_domain > min_domain * 3:
                risks.append({
                    "risk": "توزيع غير متوازن بين المجالات",
                    "severity": "medium",
                    "detail": f"أكبر مجال ({max_domain}) أكثر بـ 3x من أصغر مجال ({min_domain})",
                    "mitigation": "التركيز على المجالات الأقل تغطية",
                })

        organizational_health = "healthy"
        if len([r for r in risks if r["severity"] == "high"]) >= 2:
            organizational_health = "at_risk"
        elif len([r for r in risks if r["severity"] == "high"]) >= 3:
            organizational_health = "critical"

        return {
            "current_state": {
                "skills": current_skills,
                "questions": current_questions,
                "skills_per_day": round(skills_per_day, 2),
                "questions_per_day": round(questions_per_day, 2),
                "reviews_per_day": round(reviews_per_day, 2),
            },
            "target": {
                "skills": target_skills,
                "questions": target_questions,
                "reviewers": req.num_reviewers,
            },
            "gap_analysis": {
                "skills_needed": skills_gap,
                "questions_needed": questions_gap,
                "days_to_target_skills": round(days_to_target_skills, 0),
                "days_to_target_questions": round(days_to_target_questions, 0),
            },
            "capacity": {
                "review_capacity_per_reviewer_per_day": round(review_capacity_per_reviewer, 1),
                "estimated_reviewer_load_at_scale": round(
                    (target_questions * 0.3) / max(req.num_reviewers, 1) / 30, 1
                ),
            },
            "risks": risks,
            "organizational_health": organizational_health,
        }
    except Exception as e:
        logger.error(f"Error in scaling simulation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Pipeline Status Summary ----------
@router.get("/pipeline-status")
async def get_pipeline_status(db: AsyncSession = Depends(get_db)):
    """Get a visual pipeline status showing items at each stage"""
    try:
        # Skills pipeline
        skills_pipeline_r = await db.execute(
            select(Curriculum_skills.status, func.count(Curriculum_skills.id))
            .group_by(Curriculum_skills.status)
        )
        skills_pipeline = {row[0] or "draft": row[1] for row in skills_pipeline_r.fetchall()}

        # Questions pipeline
        questions_pipeline_r = await db.execute(
            select(Curriculum_questions.review_status, func.count(Curriculum_questions.id))
            .group_by(Curriculum_questions.review_status)
        )
        questions_pipeline = {row[0] or "draft": row[1] for row in questions_pipeline_r.fetchall()}

        # Recent activity (last 24h)
        one_day_ago = datetime.now() - timedelta(days=1)
        recent_activity_r = await db.execute(
            select(
                Content_review_logs.action,
                func.count(Content_review_logs.id),
            )
            .where(Content_review_logs.created_at > one_day_ago)
            .group_by(Content_review_logs.action)
        )
        recent_activity = {row[0]: row[1] for row in recent_activity_r.fetchall()}

        # Stale items (in same status for > 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        stale_skills_r = await db.execute(
            select(func.count(Curriculum_skills.id)).where(
                and_(
                    Curriculum_skills.status.in_(["draft", "review"]),
                    Curriculum_skills.updated_at < seven_days_ago,
                )
            )
        )
        stale_questions_r = await db.execute(
            select(func.count(Curriculum_questions.id)).where(
                and_(
                    Curriculum_questions.review_status.in_(["draft", "review"]),
                    Curriculum_questions.updated_at < seven_days_ago,
                )
            )
        )

        return {
            "skills_pipeline": {
                "draft": skills_pipeline.get("draft", 0),
                "review": skills_pipeline.get("review", 0),
                "approved": skills_pipeline.get("approved", 0),
                "published": skills_pipeline.get("published", 0),
                "archived": skills_pipeline.get("archived", 0),
            },
            "questions_pipeline": {
                "draft": questions_pipeline.get("draft", 0),
                "review": questions_pipeline.get("review", 0),
                "approved": questions_pipeline.get("approved", 0),
                "published": questions_pipeline.get("published", 0),
                "archived": questions_pipeline.get("archived", 0),
            },
            "recent_activity_24h": recent_activity,
            "stale_items": {
                "skills": stale_skills_r.scalar() or 0,
                "questions": stale_questions_r.scalar() or 0,
            },
        }
    except Exception as e:
        logger.error(f"Error in pipeline status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))