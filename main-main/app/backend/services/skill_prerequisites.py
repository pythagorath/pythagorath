import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.skill_prerequisites import Skill_prerequisites

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Skill_prerequisitesService:
    """Service layer for Skill_prerequisites operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Skill_prerequisites]:
        """Create a new skill_prerequisites"""
        try:
            obj = Skill_prerequisites(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created skill_prerequisites with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating skill_prerequisites: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Skill_prerequisites]:
        """Get skill_prerequisites by ID"""
        try:
            query = select(Skill_prerequisites).where(Skill_prerequisites.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching skill_prerequisites {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of skill_prerequisitess"""
        try:
            query = select(Skill_prerequisites)
            count_query = select(func.count(Skill_prerequisites.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Skill_prerequisites, field):
                        query = query.where(getattr(Skill_prerequisites, field) == value)
                        count_query = count_query.where(getattr(Skill_prerequisites, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Skill_prerequisites, field_name):
                        query = query.order_by(getattr(Skill_prerequisites, field_name).desc())
                else:
                    if hasattr(Skill_prerequisites, sort):
                        query = query.order_by(getattr(Skill_prerequisites, sort))
            else:
                query = query.order_by(Skill_prerequisites.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching skill_prerequisites list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Skill_prerequisites]:
        """Update skill_prerequisites"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Skill_prerequisites {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated skill_prerequisites {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating skill_prerequisites {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete skill_prerequisites"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Skill_prerequisites {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted skill_prerequisites {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting skill_prerequisites {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Skill_prerequisites]:
        """Get skill_prerequisites by any field"""
        try:
            if not hasattr(Skill_prerequisites, field_name):
                raise ValueError(f"Field {field_name} does not exist on Skill_prerequisites")
            result = await self.db.execute(
                select(Skill_prerequisites).where(getattr(Skill_prerequisites, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching skill_prerequisites by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Skill_prerequisites]:
        """Get list of skill_prerequisitess filtered by field"""
        try:
            if not hasattr(Skill_prerequisites, field_name):
                raise ValueError(f"Field {field_name} does not exist on Skill_prerequisites")
            result = await self.db.execute(
                select(Skill_prerequisites)
                .where(getattr(Skill_prerequisites, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Skill_prerequisites.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching skill_prerequisitess by {field_name}: {str(e)}")
            raise