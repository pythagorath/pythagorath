import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.student_path_progress import Student_path_progress

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Student_path_progressService:
    """Service layer for Student_path_progress operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Student_path_progress]:
        """Create a new student_path_progress"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Student_path_progress(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created student_path_progress with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating student_path_progress: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for student_path_progress {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Student_path_progress]:
        """Get student_path_progress by ID (user can only see their own records)"""
        try:
            query = select(Student_path_progress).where(Student_path_progress.id == obj_id)
            if user_id:
                query = query.where(Student_path_progress.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching student_path_progress {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of student_path_progresss (user can only see their own records)"""
        try:
            query = select(Student_path_progress)
            count_query = select(func.count(Student_path_progress.id))
            
            if user_id:
                query = query.where(Student_path_progress.user_id == user_id)
                count_query = count_query.where(Student_path_progress.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Student_path_progress, field):
                        query = query.where(getattr(Student_path_progress, field) == value)
                        count_query = count_query.where(getattr(Student_path_progress, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Student_path_progress, field_name):
                        query = query.order_by(getattr(Student_path_progress, field_name).desc())
                else:
                    if hasattr(Student_path_progress, sort):
                        query = query.order_by(getattr(Student_path_progress, sort))
            else:
                query = query.order_by(Student_path_progress.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching student_path_progress list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Student_path_progress]:
        """Update student_path_progress (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Student_path_progress {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated student_path_progress {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating student_path_progress {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete student_path_progress (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Student_path_progress {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted student_path_progress {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting student_path_progress {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Student_path_progress]:
        """Get student_path_progress by any field"""
        try:
            if not hasattr(Student_path_progress, field_name):
                raise ValueError(f"Field {field_name} does not exist on Student_path_progress")
            result = await self.db.execute(
                select(Student_path_progress).where(getattr(Student_path_progress, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching student_path_progress by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Student_path_progress]:
        """Get list of student_path_progresss filtered by field"""
        try:
            if not hasattr(Student_path_progress, field_name):
                raise ValueError(f"Field {field_name} does not exist on Student_path_progress")
            result = await self.db.execute(
                select(Student_path_progress)
                .where(getattr(Student_path_progress, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Student_path_progress.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching student_path_progresss by {field_name}: {str(e)}")
            raise