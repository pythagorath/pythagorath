from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class Retention_history(Base):
    __tablename__ = "retention_history"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    skill_id = Column(Integer, nullable=False)
    review_type = Column(String, nullable=True)
    questions_asked = Column(Integer, nullable=True)
    questions_correct = Column(Integer, nullable=True)
    retention_score = Column(Float, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    passed = Column(Boolean, nullable=True)
    next_review_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)