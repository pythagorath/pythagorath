import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.skill_remediation_paths import Skill_remediation_paths

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Skill_remediation_pathsService:
    """Service layer for Skill_remediation_paths operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Skill_remediation_paths]:
        """Create a new skill_remediation_paths"""
        try:
            obj = Skill_remediation_paths(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created skill_remediation_paths with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating skill_remediation_paths: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Skill_remediation_paths]:
        """Get skill_remediation_paths by ID"""
        try:
            query = select(Skill_remediation_paths).where(Skill_remediation_paths.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching skill_remediation_paths {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of skill_remediation_pathss"""
        try:
            query = select(Skill_remediation_paths)
            count_query = select(func.count(Skill_remediation_paths.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Skill_remediation_paths, field):
                        query = query.where(getattr(Skill_remediation_paths, field) == value)
                        count_query = count_query.where(getattr(Skill_remediation_paths, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Skill_remediation_paths, field_name):
                        query = query.order_by(getattr(Skill_remediation_paths, field_name).desc())
                else:
                    if hasattr(Skill_remediation_paths, sort):
                        query = query.order_by(getattr(Skill_remediation_paths, sort))
            else:
                query = query.order_by(Skill_remediation_paths.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching skill_remediation_paths list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Skill_remediation_paths]:
        """Update skill_remediation_paths"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Skill_remediation_paths {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated skill_remediation_paths {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating skill_remediation_paths {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete skill_remediation_paths"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Skill_remediation_paths {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted skill_remediation_paths {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting skill_remediation_paths {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Skill_remediation_paths]:
        """Get skill_remediation_paths by any field"""
        try:
            if not hasattr(Skill_remediation_paths, field_name):
                raise ValueError(f"Field {field_name} does not exist on Skill_remediation_paths")
            result = await self.db.execute(
                select(Skill_remediation_paths).where(getattr(Skill_remediation_paths, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching skill_remediation_paths by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Skill_remediation_paths]:
        """Get list of skill_remediation_pathss filtered by field"""
        try:
            if not hasattr(Skill_remediation_paths, field_name):
                raise ValueError(f"Field {field_name} does not exist on Skill_remediation_paths")
            result = await self.db.execute(
                select(Skill_remediation_paths)
                .where(getattr(Skill_remediation_paths, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Skill_remediation_paths.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching skill_remediation_pathss by {field_name}: {str(e)}")
            raise