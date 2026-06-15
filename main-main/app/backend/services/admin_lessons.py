import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin_lessons import Admin_lessons

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Admin_lessonsService:
    """Service layer for Admin_lessons operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Admin_lessons]:
        """Create a new admin_lessons"""
        try:
            obj = Admin_lessons(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created admin_lessons with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating admin_lessons: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Admin_lessons]:
        """Get admin_lessons by ID"""
        try:
            query = select(Admin_lessons).where(Admin_lessons.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching admin_lessons {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of admin_lessonss"""
        try:
            query = select(Admin_lessons)
            count_query = select(func.count(Admin_lessons.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Admin_lessons, field):
                        query = query.where(getattr(Admin_lessons, field) == value)
                        count_query = count_query.where(getattr(Admin_lessons, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Admin_lessons, field_name):
                        query = query.order_by(getattr(Admin_lessons, field_name).desc())
                else:
                    if hasattr(Admin_lessons, sort):
                        query = query.order_by(getattr(Admin_lessons, sort))
            else:
                query = query.order_by(Admin_lessons.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching admin_lessons list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Admin_lessons]:
        """Update admin_lessons"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Admin_lessons {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated admin_lessons {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating admin_lessons {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete admin_lessons"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Admin_lessons {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted admin_lessons {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting admin_lessons {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Admin_lessons]:
        """Get admin_lessons by any field"""
        try:
            if not hasattr(Admin_lessons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Admin_lessons")
            result = await self.db.execute(
                select(Admin_lessons).where(getattr(Admin_lessons, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching admin_lessons by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Admin_lessons]:
        """Get list of admin_lessonss filtered by field"""
        try:
            if not hasattr(Admin_lessons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Admin_lessons")
            result = await self.db.execute(
                select(Admin_lessons)
                .where(getattr(Admin_lessons, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Admin_lessons.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching admin_lessonss by {field_name}: {str(e)}")
            raise