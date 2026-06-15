from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Skill_prerequisites(Base):
    __tablename__ = "skill_prerequisites"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    skill_id = Column(Integer, nullable=False)
    prerequisite_skill_id = Column(Integer, nullable=False)
    relationship_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)