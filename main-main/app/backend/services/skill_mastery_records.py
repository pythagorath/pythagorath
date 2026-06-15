import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.skill_mastery_records import Skill_mastery_records

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Skill_mastery_recordsService:
    """Service layer for Skill_mastery_records operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Skill_mastery_records]:
        """Create a new skill_mastery_records"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Skill_mastery_records(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created skill_mastery_records with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating skill_mastery_records: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for skill_mastery_records {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Skill_mastery_records]:
        """Get skill_mastery_records by ID (user can only see their own records)"""
        try:
            query = select(Skill_mastery_records).where(Skill_mastery_records.id == obj_id)
            if user_id:
                query = query.where(Skill_mastery_records.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching skill_mastery_records {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of skill_mastery_recordss (user can only see their own records)"""
        try:
            query = select(Skill_mastery_records)
            count_query = select(func.count(Skill_mastery_records.id))
            
            if user_id:
                query = query.where(Skill_mastery_records.user_id == user_id)
                count_query = count_query.where(Skill_mastery_records.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Skill_mastery_records, field):
                        query = query.where(getattr(Skill_mastery_records, field) == value)
                        count_query = count_query.where(getattr(Skill_mastery_records, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Skill_mastery_records, field_name):
                        query = query.order_by(getattr(Skill_mastery_records, field_name).desc())
                else:
                    if hasattr(Skill_mastery_records, sort):
                        query = query.order_by(getattr(Skill_mastery_records, sort))
            else:
                query = query.order_by(Skill_mastery_records.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching skill_mastery_records list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Skill_mastery_records]:
        """Update skill_mastery_records (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Skill_mastery_records {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated skill_mastery_records {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating skill_mastery_records {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete skill_mastery_records (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Skill_mastery_records {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted skill_mastery_records {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting skill_mastery_records {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Skill_mastery_records]:
        """Get skill_mastery_records by any field"""
        try:
            if not hasattr(Skill_mastery_records, field_name):
                raise ValueError(f"Field {field_name} does not exist on Skill_mastery_records")
            result = await self.db.execute(
                select(Skill_mastery_records).where(getattr(Skill_mastery_records, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching skill_mastery_records by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Skill_mastery_records]:
        """Get list of skill_mastery_recordss filtered by field"""
        try:
            if not hasattr(Skill_mastery_records, field_name):
                raise ValueError(f"Field {field_name} does not exist on Skill_mastery_records")
            result = await self.db.execute(
                select(Skill_mastery_records)
                .where(getattr(Skill_mastery_records, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Skill_mastery_records.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching skill_mastery_recordss by {field_name}: {str(e)}")
            raise

    async def upsert_by_skill(self, user_id: str, skill_id: int, data: Dict[str, Any]) -> Skill_mastery_records:
        """Upsert mastery record - update if exists, create if not"""
        try:
            query = select(Skill_mastery_records).where(
                Skill_mastery_records.user_id == user_id,
                Skill_mastery_records.skill_id == skill_id
            )
            result = await self.db.execute(query)
            existing = result.scalar_one_or_none()

            if existing:
                for key, value in data.items():
                    if hasattr(existing, key) and key not in ('user_id', 'skill_id', 'id'):
                        setattr(existing, key, value)
                await self.db.commit()
                await self.db.refresh(existing)
                logger.info(f"Updated mastery record for user={user_id}, skill={skill_id}")
                return existing
            else:
                data['user_id'] = user_id
                data['skill_id'] = skill_id
                obj = Skill_mastery_records(**data)
                self.db.add(obj)
                await self.db.commit()
                await self.db.refresh(obj)
                logger.info(f"Created mastery record for user={user_id}, skill={skill_id}")
                return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error upserting mastery record: {str(e)}")
            raise

    async def get_user_mastery_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary of user's mastery across all skills"""
        try:
            query = select(Skill_mastery_records).where(Skill_mastery_records.user_id == user_id)
            result = await self.db.execute(query)
            records = result.scalars().all()

            total = len(records)
            mastered = sum(1 for r in records if r.status == 'mastered')
            learning = sum(1 for r in records if r.status == 'learning')
            needs_review = sum(1 for r in records if r.status == 'needs_review')
            avg_mastery = sum(r.mastery_level or 0 for r in records) / total if total > 0 else 0

            return {
                "total_skills_attempted": total,
                "mastered": mastered,
                "learning": learning,
                "needs_review": needs_review,
                "average_mastery": round(avg_mastery, 3),
            }
        except Exception as e:
            logger.error(f"Error getting mastery summary for user {user_id}: {str(e)}")
            raise