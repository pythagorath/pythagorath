"""Schemas for the parent (mother) report (blueprint §3.4).

Deliberately structured (counts as ints, names as strings) so the frontend can
compose human-language, Hindi-numeral text in ONE place. No raw percentages are
exposed to the mother.
"""
from pydantic import BaseModel


class ParentSkill(BaseModel):
    skill_id: int
    name: str
    status: str  # mastered | in_progress | not_started
    light: str  # green | yellow | gray


class ParentUnit(BaseModel):
    unit_name: str
    total_skills: int
    mastered_skills: int


class ParentSupport(BaseModel):
    """A gentle "might need a little help" signal, derived from answer_log."""

    skill_id: int
    name: str
    attempts: int


class ParentReport(BaseModel):
    student_id: int
    student_name: str
    grade_name: str
    overall_light: str  # green | yellow | gray
    unit: ParentUnit
    skills: list[ParentSkill]
    mastered_names: list[str]
    curriculum_on_track: bool
    support: ParentSupport | None = None
