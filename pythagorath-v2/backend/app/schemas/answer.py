"""Request/response schemas for answer submission."""
from typing import Any, Optional

from pydantic import BaseModel


class SubmitAnswerRequest(BaseModel):
    student_id: int
    question_id: int
    answer: Any


class NextQuestion(BaseModel):
    id: int
    skill_id: int
    interaction_type: str
    difficulty: int
    payload: Any


class SubmitAnswerResponse(BaseModel):
    # 1) result of this answer
    answer_log_id: int
    is_correct: bool
    # 2) progress state for the answered skill (skill_mastery is the source of truth)
    skill_id: int
    mastery_level: float
    attempts: int
    status: str
    # 3) what to show next — same skill if not yet mastered, else the next OPEN
    #    skill; null when there is nothing left to practise. Decided by the server.
    next_question: Optional[NextQuestion] = None
