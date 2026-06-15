import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin_subjects import Admin_subjects

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Admin_subjectsService:
    """Service layer for Admin_subjects operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Admin_subjects]:
        """Create a new admin_subjects"""
        try:
            obj = Admin_subjects(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created admin_subjects with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating admin_subjects: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Admin_subjects]:
        """Get admin_subjects by ID"""
        try:
            query = select(Admin_subjects).where(Admin_subjects.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching admin_subjects {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of admin_subjectss"""
        try:
            query = select(Admin_subjects)
            count_query = select(func.count(Admin_subjects.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Admin_subjects, field):
                        query = query.where(getattr(Admin_subjects, field) == value)
                        count_query = count_query.where(getattr(Admin_subjects, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Admin_subjects, field_name):
                        query = query.order_by(getattr(Admin_subjects, field_name).desc())
                else:
                    if hasattr(Admin_subjects, sort):
                        query = query.order_by(getattr(Admin_subjects, sort))
            else:
                query = query.order_by(Admin_subjects.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching admin_subjects list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Admin_subjects]:
        """Update admin_subjects"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Admin_subjects {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated admin_subjects {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating admin_subjects {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete admin_subjects"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Admin_subjects {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted admin_subjects {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting admin_subjects {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Admin_subjects]:
        """Get admin_subjects by any field"""
        try:
            if not hasattr(Admin_subjects, field_name):
                raise ValueError(f"Field {field_name} does not exist on Admin_subjects")
            result = await self.db.execute(
                select(Admin_subjects).where(getattr(Admin_subjects, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching admin_subjects by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Admin_subjects]:
        """Get list of admin_subjectss filtered by field"""
        try:
            if not hasattr(Admin_subjects, field_name):
                raise ValueError(f"Field {field_name} does not exist on Admin_subjects")
            result = await self.db.execute(
                select(Admin_subjects)
                .where(getattr(Admin_subjects, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Admin_subjects.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching admin_subjectss by {field_name}: {str(e)}")
            raise