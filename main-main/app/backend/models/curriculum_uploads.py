from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Curriculum_uploads(Base):
    __tablename__ = "curriculum_uploads"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    grade_number = Column(Integer, nullable=False)
    subject_name = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)