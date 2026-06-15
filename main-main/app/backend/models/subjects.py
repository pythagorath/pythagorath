from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text


class Subjects(Base):
    __tablename__ = "subjects"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    name_en = Column(String, nullable=True)
    grade = Column(String, nullable=False)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    grade_id = Column(Integer, nullable=True)
    semester_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    display_order = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    grade_from = Column(Integer, nullable=True)
    grade_to = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)