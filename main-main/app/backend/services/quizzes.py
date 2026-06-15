import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.quizzes import Quizzes

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class QuizzesService:
    """Service layer for Quizzes operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Quizzes]:
        """Create a new quizzes"""
        try:
            obj = Quizzes(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created quizzes with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating quizzes: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Quizzes]:
        """Get quizzes by ID"""
        try:
            query = select(Quizzes).where(Quizzes.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching quizzes {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of quizzess"""
        try:
            query = select(Quizzes)
            count_query = select(func.count(Quizzes.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Quizzes, field):
                        query = query.where(getattr(Quizzes, field) == value)
                        count_query = count_query.where(getattr(Quizzes, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Quizzes, field_name):
                        query = query.order_by(getattr(Quizzes, field_name).desc())
                else:
                    if hasattr(Quizzes, sort):
                        query = query.order_by(getattr(Quizzes, sort))
            else:
                query = query.order_by(Quizzes.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching quizzes list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Quizzes]:
        """Update quizzes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Quizzes {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated quizzes {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating quizzes {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete quizzes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Quizzes {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted quizzes {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting quizzes {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Quizzes]:
        """Get quizzes by any field"""
        try:
            if not hasattr(Quizzes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Quizzes")
            result = await self.db.execute(
                select(Quizzes).where(getattr(Quizzes, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching quizzes by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Quizzes]:
        """Get list of quizzess filtered by field"""
        try:
            if not hasattr(Quizzes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Quizzes")
            result = await self.db.execute(
                select(Quizzes)
                .where(getattr(Quizzes, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Quizzes.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching quizzess by {field_name}: {str(e)}")
            raise