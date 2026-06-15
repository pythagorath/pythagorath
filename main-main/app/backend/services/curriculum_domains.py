import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.curriculum_domains import Curriculum_domains

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Curriculum_domainsService:
    """Service layer for Curriculum_domains operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Curriculum_domains]:
        """Create a new curriculum_domains"""
        try:
            obj = Curriculum_domains(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created curriculum_domains with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating curriculum_domains: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Curriculum_domains]:
        """Get curriculum_domains by ID"""
        try:
            query = select(Curriculum_domains).where(Curriculum_domains.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching curriculum_domains {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of curriculum_domainss"""
        try:
            query = select(Curriculum_domains)
            count_query = select(func.count(Curriculum_domains.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Curriculum_domains, field):
                        query = query.where(getattr(Curriculum_domains, field) == value)
                        count_query = count_query.where(getattr(Curriculum_domains, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Curriculum_domains, field_name):
                        query = query.order_by(getattr(Curriculum_domains, field_name).desc())
                else:
                    if hasattr(Curriculum_domains, sort):
                        query = query.order_by(getattr(Curriculum_domains, sort))
            else:
                query = query.order_by(Curriculum_domains.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching curriculum_domains list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Curriculum_domains]:
        """Update curriculum_domains"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Curriculum_domains {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated curriculum_domains {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating curriculum_domains {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete curriculum_domains"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Curriculum_domains {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted curriculum_domains {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting curriculum_domains {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Curriculum_domains]:
        """Get curriculum_domains by any field"""
        try:
            if not hasattr(Curriculum_domains, field_name):
                raise ValueError(f"Field {field_name} does not exist on Curriculum_domains")
            result = await self.db.execute(
                select(Curriculum_domains).where(getattr(Curriculum_domains, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching curriculum_domains by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Curriculum_domains]:
        """Get list of curriculum_domainss filtered by field"""
        try:
            if not hasattr(Curriculum_domains, field_name):
                raise ValueError(f"Field {field_name} does not exist on Curriculum_domains")
            result = await self.db.execute(
                select(Curriculum_domains)
                .where(getattr(Curriculum_domains, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Curriculum_domains.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching curriculum_domainss by {field_name}: {str(e)}")
            raise