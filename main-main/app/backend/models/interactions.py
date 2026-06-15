from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Interactions(Base):
    __tablename__ = "interactions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    interaction_type = Column(String, nullable=True)
    config_json = Column(String, nullable=True)
    skill_id = Column(Integer, nullable=True)
    lesson_id = Column(Integer, nullable=True)
    question_id = Column(Integer, nullable=True)
    difficulty = Column(String, nullable=True)
    cognitive_complexity = Column(String, nullable=True)
    grade_id = Column(Integer, nullable=True)
    subject_id = Column(Integer, nullable=True)
    display_order = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)