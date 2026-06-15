from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class Curriculum_questions(Base):
    __tablename__ = "curriculum_questions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    skill_id = Column(Integer, nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(String, nullable=True)
    option_a = Column(String, nullable=True)
    option_b = Column(String, nullable=True)
    option_c = Column(String, nullable=True)
    option_d = Column(String, nullable=True)
    correct_answer = Column(String, nullable=False)
    explanation = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    misconception_tag = Column(String, nullable=True)
    retention_tag = Column(String, nullable=True)
    visual_asset_url = Column(String, nullable=True)
    has_visual = Column(Boolean, nullable=True)
    review_status = Column(String, nullable=True)
    review_notes = Column(String, nullable=True)
    performance_score = Column(Float, nullable=True)
    attempt_count = Column(Integer, nullable=True)
    question_text_ar = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)