from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Content_review_logs(Base):
    __tablename__ = "content_review_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)