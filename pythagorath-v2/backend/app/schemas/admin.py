"""Admin CRUD schemas for the content hierarchy (§7.1).

For each entity: Create (required fields), Update (all optional / partial), and
Read (from ORM). Read schemas enable ``from_attributes`` so ORM objects serialise
directly.
"""
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class _Read(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- country ----
class CountryCreate(BaseModel):
    name: str


class CountryUpdate(BaseModel):
    name: Optional[str] = None


class CountryRead(_Read):
    id: int
    name: str


# ---- curriculum ----
class CurriculumCreate(BaseModel):
    country_id: int
    name: str


class CurriculumUpdate(BaseModel):
    country_id: Optional[int] = None
    name: Optional[str] = None


class CurriculumRead(_Read):
    id: int
    country_id: int
    name: str


# ---- grade ----
class GradeCreate(BaseModel):
    curriculum_id: int
    name: str
    order: int = 0


class GradeUpdate(BaseModel):
    curriculum_id: Optional[int] = None
    name: Optional[str] = None
    order: Optional[int] = None


class GradeRead(_Read):
    id: int
    curriculum_id: int
    name: str
    order: int


# ---- subject ----
class SubjectCreate(BaseModel):
    grade_id: int
    name: str


class SubjectUpdate(BaseModel):
    grade_id: Optional[int] = None
    name: Optional[str] = None


class SubjectRead(_Read):
    id: int
    grade_id: int
    name: str


# ---- unit ----
class UnitCreate(BaseModel):
    subject_id: int
    name: str
    order: int = 0


class UnitUpdate(BaseModel):
    subject_id: Optional[int] = None
    name: Optional[str] = None
    order: Optional[int] = None


class UnitRead(_Read):
    id: int
    subject_id: int
    name: str
    order: int


# ---- skill ----
class SkillCreate(BaseModel):
    unit_id: int
    name: str
    order: int = 0
    mastery_threshold: float = 0.8


class SkillUpdate(BaseModel):
    unit_id: Optional[int] = None
    name: Optional[str] = None
    order: Optional[int] = None
    mastery_threshold: Optional[float] = None


class SkillRead(_Read):
    id: int
    unit_id: int
    name: str
    order: int
    mastery_threshold: float


# ---- question ----
class QuestionCreate(BaseModel):
    skill_id: int
    interaction_type: str
    difficulty: int = 1
    payload: Any = {}


class QuestionUpdate(BaseModel):
    skill_id: Optional[int] = None
    interaction_type: Optional[str] = None
    difficulty: Optional[int] = None
    payload: Optional[Any] = None


class QuestionRead(_Read):
    id: int
    skill_id: int
    interaction_type: str
    difficulty: int
    payload: Any


# ---- skill prerequisite (composite key) ----
class PrerequisiteCreate(BaseModel):
    skill_id: int
    prerequisite_skill_id: int


class PrerequisiteRead(_Read):
    skill_id: int
    prerequisite_skill_id: int
