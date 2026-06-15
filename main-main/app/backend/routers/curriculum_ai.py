"""
Curriculum AI router.

Exposes the Claude-powered curriculum pipeline (extract skills + objectives,
generate questions, persist) implemented in ``services.curriculum_ai_service``.

This router is auto-discovered by ``main.include_routers_from_package``.
Like the other ``academic-production`` write endpoints, admin gating is handled
on the frontend, so no auth dependency is attached here.
"""

import logging
from typing import Optional

from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from models.curriculum_domains import Curriculum_domains
from models.curriculum_questions import Curriculum_questions
from models.curriculum_skills import Curriculum_skills
from models.subjects import Subjects
from pydantic import BaseModel, Field
from services.curriculum_ai_service import (
    DEFAULT_QUESTIONS_PER_SKILL,
    CurriculumAIError,
    CurriculumAIService,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Numeric grade -> Arabic label stored on curriculum_domains.grade
GRADE_LABELS = {
    1: "الصف الأول", 2: "الصف الثاني", 3: "الصف الثالث", 4: "الصف الرابع",
    5: "الصف الخامس", 6: "الصف السادس", 7: "الصف السابع", 8: "الصف الثامن",
    9: "الصف التاسع", 10: "الصف العاشر", 11: "الصف الحادي عشر", 12: "الصف الثاني عشر",
}

router = APIRouter(prefix="/api/v1/curriculum-ai", tags=["curriculum_ai"])


# ---------- Schemas ----------
class AnalyzeCurriculumRequest(BaseModel):
    """Request body for the analyze endpoint."""

    curriculum_text: str = Field(..., min_length=1, description="Raw curriculum text to analyse")
    domain_id: int = Field(..., description="Curriculum domain the extracted skills belong to")
    grade: str = Field(..., description="Grade label stored on each generated skill")
    semester: str = Field(..., description="Semester label stored on each generated skill")
    questions_per_skill: int = Field(default=DEFAULT_QUESTIONS_PER_SKILL, ge=1, le=10)
    persist: bool = Field(default=True, description="Persist results to the database when true")


class AnalyzeStructureRequest(BaseModel):
    """Request body for the full-structure analyze endpoint."""

    curriculum_text: str = Field(..., min_length=1, description="Raw curriculum text to analyse")
    domain_id: int = Field(..., description="Curriculum domain the generated skills belong to")
    grade: str = Field(..., description="Grade label stored on each generated skill")
    semester: str = Field(..., description="Semester label stored on each generated skill")
    grade_number: int = Field(..., ge=1, le=12, description="Numeric grade for the upload anchor")
    subject_name: str = Field(..., min_length=1, description="Subject name for the upload anchor")
    semester_number: int = Field(default=1, ge=1, le=4, description="Numeric semester for the upload anchor")
    questions_per_skill: int = Field(default=DEFAULT_QUESTIONS_PER_SKILL, ge=1, le=10)
    persist: bool = Field(default=True, description="Persist results to the database when true")


class ExtractTextRequest(BaseModel):
    """Request body for the text-extraction endpoint."""

    file_url: str = Field(..., min_length=1, description="Downloadable URL of an uploaded curriculum file")


class SetStatusRequest(BaseModel):
    """Request body for updating an AI-generated item's status."""

    kind: str = Field(..., description="'skill' or 'question'")
    id: int = Field(..., description="Row id in curriculum_skills / curriculum_questions")
    status: str = Field(..., description="New status value")


# ---------- Routes ----------
@router.get("/status")
async def get_status(db: AsyncSession = Depends(get_db)):
    """Report whether the Claude API is configured (used to gate the UI)."""
    service = CurriculumAIService(db)
    return {"configured": service.client is not None, "model": service.model}


@router.get("/domains")
async def list_domains(
    grade: int = Query(..., ge=1, le=12, description="Numeric grade (1-12)"),
    subject: Optional[str] = Query(None, description="Subject name to filter by"),
    db: AsyncSession = Depends(get_db),
):
    """List curriculum domains for a grade (optionally filtered by subject name).

    Used to populate the analyze dialog's domain dropdown with a short, relevant list.
    """
    stmt = select(Curriculum_domains)
    label = GRADE_LABELS.get(grade)
    if label:
        stmt = stmt.where(Curriculum_domains.grade == label)
    if subject:
        subject_id = (
            await db.execute(select(Subjects.id).where(Subjects.name == subject).order_by(Subjects.id))
        ).scalars().first()
        if subject_id is not None:
            stmt = stmt.where(Curriculum_domains.subject_id == subject_id)
    stmt = stmt.order_by(Curriculum_domains.order_index, Curriculum_domains.id)
    rows = (await db.execute(stmt)).scalars().all()
    return {"domains": [{"id": d.id, "name": d.name, "name_en": d.name_en} for d in rows]}


@router.get("/generated-skills")
async def generated_skills(
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """Return AI-generated skills (from curriculum_skills) in a normalized shape.

    Bypasses the auto-generated curriculum_skills entity router, whose response
    schema is out of sync with the model.
    """
    rows = (
        await db.execute(select(Curriculum_skills).order_by(Curriculum_skills.id.desc()).limit(limit))
    ).scalars().all()
    return {
        "items": [
            {
                "id": s.id,
                "name": s.name,
                "name_en": s.name_en,
                "domain_id": s.domain_id,
                "grade": s.grade,
                "difficulty": s.difficulty_level,
                "mastery_threshold": s.mastery_threshold,
                "status": s.status,
            }
            for s in rows
        ]
    }


@router.get("/generated-questions")
async def generated_questions(
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """Return AI-generated questions (from curriculum_questions) in a normalized shape."""
    rows = (
        await db.execute(select(Curriculum_questions).order_by(Curriculum_questions.id.desc()).limit(limit))
    ).scalars().all()
    return {
        "items": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "difficulty": q.difficulty,
                "status": q.review_status,
                "skill_id": q.skill_id,
            }
            for q in rows
        ]
    }


@router.post("/set-status")
async def set_status(req: SetStatusRequest, db: AsyncSession = Depends(get_db)):
    """Update the status of an AI-generated skill or question.

    Skills use the ``status`` column; questions use ``review_status``.
    """
    if req.kind == "skill":
        obj = (
            await db.execute(select(Curriculum_skills).where(Curriculum_skills.id == req.id))
        ).scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=404, detail="Skill not found")
        obj.status = req.status
    elif req.kind == "question":
        obj = (
            await db.execute(select(Curriculum_questions).where(Curriculum_questions.id == req.id))
        ).scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=404, detail="Question not found")
        obj.review_status = req.status
    else:
        raise HTTPException(status_code=400, detail="kind must be 'skill' or 'question'")

    await db.commit()
    return {"success": True, "kind": req.kind, "id": req.id, "status": req.status}


