from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Admin_questions(Base):
    __tablename__ = "admin_questions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    skill_id = Column(Integer, nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    options = Column(String, nullable=True)
    correct_answer = Column(String, nullable=True)
    explanation = Column(String, nullable=True)
    visual_type = Column(String, nullable=True)
    visual_data = Column(String, nullable=True)
    misconception_type = Column(String, nullable=True)
    retention_tag = Column(String, nullable=True)
    status = Column(String, nullable=False)
    config_json = Column(String, nullable=True)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)