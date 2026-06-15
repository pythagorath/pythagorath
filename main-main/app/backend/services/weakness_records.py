import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.weakness_records import Weakness_records

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Weakness_recordsService:
    """Service layer for Weakness_records operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Weakness_records]:
        """Create a new weakness_records"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Weakness_records(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created weakness_records with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating weakness_records: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for weakness_records {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Weakness_records]:
        """Get weakness_records by ID (user can only see their own records)"""
        try:
            query = select(Weakness_records).where(Weakness_records.id == obj_id)
            if user_id:
                query = query.where(Weakness_records.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching weakness_records {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of weakness_recordss (user can only see their own records)"""
        try:
            query = select(Weakness_records)
            count_query = select(func.count(Weakness_records.id))
            
            if user_id:
                query = query.where(Weakness_records.user_id == user_id)
                count_query = count_query.where(Weakness_records.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Weakness_records, field):
                        query = query.where(getattr(Weakness_records, field) == value)
                        count_query = count_query.where(getattr(Weakness_records, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Weakness_records, field_name):
                        query = query.order_by(getattr(Weakness_records, field_name).desc())
                else:
                    if hasattr(Weakness_records, sort):
                        query = query.order_by(getattr(Weakness_records, sort))
            else:
                query = query.order_by(Weakness_records.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching weakness_records list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Weakness_records]:
        """Update weakness_records (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Weakness_records {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated weakness_records {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating weakness_records {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete weakness_records (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Weakness_records {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted weakness_records {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting weakness_records {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Weakness_records]:
        """Get weakness_records by any field"""
        try:
            if not hasattr(Weakness_records, field_name):
                raise ValueError(f"Field {field_name} does not exist on Weakness_records")
            result = await self.db.execute(
                select(Weakness_records).where(getattr(Weakness_records, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching weakness_records by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Weakness_records]:
        """Get list of weakness_recordss filtered by field"""
        try:
            if not hasattr(Weakness_records, field_name):
                raise ValueError(f"Field {field_name} does not exist on Weakness_records")
            result = await self.db.execute(
                select(Weakness_records)
                .where(getattr(Weakness_records, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Weakness_records.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching weakness_recordss by {field_name}: {str(e)}")
            raise