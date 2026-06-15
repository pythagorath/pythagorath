from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Parent_reports(Base):
    __tablename__ = "parent_reports"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    child_user_id = Column(String, nullable=True)
    report_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=True)
    page_context = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)