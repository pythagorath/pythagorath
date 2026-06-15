from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Admin_lessons(Base):
    __tablename__ = "admin_lessons"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    title = Column(String, nullable=False)
    name = Column(String, nullable=True)
    unit_id = Column(Integer, nullable=False)
    objectives = Column(String, nullable=True)
    content_type = Column(String, nullable=False)
    content_data = Column(String, nullable=True)
    display_order = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)