"""Schemas for the skill map (§3.3) and starting a session on a specific skill."""
from pydantic import BaseModel

from app.schemas.diagnostic import DiagnosticQuestion


class SkillPrereqRead(BaseModel):
    skill_id: int
    name: str
    mastered: bool


class SkillMapEntry(BaseModel):
    skill_id: int
    name: str
    order: int
    status: str  # mastered | available | locked
    prerequisites: list[SkillPrereqRead]


class SkillMapResponse(BaseModel):
    student_id: int
    subject_id: int
    skills: list[SkillMapEntry]


class SkillQuestionsResponse(BaseModel):
    skill_id: int
    count: int
    questions: list[DiagnosticQuestion]
