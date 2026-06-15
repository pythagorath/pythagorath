"""
AI Analysis router module.
Provides endpoints for analyzing student weaknesses using AI and tracking history.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.ai_analysis import analyze_student_weaknesses
from services.analysis_history import Analysis_historyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai-analysis", tags=["ai-analysis"])


class WeaknessItem(BaseModel):
    skill: str
    severity: str
    description: str
    error_count: int = 0


class RecommendationItem(BaseModel):
    type: str
    id: int = 0
    title: str
    reason: str


class AnalysisResponse(BaseModel):
    has_data: bool
    message: str
    total_wrong_answers: int = 0
    weaknesses: list[WeaknessItem] = []
    recommendations: list[RecommendationItem] = []
    summary: str = ""


class HistoryItem(BaseModel):
    id: int
    total_wrong_answers: int
    weaknesses_count: int
    top_weakness: str = ""
    summary: str = ""
    created_at: str = ""


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int


@router.get("/weaknesses", response_model=AnalysisResponse)
async def get_weakness_analysis(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze student's wrong answers and identify weaknesses using AI, then save to history."""
    try:
        result = await analyze_student_weaknesses(db, current_user.id)

        # Save to history if there's data
        if result.get("has_data"):
            service = Analysis_historyService(db)
            weaknesses = result.get("weaknesses", [])
            top_weakness = weaknesses[0]["skill"] if weaknesses else ""
            await service.create(
                data={
                    "total_wrong_answers": result.get("total_wrong_answers", 0),
                    "weaknesses_count": len(weaknesses),
                    "top_weakness": top_weakness,
                    "summary": result.get("summary", ""),
                    "full_result": json.dumps(result, ensure_ascii=False),
                },
                user_id=current_user.id,
            )

        return AnalysisResponse(**result)
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل التحليل: {str(e)}",
        )


@router.get("/history", response_model=HistoryResponse)
async def get_analysis_history(
    limit: int = 10,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the student's analysis history for progress tracking."""
    try:
        service = Analysis_historyService(db)
        result = await service.get_list(
            skip=0,
            limit=limit,
            user_id=current_user.id,
            sort="-created_at",
        )
        items = []
        for record in result.get("items", []):
            items.append(HistoryItem(
                id=record.id,
                total_wrong_answers=record.total_wrong_answers,
                weaknesses_count=record.weaknesses_count,
                top_weakness=record.top_weakness or "",
                summary=record.summary or "",
                created_at=str(record.created_at) if record.created_at else "",
            ))
        return HistoryResponse(items=items, total=result.get("total", 0))
    except Exception as e:
        logger.error(f"Failed to fetch analysis history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جلب السجل: {str(e)}",
        )