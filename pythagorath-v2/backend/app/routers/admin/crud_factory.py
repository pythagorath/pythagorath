"""Generic CRUD router factory for entities with an integer ``id`` primary key.

Every entity in the hierarchy gets the same five operations. Integrity errors
from the database (bad foreign key, unique clash, or a RESTRICT delete policy
from Track A) surface as HTTP 409 — the schema's rules are enforced, never
silently bypassed.
"""
from typing import Type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.database import Base


def make_crud_router(
    *,
    model: Type[Base],
    create_schema,
    update_schema,
    read_schema,
    tag: str,
) -> APIRouter:
    router = APIRouter(tags=[tag])
    name = model.__name__

    @router.post("", response_model=read_schema, status_code=201)
    def create(payload: create_schema, db: Session = Depends(get_db)):
        obj = model(**payload.model_dump())
        db.add(obj)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, f"{name}: {exc.orig}") from exc
        db.refresh(obj)
        return obj

    @router.get("", response_model=list[read_schema])
    def list_all(db: Session = Depends(get_db)):
        return db.execute(select(model)).scalars().all()

    @router.get("/{item_id}", response_model=read_schema)
    def get_one(item_id: int, db: Session = Depends(get_db)):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(404, f"{name} {item_id} not found")
        return obj

    @router.patch("/{item_id}", response_model=read_schema)
    def update(item_id: int, payload: update_schema, db: Session = Depends(get_db)):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(404, f"{name} {item_id} not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, f"{name}: {exc.orig}") from exc
        db.refresh(obj)
        return obj

    @router.delete("/{item_id}", status_code=204)
    def delete(item_id: int, db: Session = Depends(get_db)):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(404, f"{name} {item_id} not found")
        db.delete(obj)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                409, f"cannot delete {name} {item_id}: {exc.orig}"
            ) from exc
        return None

    return router
