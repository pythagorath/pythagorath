"""Prerequisite-edge admin endpoints (composite key, so not a generic CRUD)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.skill import SkillPrerequisite
from app.schemas.admin import PrerequisiteCreate, PrerequisiteRead

router = APIRouter(tags=["prerequisites"])


@router.post("", response_model=PrerequisiteRead, status_code=201)
def create(payload: PrerequisiteCreate, db: Session = Depends(get_db)):
    edge = SkillPrerequisite(**payload.model_dump())
    db.add(edge)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # bad skill id, duplicate edge, or self-prerequisite (CHECK constraint)
        raise HTTPException(409, f"prerequisite: {exc.orig}") from exc
    return edge


@router.get("", response_model=list[PrerequisiteRead])
def list_edges(
    skill_id: int | None = Query(default=None), db: Session = Depends(get_db)
):
    stmt = select(SkillPrerequisite)
    if skill_id is not None:
        stmt = stmt.where(SkillPrerequisite.skill_id == skill_id)
    return db.execute(stmt).scalars().all()


@router.delete("/{skill_id}/{prerequisite_skill_id}", status_code=204)
def delete(skill_id: int, prerequisite_skill_id: int, db: Session = Depends(get_db)):
    edge = db.get(SkillPrerequisite, (skill_id, prerequisite_skill_id))
    if edge is None:
        raise HTTPException(404, "prerequisite edge not found")
    db.delete(edge)
    db.commit()
    return None
