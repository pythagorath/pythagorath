"""The COMMERCIAL access gate — entirely separate from the educational lock.

Two different reasons a skill may be closed, never mixed:
  * LOCK (educational, 403): prerequisites not yet understood — handled by gate.py.
  * PAYWALL (commercial, 402): no active subscription — handled here.

A skill is reachable commercially if it is a free sample (`is_free`) OR the guardian
has an active/trial subscription (computed dynamically from `access_until`, so no
expiry job is needed).
"""
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Skill, Subscription

PAYWALL_MESSAGE = "هذا المحتوى يتطلّب اشتراكاً — اشترك أو ابدأ التجربة للوصول."


def has_access(db: Session, user_id: int, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    sub = db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status.in_(("trial", "active")),
            Subscription.access_until.is_not(None),
            Subscription.access_until > now,
        )
    ).scalars().first()
    return sub is not None


def can_access_skill(db: Session, user_id: int, skill: Skill, now: datetime | None = None) -> bool:
    return bool(skill.is_free) or has_access(db, user_id, now)


def require_skill_access(db: Session, user_id: int, skill: Skill) -> None:
    """Raise the PAYWALL (402) if this skill is paid and the guardian has no access.
    Distinct from the lock (403) — a different status AND a different message."""
    if not can_access_skill(db, user_id, skill):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, PAYWALL_MESSAGE)
