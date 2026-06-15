"""Schemas for parent-facing progress and session-bootstrap reads."""
from pydantic import BaseModel, ConfigDict


class StudentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    grade_id: int
    country_id: int


class StudentCreate(BaseModel):
    """Provisioning a child profile (not content). A parent account is created
    or reused by email."""
    name: str
    grade_id: int
    country_id: int
    parent_email: str = "parent@pythagorath.local"


class SkillProgress(BaseModel):
    skill_id: int
    name: str
    status: str
    mastery_level: float
    # Traffic light for the parent (§3.4): green / yellow / gray.
    light: str


class ProgressResponse(BaseModel):
    student_id: int
    student_name: str
    # Human-language summary (§3.4) — not raw percentages.
    summary: str
    overall_light: str
    skills: list[SkillProgress]
