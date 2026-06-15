from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Curriculum_domains(Base):
    __tablename__ = "curriculum_domains"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    name_en = Column(String, nullable=True)
    subject_id = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    order_index = Column(Integer, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)