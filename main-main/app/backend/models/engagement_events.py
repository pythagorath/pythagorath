from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Engagement_events(Base):
    __tablename__ = "engagement_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    skill_id = Column(Integer, nullable=True)
    question_id = Column(Integer, nullable=True)
    session_id = Column(Integer, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    attempt_number = Column(Integer, nullable=True)
    page_context = Column(String, nullable=True)
    device_type = Column(String, nullable=True)
    extra_data = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)