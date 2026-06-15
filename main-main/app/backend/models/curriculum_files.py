from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Curriculum_files(Base):
    __tablename__ = "curriculum_files"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    grade_number = Column(Integer, nullable=False)
    semester_number = Column(Integer, nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)