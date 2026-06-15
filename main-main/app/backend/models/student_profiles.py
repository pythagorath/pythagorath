from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Student_profiles(Base):
    __tablename__ = "student_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    guardian_contact = Column(String, nullable=True)
    avatar_color = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)