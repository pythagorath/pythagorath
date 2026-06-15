import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.subjects import Subjects

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class SubjectsService:
    """Service layer for Subjects operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Subjects]:
        """Create a new subjects"""
        try:
            obj = Subjects(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created subjects with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating subjects: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Subjects]:
        """Get subjects by ID"""
        try:
            query = select(Subjects).where(Subjects.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching subjects {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of subjectss"""
        try:
            query = select(Subjects)
            count_query = select(func.count(Subjects.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Subjects, field):
                        query = query.where(getattr(Subjects, field) == value)
                        count_query = count_query.where(getattr(Subjects, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Subjects, field_name):
                        query = query.order_by(getattr(Subjects, field_name).desc())
                else:
                    if hasattr(Subjects, sort):
                        query = query.order_by(getattr(Subjects, sort))
            else:
                query = query.order_by(Subjects.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching subjects list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Subjects]:
        """Update subjects"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Subjects {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated subjects {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating subjects {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete subjects"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Subjects {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted subjects {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting subjects {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Subjects]:
        """Get subjects by any field"""
        try:
            if not hasattr(Subjects, field_name):
                raise ValueError(f"Field {field_name} does not exist on Subjects")
            result = await self.db.execute(
                select(Subjects).where(getattr(Subjects, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching subjects by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Subjects]:
        """Get list of subjectss filtered by field"""
        try:
            if not hasattr(Subjects, field_name):
                raise ValueError(f"Field {field_name} does not exist on Subjects")
            result = await self.db.execute(
                select(Subjects)
                .where(getattr(Subjects, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Subjects.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching subjectss by {field_name}: {str(e)}")
            raise