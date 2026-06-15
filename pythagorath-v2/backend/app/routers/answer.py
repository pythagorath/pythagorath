"""Answer submission endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.answer import (
    NextQuestion,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services.answers import NotFoundError, SkillLockedError, submit_answer

router = APIRouter(tags=["answers"])


@router.post("/submit_answer", response_model=SubmitAnswerResponse)
def submit_answer_endpoint(
    payload: SubmitAnswerRequest, db: Session = Depends(get_db)
) -> SubmitAnswerResponse:
    try:
        log, mastery, next_question = submit_answer(
            db, payload.student_id, payload.question_id, payload.answer
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SkillLockedError as exc:
        # 403: the skill exists but is locked until prerequisites are mastered.
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return SubmitAnswerResponse(
        answer_log_id=log.id,
        is_correct=log.is_correct,
        skill_id=mastery.skill_id,
        mastery_level=mastery.mastery_level,
        attempts=mastery.attempts,
        status=mastery.status,
        next_question=NextQuestion(**next_question) if next_question else None,
    )
