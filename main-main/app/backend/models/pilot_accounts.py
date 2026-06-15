from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Pilot_accounts(Base):
    __tablename__ = "pilot_accounts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    account_type = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    grade_level = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)