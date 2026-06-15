from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Analysis_history(Base):
    __tablename__ = "analysis_history"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    total_wrong_answers = Column(Integer, nullable=False)
    weaknesses_count = Column(Integer, nullable=False)
    top_weakness = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    full_result = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)