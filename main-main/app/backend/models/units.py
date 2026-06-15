from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Units(Base):
    __tablename__ = "units"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    subject_id = Column(Integer, nullable=False)
    display_order = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False)
    country_id = Column(Integer, nullable=True)
    curriculum_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)