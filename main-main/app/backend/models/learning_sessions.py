from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Learning_sessions(Base):
    __tablename__ = "learning_sessions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    session_type = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    questions_attempted = Column(Integer, nullable=True)
    questions_correct = Column(Integer, nullable=True)
    skills_practiced = Column(String, nullable=True)
    missions_completed = Column(Integer, nullable=True)
    xp_earned = Column(Integer, nullable=True)
    engagement_score = Column(Float, nullable=True)
    device_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)