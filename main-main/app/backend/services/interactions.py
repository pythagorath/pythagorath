import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.interactions import Interactions

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class InteractionsService:
    """Service layer for Interactions operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Interactions]:
        """Create a new interactions"""
        try:
            obj = Interactions(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created interactions with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating interactions: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Interactions]:
        """Get interactions by ID"""
        try:
            query = select(Interactions).where(Interactions.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching interactions {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of interactionss"""
        try:
            query = select(Interactions)
            count_query = select(func.count(Interactions.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Interactions, field):
                        query = query.where(getattr(Interactions, field) == value)
                        count_query = count_query.where(getattr(Interactions, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Interactions, field_name):
                        query = query.order_by(getattr(Interactions, field_name).desc())
                else:
                    if hasattr(Interactions, sort):
                        query = query.order_by(getattr(Interactions, sort))
            else:
                query = query.order_by(Interactions.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching interactions list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Interactions]:
        """Update interactions"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Interactions {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated interactions {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating interactions {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete interactions"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Interactions {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted interactions {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting interactions {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Interactions]:
        """Get interactions by any field"""
        try:
            if not hasattr(Interactions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Interactions")
            result = await self.db.execute(
                select(Interactions).where(getattr(Interactions, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching interactions by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Interactions]:
        """Get list of interactionss filtered by field"""
        try:
            if not hasattr(Interactions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Interactions")
            result = await self.db.execute(
                select(Interactions)
                .where(getattr(Interactions, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Interactions.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching interactionss by {field_name}: {str(e)}")
            raise