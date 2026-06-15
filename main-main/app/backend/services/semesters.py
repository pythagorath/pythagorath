import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.semesters import Semesters

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class SemestersService:
    """Service layer for Semesters operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Semesters]:
        """Create a new semesters"""
        try:
            obj = Semesters(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created semesters with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating semesters: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Semesters]:
        """Get semesters by ID"""
        try:
            query = select(Semesters).where(Semesters.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching semesters {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of semesterss"""
        try:
            query = select(Semesters)
            count_query = select(func.count(Semesters.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Semesters, field):
                        query = query.where(getattr(Semesters, field) == value)
                        count_query = count_query.where(getattr(Semesters, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Semesters, field_name):
                        query = query.order_by(getattr(Semesters, field_name).desc())
                else:
                    if hasattr(Semesters, sort):
                        query = query.order_by(getattr(Semesters, sort))
            else:
                query = query.order_by(Semesters.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching semesters list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Semesters]:
        """Update semesters"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Semesters {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated semesters {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating semesters {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete semesters"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Semesters {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted semesters {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting semesters {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Semesters]:
        """Get semesters by any field"""
        try:
            if not hasattr(Semesters, field_name):
                raise ValueError(f"Field {field_name} does not exist on Semesters")
            result = await self.db.execute(
                select(Semesters).where(getattr(Semesters, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching semesters by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Semesters]:
        """Get list of semesterss filtered by field"""
        try:
            if not hasattr(Semesters, field_name):
                raise ValueError(f"Field {field_name} does not exist on Semesters")
            result = await self.db.execute(
                select(Semesters)
                .where(getattr(Semesters, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Semesters.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching semesterss by {field_name}: {str(e)}")
            raise