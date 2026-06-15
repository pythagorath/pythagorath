from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Quizzes(Base):
    __tablename__ = "quizzes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    title = Column(String, nullable=False)
    lesson_id = Column(Integer, nullable=False)
    subject_id = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    difficulty = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)