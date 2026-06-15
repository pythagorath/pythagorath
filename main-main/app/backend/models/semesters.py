from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Semesters(Base):
    __tablename__ = "semesters"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    grade_id = Column(Integer, nullable=True)
    academic_year = Column(String, nullable=True)
    status = Column(String, nullable=True)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)