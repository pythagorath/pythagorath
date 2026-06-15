from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Curriculum_units(Base):
    __tablename__ = "curriculum_units"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    curriculum_upload_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)