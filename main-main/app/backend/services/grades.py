import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.grades import Grades

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class GradesService:
    """Service layer for Grades operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Grades]:
        """Create a new grades"""
        try:
            obj = Grades(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created grades with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating grades: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Grades]:
        """Get grades by ID"""
        try:
            query = select(Grades).where(Grades.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching grades {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of gradess"""
        try:
            query = select(Grades)
            count_query = select(func.count(Grades.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Grades, field):
                        query = query.where(getattr(Grades, field) == value)
                        count_query = count_query.where(getattr(Grades, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Grades, field_name):
                        query = query.order_by(getattr(Grades, field_name).desc())
                else:
                    if hasattr(Grades, sort):
                        query = query.order_by(getattr(Grades, sort))
            else:
                query = query.order_by(Grades.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching grades list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Grades]:
        """Update grades"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Grades {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated grades {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating grades {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete grades"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Grades {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted grades {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting grades {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Grades]:
        """Get grades by any field"""
        try:
            if not hasattr(Grades, field_name):
                raise ValueError(f"Field {field_name} does not exist on Grades")
            result = await self.db.execute(
                select(Grades).where(getattr(Grades, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching grades by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Grades]:
        """Get list of gradess filtered by field"""
        try:
            if not hasattr(Grades, field_name):
                raise ValueError(f"Field {field_name} does not exist on Grades")
            result = await self.db.execute(
                select(Grades)
                .where(getattr(Grades, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Grades.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching gradess by {field_name}: {str(e)}")
            raise