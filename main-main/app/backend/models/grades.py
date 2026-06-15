from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Grades(Base):
    __tablename__ = "grades"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=True)
    name_ar = Column(String, nullable=True)
    name_en = Column(String, nullable=True)
    grade_number = Column(Integer, nullable=True)
    stage = Column(String, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    country_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)