"""Student bootstrap reads + parent-facing progress."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.user import Student, User
from app.schemas.parent import ParentReport
from app.schemas.progress import ProgressResponse, StudentCreate, StudentRead
from app.schemas.skillmap import SkillMapResponse, SkillQuestionsResponse
from app.services.progress import NotFoundError, build_progress
from app.services import parent_report as parent_report_service
from app.services import skillmap as skillmap_service

router = APIRouter(tags=["students"])


@router.get("/students", response_model=list[StudentRead])
def list_students(db: Session = Depends(get_db)):
    """Bootstrap read: pick a (demo) student to start a session."""
    return db.execute(select(Student)).scalars().all()


@router.post("/students", response_model=StudentRead, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """Provision a child profile (parent account created/reused by email).
    Touches only users/students — never content tables."""
    user = db.execute(
        select(User).where(User.email == payload.parent_email)
    ).scalar_one_or_none()
    if user is None:
        user = User(email=payload.parent_email, password_hash="x")
        db.add(user)
        db.flush()
    student = Student(
        user_id=user.id, name=payload.name,
        grade_id=payload.grade_id, country_id=payload.country_id,
    )
    db.add(student)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, f"student: {exc.orig}") from exc
    db.refresh(student)
    return student


@router.get("/students/{student_id}/progress", response_model=ProgressResponse)
def student_progress(student_id: int, db: Session = Depends(get_db)):
    try:
        return build_progress(db, student_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/students/{student_id}/report", response_model=ParentReport)
def parent_report(student_id: int, db: Session = Depends(get_db)):
    """The mother's report (§3.4): where the child is, what he mastered, school
    sync, and a gentle support signal — all in plain language."""
    try:
        return parent_report_service.build_parent_report(db, student_id)
    except parent_report_service.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get(
    "/students/{student_id}/subjects/{subject_id}/skillmap",
    response_model=SkillMapResponse,
)
def skill_map(student_id: int, subject_id: int, db: Session = Depends(get_db)):
    """The child's visual progress map (§3.3): every skill of the subject, in
    order, tagged mastered / available / locked with its prerequisites."""
    try:
        return skillmap_service.build_skill_map(db, student_id, subject_id)
    except skillmap_service.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get(
    "/students/{student_id}/skills/{skill_id}/questions",
    response_model=SkillQuestionsResponse,
)
def skill_questions(student_id: int, skill_id: int, db: Session = Depends(get_db)):
    """Questions to start a session on ONE skill from the map. 403 if locked."""
    try:
        questions = skillmap_service.get_skill_questions(db, student_id, skill_id)
    except skillmap_service.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except skillmap_service.SkillLockedError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return SkillQuestionsResponse(
        skill_id=skill_id, count=len(questions), questions=questions
    )
