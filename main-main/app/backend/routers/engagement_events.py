import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.engagement_events import Engagement_eventsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/engagement_events", tags=["engagement_events"])


# ---------- Pydantic Schemas ----------
class Engagement_eventsData(BaseModel):
    """Entity data schema (for create/update)"""
    event_type: str
    skill_id: int = None
    question_id: int = None
    session_id: int = None
    time_spent_seconds: int = None
    is_correct: bool = None
    attempt_number: int = None
    page_context: str = None
    device_type: str = None
    extra_data: str = None


class Engagement_eventsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    event_type: Optional[str] = None
    skill_id: Optional[int] = None
    question_id: Optional[int] = None
    session_id: Optional[int] = None
    time_spent_seconds: Optional[int] = None
    is_correct: Optional[bool] = None
    attempt_number: Optional[int] = None
    page_context: Optional[str] = None
    device_type: Optional[str] = None
    extra_data: Optional[str] = None


class Engagement_eventsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    event_type: str
    skill_id: Optional[int] = None
    question_id: Optional[int] = None
    session_id: Optional[int] = None
    time_spent_seconds: Optional[int] = None
    is_correct: Optional[bool] = None
    attempt_number: Optional[int] = None
    page_context: Optional[str] = None
    device_type: Optional[str] = None
    extra_data: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Engagement_eventsListResponse(BaseModel):
    """List response schema"""
    items: List[Engagement_eventsResponse]
    total: int
    skip: int
    limit: int


class Engagement_eventsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Engagement_eventsData]


class Engagement_eventsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Engagement_eventsUpdateData


class Engagement_eventsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Engagement_eventsBatchUpdateItem]


class Engagement_eventsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Engagement_eventsListResponse)
async def query_engagement_eventss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query engagement_eventss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying engagement_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Engagement_eventsService(db)
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
        logger.debug(f"Found {result['total']} engagement_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying engagement_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Engagement_eventsListResponse)
async def query_engagement_eventss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query engagement_eventss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying engagement_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Engagement_eventsService(db)
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
        logger.debug(f"Found {result['total']} engagement_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying engagement_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Engagement_eventsResponse)
async def get_engagement_events(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single engagement_events by ID (user can only see their own records)"""
    logger.debug(f"Fetching engagement_events with id: {id}, fields={fields}")
    
    service = Engagement_eventsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Engagement_events with id {id} not found")
            raise HTTPException(status_code=404, detail="Engagement_events not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching engagement_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Engagement_eventsResponse, status_code=201)
async def create_engagement_events(
    data: Engagement_eventsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new engagement_events"""
    logger.debug(f"Creating new engagement_events with data: {data}")
    
    service = Engagement_eventsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create engagement_events")
        
        logger.info(f"Engagement_events created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating engagement_events: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating engagement_events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Engagement_eventsResponse], status_code=201)
async def create_engagement_eventss_batch(
    request: Engagement_eventsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple engagement_eventss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} engagement_eventss")
    
    service = Engagement_eventsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} engagement_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Engagement_eventsResponse])
async def update_engagement_eventss_batch(
    request: Engagement_eventsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple engagement_eventss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} engagement_eventss")
    
    service = Engagement_eventsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} engagement_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Engagement_eventsResponse)
async def update_engagement_events(
    id: int,
    data: Engagement_eventsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing engagement_events (requires ownership)"""
    logger.debug(f"Updating engagement_events {id} with data: {data}")

    service = Engagement_eventsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Engagement_events with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Engagement_events not found")
        
        logger.info(f"Engagement_events {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating engagement_events {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating engagement_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_engagement_eventss_batch(
    request: Engagement_eventsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple engagement_eventss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} engagement_eventss")
    
    service = Engagement_eventsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} engagement_eventss successfully")
        return {"message": f"Successfully deleted {deleted_count} engagement_eventss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_engagement_events(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single engagement_events by ID (requires ownership)"""
    logger.debug(f"Deleting engagement_events with id: {id}")
    
    service = Engagement_eventsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Engagement_events with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Engagement_events not found")
        
        logger.info(f"Engagement_events {id} deleted successfully")
        return {"message": "Engagement_events deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting engagement_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")