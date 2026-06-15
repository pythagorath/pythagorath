import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.countries import Countries

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class CountriesService:
    """Service layer for Countries operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Countries]:
        """Create a new countries"""
        try:
            obj = Countries(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created countries with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating countries: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Countries]:
        """Get countries by ID"""
        try:
            query = select(Countries).where(Countries.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching countries {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of countriess"""
        try:
            query = select(Countries)
            count_query = select(func.count(Countries.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Countries, field):
                        query = query.where(getattr(Countries, field) == value)
                        count_query = count_query.where(getattr(Countries, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Countries, field_name):
                        query = query.order_by(getattr(Countries, field_name).desc())
                else:
                    if hasattr(Countries, sort):
                        query = query.order_by(getattr(Countries, sort))
            else:
                query = query.order_by(Countries.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching countries list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Countries]:
        """Update countries"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Countries {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated countries {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating countries {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete countries"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Countries {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted countries {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting countries {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Countries]:
        """Get countries by any field"""
        try:
            if not hasattr(Countries, field_name):
                raise ValueError(f"Field {field_name} does not exist on Countries")
            result = await self.db.execute(
                select(Countries).where(getattr(Countries, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching countries by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Countries]:
        """Get list of countriess filtered by field"""
        try:
            if not hasattr(Countries, field_name):
                raise ValueError(f"Field {field_name} does not exist on Countries")
            result = await self.db.execute(
                select(Countries)
                .where(getattr(Countries, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Countries.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching countriess by {field_name}: {str(e)}")
            raise