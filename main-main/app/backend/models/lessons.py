from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Lessons(Base):
    __tablename__ = "lessons"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    title = Column(String, nullable=False)
    subject_id = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    video_url = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    order_index = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)