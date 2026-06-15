import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.curriculum_skills import Curriculum_skills
from models.curriculum_questions import Curriculum_questions
from models.curriculum_domains import Curriculum_domains
from models.skill_prerequisites import Skill_prerequisites
from models.skill_remediation_paths import Skill_remediation_paths
from models.content_review_logs import Content_review_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/academic-production", tags=["academic_production"])


# ---------- Request/Response Schemas ----------
class TransitionRequest(BaseModel):
    entity_type: str  # 'skill' or 'question'
    entity_id: int
    new_status: str
    notes: Optional[str] = None


class BulkTransitionRequest(BaseModel):
    entity_type: str
    entity_ids: List[int]
    new_status: str
    notes: Optional[str] = None


class SkillCreateRequest(BaseModel):
    name: str
    grade: str
    domain_id: Optional[int] = None
    difficulty_level: Optional[str] = "medium"
    mastery_threshold: Optional[float] = 0.8
    min_questions_required: Optional[int] = 3
    min_visual_questions: Optional[int] = 1
    remediation_required: Optional[bool] = False
    retention_review_days: Optional[int] = 7
    status: Optional[str] = "draft"
    prerequisite_ids: Optional[List[int]] = None


class SkillUpdateRequest(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    domain_id: Optional[int] = None
    difficulty_level: Optional[str] = None
    mastery_threshold: Optional[float] = None
    min_questions_required: Optional[int] = None
    min_visual_questions: Optional[int] = None
    remediation_required: Optional[bool] = None
    retention_review_days: Optional[int] = None
    status: Optional[str] = None
    prerequisite_ids: Optional[List[int]] = None


class QACheck(BaseModel):
    check_name: str
    status: str  # 'pass', 'warning', 'fail'
    details: str
    affected_items: int


class QAReportResponse(BaseModel):
    total_checks: int
    passed: int
    warnings: int
    failures: int
    checks: List[QACheck]


class WorkflowStatsResponse(BaseModel):
    skills_draft: int
    skills_review: int
    skills_approved: int
    skills_published: int
    questions_draft: int
    questions_review: int
    questions_approved: int
    questions_published: int
    recent_reviews: List[Dict[str, Any]]


# ---------- Workflow Transitions ----------
VALID_TRANSITIONS = {
    "draft": ["review"],
    "review": ["approved", "draft"],
    "approved": ["published", "review"],
    "published": ["approved"],
}


@router.post("/transition")
async def transition_status(req: TransitionRequest, db: AsyncSession = Depends(get_db)):
    """Transition a skill or question to a new status"""
    try:
        if req.entity_type == "skill":
            result = await db.execute(
                select(Curriculum_skills).where(Curriculum_skills.id == req.entity_id)
            )
            entity = result.scalar_one_or_none()
            if not entity:
                raise HTTPException(status_code=404, detail="Skill not found")
            current_status = entity.status or "draft"

            if req.new_status not in VALID_TRANSITIONS.get(current_status, []):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid transition from '{current_status}' to '{req.new_status}'"
                )

            await db.execute(
                update(Curriculum_skills)
                .where(Curriculum_skills.id == req.entity_id)
                .values(status=req.new_status)
            )

        elif req.entity_type == "question":
            result = await db.execute(
                select(Curriculum_questions).where(Curriculum_questions.id == req.entity_id)
            )
            entity = result.scalar_one_or_none()
            if not entity:
                raise HTTPException(status_code=404, detail="Question not found")
            current_status = entity.review_status or "draft"

            if req.new_status not in VALID_TRANSITIONS.get(current_status, []):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid transition from '{current_status}' to '{req.new_status}'"
                )

            await db.execute(
                update(Curriculum_questions)
                .where(Curriculum_questions.id == req.entity_id)
                .values(review_status=req.new_status)
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid entity_type")

        # Log the review action
        review_log = Content_review_logs(
            user_id="system",
            entity_type=req.entity_type,
            entity_id=req.entity_id,
            action="status_transition",
            previous_status=current_status,
            new_status=req.new_status,
            notes=req.notes,
        )
        db.add(review_log)
        await db.commit()

        return {"success": True, "message": f"Transitioned to {req.new_status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in transition: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-transition")
async def bulk_transition(req: BulkTransitionRequest, db: AsyncSession = Depends(get_db)):
    """Bulk transition multiple items to a new status"""
    try:
        transitioned = 0
        for entity_id in req.entity_ids:
            try:
                if req.entity_type == "skill":
                    result = await db.execute(
                        select(Curriculum_skills).where(Curriculum_skills.id == entity_id)
                    )
                    entity = result.scalar_one_or_none()
                    if not entity:
                        continue
                    current_status = entity.status or "draft"
                    if req.new_status in VALID_TRANSITIONS.get(current_status, []):
                        await db.execute(
                            update(Curriculum_skills)
                            .where(Curriculum_skills.id == entity_id)
                            .values(status=req.new_status)
                        )
                        transitioned += 1

                elif req.entity_type == "question":
                    result = await db.execute(
                        select(Curriculum_questions).where(Curriculum_questions.id == entity_id)
                    )
                    entity = result.scalar_one_or_none()
                    if not entity:
                        continue
                    current_status = entity.review_status or "draft"
                    if req.new_status in VALID_TRANSITIONS.get(current_status, []):
                        await db.execute(
                            update(Curriculum_questions)
                            .where(Curriculum_questions.id == entity_id)
                            .values(review_status=req.new_status)
                        )
                        transitioned += 1

                # Log each transition
                review_log = Content_review_logs(
                    user_id="system",
                    entity_type=req.entity_type,
                    entity_id=entity_id,
                    action="bulk_transition",
                    previous_status=current_status,
                    new_status=req.new_status,
                    notes=req.notes,
                )
                db.add(review_log)
            except Exception:
                continue

        await db.commit()
        return {"success": True, "transitioned": transitioned, "total": len(req.entity_ids)}
    except Exception as e:
        logger.error(f"Error in bulk transition: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Workflow Stats ----------
@router.get("/workflow-stats", response_model=WorkflowStatsResponse)
async def get_workflow_stats(db: AsyncSession = Depends(get_db)):
    """Get workflow pipeline statistics"""
    try:
        # Skills by status
        skills_status = await db.execute(
            select(Curriculum_skills.status, func.count(Curriculum_skills.id))
            .group_by(Curriculum_skills.status)
        )
        skills_map = {row[0] or "draft": row[1] for row in skills_status.fetchall()}

        # Questions by status
        questions_status = await db.execute(
            select(Curriculum_questions.review_status, func.count(Curriculum_questions.id))
            .group_by(Curriculum_questions.review_status)
        )
        questions_map = {row[0] or "draft": row[1] for row in questions_status.fetchall()}

        # Recent reviews
        recent = await db.execute(
            select(Content_review_logs)
            .order_by(Content_review_logs.created_at.desc())
            .limit(10)
        )
        recent_reviews = []
        for row in recent.scalars().all():
            recent_reviews.append({
                "id": row.id,
                "entity_type": row.entity_type,
                "entity_id": row.entity_id,
                "action": row.action,
                "previous_status": row.previous_status,
                "new_status": row.new_status,
                "notes": row.notes,
                "created_at": str(row.created_at) if row.created_at else None,
            })

        return WorkflowStatsResponse(
            skills_draft=skills_map.get("draft", 0),
            skills_review=skills_map.get("review", 0),
            skills_approved=skills_map.get("approved", 0),
            skills_published=skills_map.get("published", 0),
            questions_draft=questions_map.get("draft", 0),
            questions_review=questions_map.get("review", 0),
            questions_approved=questions_map.get("approved", 0),
            questions_published=questions_map.get("published", 0),
            recent_reviews=recent_reviews,
        )
    except Exception as e:
        logger.error(f"Error in workflow stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------- QA Report ----------
@router.get("/qa-report", response_model=QAReportResponse)
async def get_qa_report(db: AsyncSession = Depends(get_db)):
    """Run quality assurance checks on the content"""
    try:
        checks: List[QACheck] = []

        # Check 1: Skills with insufficient questions
        q_count_subq = (
            select(
                Curriculum_questions.skill_id,
                func.count(Curriculum_questions.id).label("q_count")
            )
            .group_by(Curriculum_questions.skill_id)
            .subquery()
        )
        insufficient_q = await db.execute(
            select(func.count(Curriculum_skills.id))
            .outerjoin(q_count_subq, Curriculum_skills.id == q_count_subq.c.skill_id)
            .where(
                func.coalesce(q_count_subq.c.q_count, 0) < func.coalesce(Curriculum_skills.min_questions_required, 3)
            )
        )
        insufficient_count = insufficient_q.scalar() or 0
        checks.append(QACheck(
            check_name="كفاية الأسئلة لكل مهارة",
            status="pass" if insufficient_count == 0 else ("warning" if insufficient_count < 5 else "fail"),
            details=f"{insufficient_count} مهارة لا تملك الحد الأدنى من الأسئلة" if insufficient_count > 0 else "جميع المهارات تملك أسئلة كافية",
            affected_items=insufficient_count,
        ))

        # Check 2: Prerequisite integrity (no circular dependencies)
        prereq_result = await db.execute(
            select(Skill_prerequisites.skill_id, Skill_prerequisites.prerequisite_skill_id)
        )
        prereqs = prereq_result.fetchall()
        circular_count = 0
        prereq_map: Dict[int, List[int]] = {}
        for row in prereqs:
            prereq_map.setdefault(row[0], []).append(row[1])

        # Simple cycle detection
        for skill_id in prereq_map:
            visited = set()
            stack = [skill_id]
            while stack:
                current = stack.pop()
                if current in visited:
                    if current == skill_id:
                        circular_count += 1
                        break
                    continue
                visited.add(current)
                stack.extend(prereq_map.get(current, []))

        checks.append(QACheck(
            check_name="سلامة المتطلبات السابقة",
            status="pass" if circular_count == 0 else "fail",
            details=f"{circular_count} دورة دائرية مكتشفة" if circular_count > 0 else "لا توجد تبعيات دائرية",
            affected_items=circular_count,
        ))

        # Check 3: Difficulty balance per grade
        difficulty_result = await db.execute(
            select(
                Curriculum_skills.grade,
                Curriculum_skills.difficulty_level,
                func.count(Curriculum_skills.id)
            )
            .group_by(Curriculum_skills.grade, Curriculum_skills.difficulty_level)
        )
        grade_difficulty: Dict[str, Dict[str, int]] = {}
        for row in difficulty_result.fetchall():
            grade = row[0] or "unknown"
            diff = row[1] or "medium"
            grade_difficulty.setdefault(grade, {})
            grade_difficulty[grade][diff] = row[2]

        imbalanced_grades = 0
        for grade, diffs in grade_difficulty.items():
            total = sum(diffs.values())
            if total > 5:
                easy_pct = diffs.get("easy", 0) / total
                hard_pct = diffs.get("hard", 0) / total
                if easy_pct < 0.15 or hard_pct > 0.5:
                    imbalanced_grades += 1

        checks.append(QACheck(
            check_name="توازن مستويات الصعوبة",
            status="pass" if imbalanced_grades == 0 else "warning",
            details=f"{imbalanced_grades} صف غير متوازن" if imbalanced_grades > 0 else "توزيع الصعوبة متوازن",
            affected_items=imbalanced_grades,
        ))

        # Check 4: Misconception coverage
        questions_with_misconception = await db.execute(
            select(func.count(Curriculum_questions.id))
            .where(
                and_(
                    Curriculum_questions.misconception_tag != None,
                    Curriculum_questions.misconception_tag != ""
                )
            )
        )
        misconception_count = questions_with_misconception.scalar() or 0

        total_questions_result = await db.execute(
            select(func.count(Curriculum_questions.id))
        )
        total_questions = total_questions_result.scalar() or 0

        misconception_pct = (misconception_count / total_questions * 100) if total_questions > 0 else 0
        checks.append(QACheck(
            check_name="تغطية المفاهيم الخاطئة",
            status="pass" if misconception_pct >= 30 else ("warning" if misconception_pct >= 15 else "fail"),
            details=f"{misconception_pct:.0f}% من الأسئلة مرتبطة بمفاهيم خاطئة ({misconception_count}/{total_questions})",
            affected_items=total_questions - misconception_count,
        ))

        # Check 5: Published skills without enough published questions
        published_skills_result = await db.execute(
            select(Curriculum_skills.id)
            .where(Curriculum_skills.status == "published")
        )
        published_skill_ids = [row[0] for row in published_skills_result.fetchall()]

        underprepared_published = 0
        for skill_id in published_skill_ids:
            pub_q_count = await db.execute(
                select(func.count(Curriculum_questions.id))
                .where(
                    and_(
                        Curriculum_questions.skill_id == skill_id,
                        Curriculum_questions.review_status == "published"
                    )
                )
            )
            if (pub_q_count.scalar() or 0) < 3:
                underprepared_published += 1

        checks.append(QACheck(
            check_name="مهارات منشورة بأسئلة كافية",
            status="pass" if underprepared_published == 0 else "fail",
            details=f"{underprepared_published} مهارة منشورة بأقل من 3 أسئلة منشورة" if underprepared_published > 0 else "جميع المهارات المنشورة لديها أسئلة كافية",
            affected_items=underprepared_published,
        ))

        # Check 6: Skills without any domain assignment
        no_domain = await db.execute(
            select(func.count(Curriculum_skills.id))
            .where(
                (Curriculum_skills.domain_id == None) | (Curriculum_skills.domain_id == 0)
            )
        )
        no_domain_count = no_domain.scalar() or 0
        checks.append(QACheck(
            check_name="تصنيف المهارات في مجالات",
            status="pass" if no_domain_count == 0 else "warning",
            details=f"{no_domain_count} مهارة بدون مجال محدد" if no_domain_count > 0 else "جميع المهارات مصنفة",
            affected_items=no_domain_count,
        ))

        passed = sum(1 for c in checks if c.status == "pass")
        warnings = sum(1 for c in checks if c.status == "warning")
        failures = sum(1 for c in checks if c.status == "fail")

        return QAReportResponse(
            total_checks=len(checks),
            passed=passed,
            warnings=warnings,
            failures=failures,
            checks=checks,
        )
    except Exception as e:
        logger.error(f"Error in QA report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Skill CRUD (Authoring) ----------
@router.post("/skills")
async def create_skill(req: SkillCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new skill with optional prerequisites"""
    try:
        skill = Curriculum_skills(
            name=req.name,
            grade=req.grade,
            domain_id=req.domain_id,
            difficulty_level=req.difficulty_level,
            mastery_threshold=req.mastery_threshold,
            min_questions_required=req.min_questions_required,
            min_visual_questions=req.min_visual_questions,
            remediation_required=req.remediation_required,
            retention_review_days=req.retention_review_days,
            status=req.status or "draft",
        )
        db.add(skill)
        await db.flush()

        # Add prerequisites
        if req.prerequisite_ids:
            for prereq_id in req.prerequisite_ids:
                prereq = Skill_prerequisites(
                    skill_id=skill.id,
                    prerequisite_skill_id=prereq_id,
                )
                db.add(prereq)

        await db.commit()
        await db.refresh(skill)
        return {"success": True, "skill_id": skill.id}
    except Exception as e:
        logger.error(f"Error creating skill: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: int, req: SkillUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Update an existing skill"""
    try:
        result = await db.execute(
            select(Curriculum_skills).where(Curriculum_skills.id == skill_id)
        )
        skill = result.scalar_one_or_none()
        if not skill:
            raise HTTPException(status_code=404, detail="Skill not found")

        update_data = req.dict(exclude_unset=True, exclude_none=True)
        prerequisite_ids = update_data.pop("prerequisite_ids", None)

        if update_data:
            await db.execute(
                update(Curriculum_skills)
                .where(Curriculum_skills.id == skill_id)
                .values(**update_data)
            )

        # Update prerequisites if provided
        if prerequisite_ids is not None:
            # Remove existing
            from sqlalchemy import delete
            await db.execute(
                delete(Skill_prerequisites).where(Skill_prerequisites.skill_id == skill_id)
            )
            # Add new
            for prereq_id in prerequisite_ids:
                prereq = Skill_prerequisites(
                    skill_id=skill_id,
                    prerequisite_skill_id=prereq_id,
                )
                db.add(prereq)

        await db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating skill: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a skill"""
    try:
        from sqlalchemy import delete
        # Remove prerequisites
        await db.execute(
            delete(Skill_prerequisites).where(Skill_prerequisites.skill_id == skill_id)
        )
        await db.execute(
            delete(Skill_prerequisites).where(Skill_prerequisites.prerequisite_skill_id == skill_id)
        )
        # Remove skill
        await db.execute(
            delete(Curriculum_skills).where(Curriculum_skills.id == skill_id)
        )
        await db.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting skill: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/{skill_id}/prerequisites")
async def get_skill_prerequisites(skill_id: int, db: AsyncSession = Depends(get_db)):
    """Get prerequisites for a skill"""
    try:
        result = await db.execute(
            select(Skill_prerequisites.prerequisite_skill_id)
            .where(Skill_prerequisites.skill_id == skill_id)
        )
        prereq_ids = [row[0] for row in result.fetchall()]

        # Get skill names
        if prereq_ids:
            skills_result = await db.execute(
                select(Curriculum_skills.id, Curriculum_skills.name)
                .where(Curriculum_skills.id.in_(prereq_ids))
            )
            prerequisites = [{"id": row[0], "name": row[1]} for row in skills_result.fetchall()]
        else:
            prerequisites = []

        return {"skill_id": skill_id, "prerequisites": prerequisites}
    except Exception as e:
        logger.error(f"Error getting prerequisites: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))