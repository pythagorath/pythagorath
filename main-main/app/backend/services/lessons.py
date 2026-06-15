import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.lessons import Lessons

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class LessonsService:
    """Service layer for Lessons operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Lessons]:
        """Create a new lessons"""
        try:
            obj = Lessons(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created lessons with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating lessons: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Lessons]:
        """Get lessons by ID"""
        try:
            query = select(Lessons).where(Lessons.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching lessons {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of lessonss"""
        try:
            query = select(Lessons)
            count_query = select(func.count(Lessons.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Lessons, field):
                        query = query.where(getattr(Lessons, field) == value)
                        count_query = count_query.where(getattr(Lessons, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Lessons, field_name):
                        query = query.order_by(getattr(Lessons, field_name).desc())
                else:
                    if hasattr(Lessons, sort):
                        query = query.order_by(getattr(Lessons, sort))
            else:
                query = query.order_by(Lessons.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching lessons list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Lessons]:
        """Update lessons"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Lessons {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated lessons {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating lessons {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete lessons"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Lessons {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted lessons {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting lessons {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Lessons]:
        """Get lessons by any field"""
        try:
            if not hasattr(Lessons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Lessons")
            result = await self.db.execute(
                select(Lessons).where(getattr(Lessons, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching lessons by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Lessons]:
        """Get list of lessonss filtered by field"""
        try:
            if not hasattr(Lessons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Lessons")
            result = await self.db.execute(
                select(Lessons)
                .where(getattr(Lessons, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Lessons.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching lessonss by {field_name}: {str(e)}")
            raise