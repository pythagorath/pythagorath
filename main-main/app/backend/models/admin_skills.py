from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Admin_skills(Base):
    __tablename__ = "admin_skills"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    grade_id = Column(Integer, nullable=False)
    semester_id = Column(Integer, nullable=True)
    subject_id = Column(Integer, nullable=False)
    unit_id = Column(Integer, nullable=True)
    lesson_id = Column(Integer, nullable=True)
    domain = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    prerequisites = Column(String, nullable=True)
    mastery_threshold = Column(Integer, nullable=True)
    retention_schedule = Column(String, nullable=True)
    remediation_skill_id = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)