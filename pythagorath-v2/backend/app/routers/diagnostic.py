"""Diagnostic endpoint — first questions for a student in a subject, plus the
adaptive start-point PLACEMENT (§2)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.progress import LearningPath
from app.schemas.diagnostic import DiagnosticResponse
from app.schemas.placement import PlacementRequest, PlacementResult, PlacementStatus
from app.services.diagnostic import (
    NotFoundError,
    SubjectMismatchError,
    get_diagnostic_questions,
)
from app.services import placement as placement_service

router = APIRouter(tags=["diagnostic"])


@router.get("/diagnostic", response_model=DiagnosticResponse)
def diagnostic(
    student_id: int = Query(...),
    subject_id: int = Query(...),
    db: Session = Depends(get_db),
) -> DiagnosticResponse:
    try:
        questions = get_diagnostic_questions(db, student_id, subject_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SubjectMismatchError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    # Explicit result — empty list when the database has no suitable questions;
    # never a static fallback.
    return DiagnosticResponse(
        student_id=student_id,
        subject_id=subject_id,
        count=len(questions),
        questions=questions,
    )


@router.post("/diagnostic/placement", response_model=PlacementResult)
def diagnostic_placement(payload: PlacementRequest, db: Session = Depends(get_db)):
    """Grade the diagnostic and place the child at a starting skill (§2). Writes
    the learning path (placement); never writes answer_log; grants no mastery."""
    try:
        return placement_service.compute_placement(
            db,
            payload.student_id,
            payload.subject_id,
            [a.model_dump() for a in payload.answers],
        )
    except placement_service.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get(
    "/students/{student_id}/subjects/{subject_id}/placement",
    response_model=PlacementStatus,
)
def placement_status(
    student_id: int, subject_id: int, db: Session = Depends(get_db)
):
    """Has this child been placed yet? Drives "show the diagnostic only on the
    first session" in the UI."""
    lp = db.get(LearningPath, student_id)
    if lp is None:
        return PlacementStatus(placed=False)
    ordered = lp.ordered_skill_ids or []
    pos = lp.current_position or 0
    skill_id = ordered[pos] if 0 <= pos < len(ordered) else None
    return PlacementStatus(placed=True, current_position=pos, placement_skill_id=skill_id)


@router.delete("/students/{student_id}/placement", status_code=204)
def clear_placement(student_id: int, db: Session = Depends(get_db)):
    """Clear a placement so the child can be re-diagnosed (placement is never
    irreversible)."""
    lp = db.get(LearningPath, student_id)
    if lp is not None:
        db.delete(lp)
        db.commit()
