from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Curriculum_lessons(Base):
    __tablename__ = "curriculum_lessons"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    unit_id = Column(Integer, nullable=False)
    name_ar = Column(String, nullable=True)
    name_en = Column(String, nullable=True)
    description = Column(String, nullable=True)
    lesson_type = Column(String, nullable=True)
    lesson_number = Column(Integer, nullable=True)
    display_order = Column(Integer, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    content_url = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)