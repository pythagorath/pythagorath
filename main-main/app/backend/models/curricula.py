from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Curricula(Base):
    __tablename__ = "curricula"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    country_id = Column(Integer, nullable=False)
    name_ar = Column(String, nullable=False)
    name_en = Column(String, nullable=False)
    academic_year = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    display_order = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)