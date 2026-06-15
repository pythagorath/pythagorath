from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Quiz_attempts(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    quiz_id = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    answers = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)