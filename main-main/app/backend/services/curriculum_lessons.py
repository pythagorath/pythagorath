import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.curriculum_lessons import Curriculum_lessons

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Curriculum_lessonsService:
    """Service layer for Curriculum_lessons operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Curriculum_lessons]:
        """Create a new curriculum_lessons"""
        try:
            obj = Curriculum_lessons(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created curriculum_lessons with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating curriculum_lessons: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Curriculum_lessons]:
        """Get curriculum_lessons by ID"""
        try:
            query = select(Curriculum_lessons).where(Curriculum_lessons.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching curriculum_lessons {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of curriculum_lessonss"""
        try:
            query = select(Curriculum_lessons)
            count_query = select(func.count(Curriculum_lessons.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Curriculum_lessons, field):
                        query = query.where(getattr(Curriculum_lessons, field) == value)
                        count_query = count_query.where(getattr(Curriculum_lessons, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Curriculum_lessons, field_name):
                        query = query.order_by(getattr(Curriculum_lessons, field_name).desc())
                else:
                    if hasattr(Curriculum_lessons, sort):
                        query = query.order_by(getattr(Curriculum_lessons, sort))
            else:
                query = query.order_by(Curriculum_lessons.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching curriculum_lessons list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Curriculum_lessons]:
        """Update curriculum_lessons"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Curriculum_lessons {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated curriculum_lessons {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating curriculum_lessons {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete curriculum_lessons"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Curriculum_lessons {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted curriculum_lessons {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting curriculum_lessons {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Curriculum_lessons]:
        """Get curriculum_lessons by any field"""
        try:
            if not hasattr(Curriculum_lessons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Curriculum_lessons")
            result = await self.db.execute(
                select(Curriculum_lessons).where(getattr(Curriculum_lessons, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching curriculum_lessons by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Curriculum_lessons]:
        """Get list of curriculum_lessonss filtered by field"""
        try:
            if not hasattr(Curriculum_lessons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Curriculum_lessons")
            result = await self.db.execute(
                select(Curriculum_lessons)
                .where(getattr(Curriculum_lessons, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Curriculum_lessons.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching curriculum_lessonss by {field_name}: {str(e)}")
            raise