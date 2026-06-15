from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Point_transactions(Base):
    __tablename__ = "point_transactions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    points = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)