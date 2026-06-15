import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, case, and_, outerjoin
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.curriculum_domains import Curriculum_domains
from models.curriculum_skills import Curriculum_skills
from models.curriculum_questions import Curriculum_questions
from models.skill_remediation_paths import Skill_remediation_paths
from models.skill_prerequisites import Skill_prerequisites

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/content-analytics", tags=["content_analytics"])


# ---------- Response Schemas ----------
class OverviewResponse(BaseModel):
    total_domains: int
    total_skills: int
    skills_by_status: Dict[str, int]
    total_questions: int
    questions_by_status: Dict[str, int]
    skills_missing_min_questions: int
    skills_missing_visual_questions: int
    skills_without_remediation: int
    skills_without_retention: int


class GapItem(BaseModel):
    skill_id: int
    skill_name: str
    grade: str
    domain_name: Optional[str] = None
    gap_type: str
    details: str


class GapsResponse(BaseModel):
    total_gaps: int
    gaps: List[GapItem]


class CoverageItem(BaseModel):
    grade: str
    domain_name: str
    total_skills: int
    total_questions: int
    approved_percentage: float
    draft_percentage: float


class CoverageResponse(BaseModel):
    coverage: List[CoverageItem]


# ---------- Routes ----------
@router.get("/overview", response_model=OverviewResponse)
async def get_content_overview(db: AsyncSession = Depends(get_db)):
    """Get summary statistics for content operations"""
    try:
        # Total domains
        domain_count = await db.execute(select(func.count(Curriculum_domains.id)))
        total_domains = domain_count.scalar() or 0

        # Total skills and by status
        skill_count = await db.execute(select(func.count(Curriculum_skills.id)))
        total_skills = skill_count.scalar() or 0

        skills_status_query = await db.execute(
            select(
                Curriculum_skills.status,
                func.count(Curriculum_skills.id)
            ).group_by(Curriculum_skills.status)
        )
        skills_by_status = {row[0] or "draft": row[1] for row in skills_status_query.fetchall()}

        # Total questions and by review status
        question_count = await db.execute(select(func.count(Curriculum_questions.id)))
        total_questions = question_count.scalar() or 0

        questions_status_query = await db.execute(
            select(
                Curriculum_questions.review_status,
                func.count(Curriculum_questions.id)
            ).group_by(Curriculum_questions.review_status)
        )
        questions_by_status = {row[0] or "draft": row[1] for row in questions_status_query.fetchall()}

        # Skills missing minimum questions
        # Subquery: count questions per skill
        q_count_subq = (
            select(
                Curriculum_questions.skill_id,
                func.count(Curriculum_questions.id).label("q_count")
            )
            .group_by(Curriculum_questions.skill_id)
            .subquery()
        )

        missing_min_q = await db.execute(
            select(func.count(Curriculum_skills.id))
            .outerjoin(q_count_subq, Curriculum_skills.id == q_count_subq.c.skill_id)
            .where(
                (func.coalesce(q_count_subq.c.q_count, 0) < func.coalesce(Curriculum_skills.min_questions_required, 3))
            )
        )
        skills_missing_min_questions = missing_min_q.scalar() or 0

        # Skills missing visual questions
        visual_count_subq = (
            select(
                Curriculum_questions.skill_id,
                func.count(Curriculum_questions.id).label("visual_count")
            )
            .where(Curriculum_questions.has_visual == True)
            .group_by(Curriculum_questions.skill_id)
            .subquery()
        )

        missing_visual = await db.execute(
            select(func.count(Curriculum_skills.id))
            .outerjoin(visual_count_subq, Curriculum_skills.id == visual_count_subq.c.skill_id)
            .where(
                and_(
                    Curriculum_skills.min_visual_questions != None,
                    Curriculum_skills.min_visual_questions > 0,
                    func.coalesce(visual_count_subq.c.visual_count, 0) < Curriculum_skills.min_visual_questions
                )
            )
        )
        skills_missing_visual_questions = missing_visual.scalar() or 0

        # Skills without remediation paths
        remediation_subq = (
            select(Skill_remediation_paths.skill_id)
            .distinct()
            .subquery()
        )
        no_remediation = await db.execute(
            select(func.count(Curriculum_skills.id))
            .where(
                and_(
                    Curriculum_skills.remediation_required == True,
                    ~Curriculum_skills.id.in_(select(remediation_subq.c.skill_id))
                )
            )
        )
        skills_without_remediation = no_remediation.scalar() or 0

        # Skills without retention rules
        no_retention = await db.execute(
            select(func.count(Curriculum_skills.id))
            .where(
                (Curriculum_skills.retention_review_days == None) | (Curriculum_skills.retention_review_days == 0)
            )
        )
        skills_without_retention = no_retention.scalar() or 0

        return OverviewResponse(
            total_domains=total_domains,
            total_skills=total_skills,
            skills_by_status=skills_by_status,
            total_questions=total_questions,
            questions_by_status=questions_by_status,
            skills_missing_min_questions=skills_missing_min_questions,
            skills_missing_visual_questions=skills_missing_visual_questions,
            skills_without_remediation=skills_without_remediation,
            skills_without_retention=skills_without_retention,
        )
    except Exception as e:
        logger.error(f"Error in content overview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/gaps", response_model=GapsResponse)
