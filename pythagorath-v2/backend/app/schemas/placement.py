"""Schemas for the adaptive start-point diagnostic placement (§2)."""
from pydantic import BaseModel


class PlacementAnswer(BaseModel):
    question_id: int
    answer: str


class PlacementRequest(BaseModel):
    student_id: int
    subject_id: int
    answers: list[PlacementAnswer]


class PlacedOutSkill(BaseModel):
    skill_id: int
    name: str


class PlacementResult(BaseModel):
    placement_skill_id: int
    placement_skill_name: str
    landing_order: int
    # Skills the child tested out of (placed out) — NOT mastered.
    placed_out: list[PlacedOutSkill]


class PlacementStatus(BaseModel):
    placed: bool
    current_position: int | None = None
    placement_skill_id: int | None = None
