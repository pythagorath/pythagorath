from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Pilot_feedback(Base):
    __tablename__ = "pilot_feedback"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    feedback_type = Column(String, nullable=False)
    rating = Column(Integer, nullable=True)
    ease_of_use = Column(Integer, nullable=True)
    clarity = Column(Integer, nullable=True)
    engagement = Column(Integer, nullable=True)
    comment = Column(String, nullable=True)
    page_context = Column(String, nullable=True)
    device_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)