async def get_content_gaps(
    grade: str = Query(None, description="Filter by grade"),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed gap analysis for content"""
    try:
        gaps: List[GapItem] = []

        # 1. Skills with fewer questions than required
        q_count_subq = (
            select(
                Curriculum_questions.skill_id,
                func.count(Curriculum_questions.id).label("q_count")
            )
            .group_by(Curriculum_questions.skill_id)
            .subquery()
        )

        query = (
            select(
                Curriculum_skills.id,
                Curriculum_skills.name,
                Curriculum_skills.grade,
                Curriculum_skills.min_questions_required,
                func.coalesce(q_count_subq.c.q_count, 0).label("actual_count"),
                Curriculum_domains.name.label("domain_name"),
            )
            .outerjoin(q_count_subq, Curriculum_skills.id == q_count_subq.c.skill_id)
            .outerjoin(Curriculum_domains, Curriculum_skills.domain_id == Curriculum_domains.id)
            .where(
                func.coalesce(q_count_subq.c.q_count, 0) < func.coalesce(Curriculum_skills.min_questions_required, 3)
            )
        )
        if grade:
            query = query.where(Curriculum_skills.grade == grade)

        result = await db.execute(query)
        for row in result.fetchall():
            gaps.append(GapItem(
                skill_id=row.id,
                skill_name=row.name,
                grade=row.grade,
                domain_name=row.domain_name,
                gap_type="missing_questions",
                details=f"يحتاج {row.min_questions_required or 3} أسئلة، لديه {row.actual_count} فقط"
            ))

        # 2. Skills without remediation paths (where required)
        remediation_skill_ids = (
            select(Skill_remediation_paths.skill_id).distinct().subquery()
        )
        query2 = (
            select(
                Curriculum_skills.id,
                Curriculum_skills.name,
                Curriculum_skills.grade,
                Curriculum_domains.name.label("domain_name"),
            )
            .outerjoin(Curriculum_domains, Curriculum_skills.domain_id == Curriculum_domains.id)
            .where(
                and_(
                    Curriculum_skills.remediation_required == True,
                    ~Curriculum_skills.id.in_(select(remediation_skill_ids.c.skill_id))
                )
            )
        )
        if grade:
            query2 = query2.where(Curriculum_skills.grade == grade)

        result2 = await db.execute(query2)
        for row in result2.fetchall():
            gaps.append(GapItem(
                skill_id=row.id,
                skill_name=row.name,
                grade=row.grade,
                domain_name=row.domain_name,
                gap_type="missing_remediation",
                details="مهارة تتطلب مسار علاجي ولكن لم يتم إنشاؤه"
            ))

        # 3. Questions with poor performance
        poor_questions = await db.execute(
            select(
                Curriculum_questions.skill_id,
                Curriculum_skills.name,
                Curriculum_skills.grade,
                func.count(Curriculum_questions.id).label("poor_count"),
                Curriculum_domains.name.label("domain_name"),
            )
            .join(Curriculum_skills, Curriculum_questions.skill_id == Curriculum_skills.id)
            .outerjoin(Curriculum_domains, Curriculum_skills.domain_id == Curriculum_domains.id)
            .where(
                and_(
                    Curriculum_questions.performance_score != None,
                    Curriculum_questions.performance_score < 0.3,
                    Curriculum_questions.attempt_count > 5
                )
            )
            .group_by(Curriculum_questions.skill_id, Curriculum_skills.name, Curriculum_skills.grade, Curriculum_domains.name)
        )
        for row in poor_questions.fetchall():
            if grade and row.grade != grade:
                continue
            gaps.append(GapItem(
                skill_id=row.skill_id,
                skill_name=row.name,
                grade=row.grade,
                domain_name=row.domain_name,
                gap_type="poor_performance",
                details=f"{row.poor_count} أسئلة بأداء ضعيف (أقل من 30%)"
            ))

        # 4. Skills missing prerequisite mappings
        prereq_skill_ids = (
            select(Skill_prerequisites.skill_id).distinct().subquery()
        )
        query4 = (
            select(
                Curriculum_skills.id,
                Curriculum_skills.name,
                Curriculum_skills.grade,
                Curriculum_domains.name.label("domain_name"),
            )
            .outerjoin(Curriculum_domains, Curriculum_skills.domain_id == Curriculum_domains.id)
            .where(
                and_(
                    Curriculum_skills.difficulty_level != "easy",
                    ~Curriculum_skills.id.in_(select(prereq_skill_ids.c.skill_id))
                )
            )
        )
        if grade:
            query4 = query4.where(Curriculum_skills.grade == grade)

        result4 = await db.execute(query4)
        for row in result4.fetchall():
            gaps.append(GapItem(
                skill_id=row.id,
                skill_name=row.name,
                grade=row.grade,
                domain_name=row.domain_name,
                gap_type="missing_prerequisites",
                details="مهارة متوسطة/صعبة بدون ربط بمتطلبات سابقة"
            ))

        return GapsResponse(total_gaps=len(gaps), gaps=gaps)
    except Exception as e:
        logger.error(f"Error in content gaps: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/coverage", response_model=CoverageResponse)
async def get_content_coverage(db: AsyncSession = Depends(get_db)):
    """Get coverage statistics by grade and domain"""
    try:
        # Get all domains with their skills and question counts
        query = (
            select(
                Curriculum_skills.grade,
                Curriculum_domains.name.label("domain_name"),
                func.count(Curriculum_skills.id.distinct()).label("total_skills"),
                func.count(Curriculum_questions.id).label("total_questions"),
                func.sum(
                    case(
                        (Curriculum_skills.status == "approved", 1),
                        (Curriculum_skills.status == "published", 1),
                        else_=0
                    )
                ).label("approved_count"),
            )
            .outerjoin(Curriculum_domains, Curriculum_skills.domain_id == Curriculum_domains.id)
            .outerjoin(Curriculum_questions, Curriculum_skills.id == Curriculum_questions.skill_id)
            .group_by(Curriculum_skills.grade, Curriculum_domains.name)
            .order_by(Curriculum_skills.grade, Curriculum_domains.name)
        )

        result = await db.execute(query)
        coverage_items = []
        for row in result.fetchall():
            total_skills = row.total_skills or 0
            approved_count = row.approved_count or 0
            approved_pct = (approved_count / total_skills * 100) if total_skills > 0 else 0
            draft_pct = 100 - approved_pct

            coverage_items.append(CoverageItem(
                grade=row.grade or "غير محدد",
                domain_name=row.domain_name or "غير مصنف",
                total_skills=total_skills,
                total_questions=row.total_questions or 0,
                approved_percentage=round(approved_pct, 1),
                draft_percentage=round(draft_pct, 1),
            ))

        return CoverageResponse(coverage=coverage_items)
    except Exception as e:
        logger.error(f"Error in content coverage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")