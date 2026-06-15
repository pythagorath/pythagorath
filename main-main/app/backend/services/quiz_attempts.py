import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.quiz_attempts import Quiz_attempts

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Quiz_attemptsService:
    """Service layer for Quiz_attempts operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Quiz_attempts]:
        """Create a new quiz_attempts"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Quiz_attempts(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created quiz_attempts with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating quiz_attempts: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for quiz_attempts {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Quiz_attempts]:
        """Get quiz_attempts by ID (user can only see their own records)"""
        try:
            query = select(Quiz_attempts).where(Quiz_attempts.id == obj_id)
            if user_id:
                query = query.where(Quiz_attempts.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching quiz_attempts {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of quiz_attemptss (user can only see their own records)"""
        try:
            query = select(Quiz_attempts)
            count_query = select(func.count(Quiz_attempts.id))
            
            if user_id:
                query = query.where(Quiz_attempts.user_id == user_id)
                count_query = count_query.where(Quiz_attempts.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Quiz_attempts, field):
                        query = query.where(getattr(Quiz_attempts, field) == value)
                        count_query = count_query.where(getattr(Quiz_attempts, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Quiz_attempts, field_name):
                        query = query.order_by(getattr(Quiz_attempts, field_name).desc())
                else:
                    if hasattr(Quiz_attempts, sort):
                        query = query.order_by(getattr(Quiz_attempts, sort))
            else:
                query = query.order_by(Quiz_attempts.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching quiz_attempts list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Quiz_attempts]:
        """Update quiz_attempts (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Quiz_attempts {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated quiz_attempts {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating quiz_attempts {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete quiz_attempts (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Quiz_attempts {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted quiz_attempts {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting quiz_attempts {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Quiz_attempts]:
        """Get quiz_attempts by any field"""
        try:
            if not hasattr(Quiz_attempts, field_name):
                raise ValueError(f"Field {field_name} does not exist on Quiz_attempts")
            result = await self.db.execute(
                select(Quiz_attempts).where(getattr(Quiz_attempts, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching quiz_attempts by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Quiz_attempts]:
        """Get list of quiz_attemptss filtered by field"""
        try:
            if not hasattr(Quiz_attempts, field_name):
                raise ValueError(f"Field {field_name} does not exist on Quiz_attempts")
            result = await self.db.execute(
                select(Quiz_attempts)
                .where(getattr(Quiz_attempts, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Quiz_attempts.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching quiz_attemptss by {field_name}: {str(e)}")
            raise