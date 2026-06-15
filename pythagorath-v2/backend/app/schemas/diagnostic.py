"""Schemas for the diagnostic endpoint."""
from typing import Any

from pydantic import BaseModel, ConfigDict


class DiagnosticQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_id: int
    interaction_type: str
    difficulty: int
    payload: Any


class DiagnosticResponse(BaseModel):
    student_id: int
    subject_id: int
    count: int
    # Explicit, possibly empty, list of real questions from the database.
    questions: list[DiagnosticQuestion]
