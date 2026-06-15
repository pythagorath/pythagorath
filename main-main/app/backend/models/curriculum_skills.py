from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Curriculum_skills(Base):
    __tablename__ = "curriculum_skills"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    name_en = Column(String, nullable=True)
    domain_id = Column(Integer, nullable=False)
    lesson_id = Column(Integer, nullable=True)
    grade = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    difficulty_level = Column(String, nullable=True)
    mastery_threshold = Column(Integer, nullable=True)
    min_questions_required = Column(Integer, nullable=True)
    min_visual_questions = Column(Integer, nullable=True)
    remediation_required = Column(Boolean, nullable=True)
    retention_review_days = Column(Integer, nullable=True)
    misconception_types = Column(String, nullable=True)
    status = Column(String, nullable=True)
    order_index = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)