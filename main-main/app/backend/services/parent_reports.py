import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.parent_reports import Parent_reports

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Parent_reportsService:
    """Service layer for Parent_reports operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Parent_reports]:
        """Create a new parent_reports"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Parent_reports(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created parent_reports with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating parent_reports: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for parent_reports {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Parent_reports]:
        """Get parent_reports by ID (user can only see their own records)"""
        try:
            query = select(Parent_reports).where(Parent_reports.id == obj_id)
            if user_id:
                query = query.where(Parent_reports.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching parent_reports {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of parent_reportss (user can only see their own records)"""
        try:
            query = select(Parent_reports)
            count_query = select(func.count(Parent_reports.id))
            
            if user_id:
                query = query.where(Parent_reports.user_id == user_id)
                count_query = count_query.where(Parent_reports.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Parent_reports, field):
                        query = query.where(getattr(Parent_reports, field) == value)
                        count_query = count_query.where(getattr(Parent_reports, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Parent_reports, field_name):
                        query = query.order_by(getattr(Parent_reports, field_name).desc())
                else:
                    if hasattr(Parent_reports, sort):
                        query = query.order_by(getattr(Parent_reports, sort))
            else:
                query = query.order_by(Parent_reports.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching parent_reports list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Parent_reports]:
        """Update parent_reports (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Parent_reports {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated parent_reports {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating parent_reports {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete parent_reports (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Parent_reports {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted parent_reports {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting parent_reports {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Parent_reports]:
        """Get parent_reports by any field"""
        try:
            if not hasattr(Parent_reports, field_name):
                raise ValueError(f"Field {field_name} does not exist on Parent_reports")
            result = await self.db.execute(
                select(Parent_reports).where(getattr(Parent_reports, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching parent_reports by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Parent_reports]:
        """Get list of parent_reportss filtered by field"""
        try:
            if not hasattr(Parent_reports, field_name):
                raise ValueError(f"Field {field_name} does not exist on Parent_reports")
            result = await self.db.execute(
                select(Parent_reports)
                .where(getattr(Parent_reports, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Parent_reports.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching parent_reportss by {field_name}: {str(e)}")
            raise