@router.post("/extract-text")
async def extract_text(req: ExtractTextRequest, db: AsyncSession = Depends(get_db)):
    """Download an uploaded file and return its extracted plain text."""
    service = CurriculumAIService(db)
    try:
        text = await service.fetch_and_extract_text(req.file_url)
        return {"text": text, "length": len(text)}
    except CurriculumAIError as e:
        logger.warning("Curriculum text extraction failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error during text extraction: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/analyze")
async def analyze_curriculum(req: AnalyzeCurriculumRequest, db: AsyncSession = Depends(get_db)):
    """Run the full extract -> generate -> persist pipeline for one curriculum text."""
    logger.info(
        "Curriculum AI analyze requested (domain_id=%s, grade=%s, qps=%s, persist=%s, text_len=%d)",
        req.domain_id,
        req.grade,
        req.questions_per_skill,
        req.persist,
        len(req.curriculum_text),
    )
    service = CurriculumAIService(db)
    try:
        return await service.process_curriculum(
            curriculum_text=req.curriculum_text,
            domain_id=req.domain_id,
            grade=req.grade,
            semester=req.semester,
            questions_per_skill=req.questions_per_skill,
            persist=req.persist,
        )
    except CurriculumAIError as e:
        # Configuration / AI / parsing problems -> client-actionable 400.
        logger.warning("Curriculum AI analyze failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error in curriculum AI analyze: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/analyze-structure")
async def analyze_structure(req: AnalyzeStructureRequest, db: AsyncSession = Depends(get_db)):
    """Build the full hierarchy (units -> lessons -> skills -> questions) from one text."""
    logger.info(
        "Curriculum AI structure requested (domain_id=%s, grade=%s, subject=%s, qps=%s, text_len=%d)",
        req.domain_id,
        req.grade,
        req.subject_name,
        req.questions_per_skill,
        len(req.curriculum_text),
    )
    service = CurriculumAIService(db)
    try:
        return await service.process_curriculum_structure(
            curriculum_text=req.curriculum_text,
            domain_id=req.domain_id,
            grade=req.grade,
            semester=req.semester,
            grade_number=req.grade_number,
            subject_name=req.subject_name,
            semester_number=req.semester_number,
            questions_per_skill=req.questions_per_skill,
            persist=req.persist,
        )
    except CurriculumAIError as e:
        logger.warning("Curriculum AI structure failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error in curriculum AI structure: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
