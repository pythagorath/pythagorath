"""Student progress — the single source of truth (blueprint §5.3 / §6).

    skill_mastery   the HEART: one row per (student, skill); written on every answer.
    answer_log      append-only log of every answer.
    learning_path   the student's personalised ordered path through skills.

Criterion 11-ح: progress lives HERE, in the database — never in the browser /
localStorage. Every link is a real ForeignKey with ON DELETE CASCADE from the
owning student, so a child's progress is consistent and self-contained.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# Canonical mastery states (blueprint §6): locked → in_progress → mastered.
MASTERY_STATUSES = ("locked", "in_progress", "mastered")


class SkillMastery(Base):
    """One mastery record per (student, skill) — the composite primary key
    guarantees a single source of truth with no duplicate rows."""

    __tablename__ = "skill_mastery"
    __table_args__ = (
        CheckConstraint(
            "status in ('locked', 'in_progress', 'mastered')",
            name="ck_skill_mastery_status",
        ),
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    mastery_level: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="locked")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_practiced: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    student: Mapped["Student"] = relationship()  # type: ignore[name-defined]  # noqa: F821
    skill: Mapped["Skill"] = relationship()  # type: ignore[name-defined]  # noqa: F821


class AnswerLog(Base):
    __tablename__ = "answer_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # The exact answer the child submitted (e.g. "٦٠"), kept for the real proof
    # and for later analytics (common wrong answers).
    answer_text: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=""
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class LearningPath(Base):
    """One ordered path per student. ``ordered_skill_ids`` is a JSON list of
    skill ids (an ordering cache); the authoritative skills live in ``skills``."""

    __tablename__ = "learning_path"

    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    ordered_skill_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    current_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
