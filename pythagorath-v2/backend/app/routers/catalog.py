"""Catalog bootstrap reads for starting a session (subject picker)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.content import Subject
from app.schemas.admin import SubjectRead

router = APIRouter(tags=["catalog"])


@router.get("/grades/{grade_id}/subjects", response_model=list[SubjectRead])
def subjects_for_grade(grade_id: int, db: Session = Depends(get_db)):
    return db.execute(
        select(Subject).where(Subject.grade_id == grade_id)
    ).scalars().all()
