from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Path_nodes(Base):
    __tablename__ = "path_nodes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=True)
    learning_path_id = Column(Integer, nullable=False)
    node_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    parent_node_id = Column(Integer, nullable=True)
    content_config = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)