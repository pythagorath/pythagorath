import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.skill_mastery_records import Skill_mastery_recordsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/skill_mastery_records", tags=["skill_mastery_records"])


# ---------- Pydantic Schemas ----------
class Skill_mastery_recordsData(BaseModel):
    """Entity data schema (for create/update)"""
    skill_id: int
    mastery_level: float = None
    confidence_score: float = None
    attempts_count: int = None
    correct_count: int = None
    streak: int = None
    last_practiced_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None
    status: str = None


class Skill_mastery_recordsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    skill_id: Optional[int] = None
    mastery_level: Optional[float] = None
    confidence_score: Optional[float] = None
    attempts_count: Optional[int] = None
    correct_count: Optional[int] = None
    streak: Optional[int] = None
    last_practiced_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None
    status: Optional[str] = None


class Skill_mastery_recordsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    skill_id: int
    mastery_level: Optional[float] = None
    confidence_score: Optional[float] = None
    attempts_count: Optional[int] = None
    correct_count: Optional[int] = None
    streak: Optional[int] = None
    last_practiced_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Skill_mastery_recordsListResponse(BaseModel):
    """List response schema"""
    items: List[Skill_mastery_recordsResponse]
    total: int
    skip: int
    limit: int


class Skill_mastery_recordsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Skill_mastery_recordsData]


class Skill_mastery_recordsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Skill_mastery_recordsUpdateData


class Skill_mastery_recordsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Skill_mastery_recordsBatchUpdateItem]


class Skill_mastery_recordsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Skill_mastery_recordsListResponse)
async def query_skill_mastery_recordss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query skill_mastery_recordss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying skill_mastery_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Skill_mastery_recordsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} skill_mastery_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying skill_mastery_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Skill_mastery_recordsListResponse)
async def query_skill_mastery_recordss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query skill_mastery_recordss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying skill_mastery_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Skill_mastery_recordsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} skill_mastery_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying skill_mastery_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Skill_mastery_recordsResponse)
async def get_skill_mastery_records(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single skill_mastery_records by ID (user can only see their own records)"""
    logger.debug(f"Fetching skill_mastery_records with id: {id}, fields={fields}")
    
    service = Skill_mastery_recordsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Skill_mastery_records with id {id} not found")
            raise HTTPException(status_code=404, detail="Skill_mastery_records not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching skill_mastery_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Skill_mastery_recordsResponse, status_code=201)
async def create_skill_mastery_records(
    data: Skill_mastery_recordsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new skill_mastery_records"""
    logger.debug(f"Creating new skill_mastery_records with data: {data}")
    
    service = Skill_mastery_recordsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create skill_mastery_records")
        
        logger.info(f"Skill_mastery_records created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating skill_mastery_records: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating skill_mastery_records: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Skill_mastery_recordsResponse], status_code=201)
async def create_skill_mastery_recordss_batch(
    request: Skill_mastery_recordsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple skill_mastery_recordss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} skill_mastery_recordss")
    
    service = Skill_mastery_recordsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} skill_mastery_recordss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Skill_mastery_recordsResponse])
async def update_skill_mastery_recordss_batch(
    request: Skill_mastery_recordsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple skill_mastery_recordss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} skill_mastery_recordss")
    
    service = Skill_mastery_recordsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} skill_mastery_recordss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Skill_mastery_recordsResponse)
async def update_skill_mastery_records(
    id: int,
    data: Skill_mastery_recordsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing skill_mastery_records (requires ownership)"""
    logger.debug(f"Updating skill_mastery_records {id} with data: {data}")

    service = Skill_mastery_recordsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Skill_mastery_records with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Skill_mastery_records not found")
        
        logger.info(f"Skill_mastery_records {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating skill_mastery_records {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating skill_mastery_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_skill_mastery_recordss_batch(
    request: Skill_mastery_recordsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple skill_mastery_recordss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} skill_mastery_recordss")
    
    service = Skill_mastery_recordsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} skill_mastery_recordss successfully")
        return {"message": f"Successfully deleted {deleted_count} skill_mastery_recordss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_skill_mastery_records(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single skill_mastery_records by ID (requires ownership)"""
    logger.debug(f"Deleting skill_mastery_records with id: {id}")
    
    service = Skill_mastery_recordsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Skill_mastery_records with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Skill_mastery_records not found")
        
        logger.info(f"Skill_mastery_records {id} deleted successfully")
        return {"message": "Skill_mastery_records deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting skill_mastery_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ---------- Custom Endpoints ----------

class UpsertMasteryRequest(BaseModel):
    """Upsert mastery data for a specific skill"""
    skill_id: int
    mastery_level: Optional[float] = None
    confidence_score: Optional[float] = None
    attempts_count: Optional[int] = None
    correct_count: Optional[int] = None
    streak: Optional[int] = None
    last_practiced_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None
    status: Optional[str] = None


@router.post("/upsert", response_model=Skill_mastery_recordsResponse)
async def upsert_skill_mastery(
    data: UpsertMasteryRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert mastery record - creates if not exists, updates if exists"""
    service = Skill_mastery_recordsService(db)
    try:
        update_data = data.model_dump(exclude_none=True, exclude={'skill_id'})
        result = await service.upsert_by_skill(
            user_id=str(current_user.id),
            skill_id=data.skill_id,
            data=update_data
        )
        return result
    except Exception as e:
        logger.error(f"Error upserting mastery: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


class MasterySummaryResponse(BaseModel):
    """Summary of user's mastery progress"""
    total_skills_attempted: int
    mastered: int
    learning: int
    needs_review: int
    average_mastery: float


@router.get("/summary/me", response_model=MasterySummaryResponse)
async def get_my_mastery_summary(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's mastery summary across all skills"""
    service = Skill_mastery_recordsService(db)
    try:
        summary = await service.get_user_mastery_summary(str(current_user.id))
        return summary
    except Exception as e:
        logger.error(f"Error getting mastery summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")