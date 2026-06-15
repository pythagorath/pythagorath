from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Student_path_progress(Base):
    __tablename__ = "student_path_progress"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    learning_path_id = Column(Integer, nullable=False)
    node_id = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    score = Column(Integer, nullable=True)
    completed_at = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)