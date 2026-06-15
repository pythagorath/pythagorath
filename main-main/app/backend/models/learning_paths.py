from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Learning_paths(Base):
    __tablename__ = "learning_paths"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=True)
    curriculum_upload_id = Column(Integer, nullable=True)
    title = Column(String, nullable=False)
    grade_number = Column(Integer, nullable=False)
    subject_name = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    total_nodes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)