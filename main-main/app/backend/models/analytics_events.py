from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Analytics_events(Base):
    __tablename__ = "analytics_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    event_data = Column(String, nullable=True)
    skill_id = Column(Integer, nullable=True)
    session_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)