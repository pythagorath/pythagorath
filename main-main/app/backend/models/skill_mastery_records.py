from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Skill_mastery_records(Base):
    __tablename__ = "skill_mastery_records"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    skill_id = Column(Integer, nullable=False)
    mastery_level = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    attempts_count = Column(Integer, nullable=True)
    correct_count = Column(Integer, nullable=True)
    streak = Column(Integer, nullable=True)
    last_practiced_at = Column(DateTime(timezone=True), nullable=True)
    mastered_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)