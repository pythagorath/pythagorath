"""Public student registration endpoint - no authentication required"""
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.student_profiles import Student_profilesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/public", tags=["public_registration"])


class StudentRegistrationRequest(BaseModel):
    """Public registration request - no auth needed"""
    user_id: str
    name: str
    grade: int
    semester: int
    guardian_contact: Optional[str] = None
    avatar_color: Optional[str] = None
    status: Optional[str] = "active"


class StudentRegistrationResponse(BaseModel):
    """Registration response"""
    id: int
    user_id: str
    name: str
    grade: int
    semester: int
    guardian_contact: Optional[str] = None
    avatar_color: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/register-student", response_model=StudentRegistrationResponse, status_code=201)
async def register_student(
    data: StudentRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for student self-registration. No authentication required."""
    logger.info(f"New student registration: {data.name}, grade {data.grade}")

    service = Student_profilesService(db)
    try:
        result = await service.create(
            data={
                "user_id": data.user_id,
                "name": data.name,
                "grade": data.grade,
                "semester": data.semester,
                "guardian_contact": data.guardian_contact,
                "avatar_color": data.avatar_color,
                "status": data.status or "active",
            }
        )

        if not result:
            raise HTTPException(status_code=400, detail="Failed to create student profile")

        logger.info(f"Student registered successfully: {result.id} - {data.name}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering student: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.get("/students", response_model=list[StudentRegistrationResponse])
async def list_all_students(
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint to list all registered students (for login selection)."""
    service = Student_profilesService(db)
    try:
        result = await service.get_list(skip=0, limit=100)
        return result["items"]
    except Exception as e:
        logger.error(f"Error listing students: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list students: {str(e)}")