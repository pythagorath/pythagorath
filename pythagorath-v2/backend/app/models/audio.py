"""Per-question audio recording (teacher reads the question aloud).

One audio per question (re-upload replaces). The bytes live on disk under the
uploads dir; this row is the DB link (single source for "does it have audio").
ON DELETE CASCADE: deleting a question drops its audio row.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class QuestionAudio(Base):
    __tablename__ = "question_audio"

    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True
    )
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)  # relative to uploads dir
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
