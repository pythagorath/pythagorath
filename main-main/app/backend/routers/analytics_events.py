import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.analytics_events import Analytics_eventsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/analytics_events", tags=["analytics_events"])


# ---------- Pydantic Schemas ----------
class Analytics_eventsData(BaseModel):
    """Entity data schema (for create/update)"""
    event_type: str
    event_data: str = None
    skill_id: int = None
    session_id: int = None


class Analytics_eventsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    event_type: Optional[str] = None
    event_data: Optional[str] = None
    skill_id: Optional[int] = None
    session_id: Optional[int] = None


class Analytics_eventsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    event_type: str
    event_data: Optional[str] = None
    skill_id: Optional[int] = None
    session_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Analytics_eventsListResponse(BaseModel):
    """List response schema"""
    items: List[Analytics_eventsResponse]
    total: int
    skip: int
    limit: int


class Analytics_eventsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Analytics_eventsData]


class Analytics_eventsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Analytics_eventsUpdateData


class Analytics_eventsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Analytics_eventsBatchUpdateItem]


class Analytics_eventsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Analytics_eventsListResponse)
async def query_analytics_eventss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query analytics_eventss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying analytics_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Analytics_eventsService(db)
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
        logger.debug(f"Found {result['total']} analytics_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying analytics_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Analytics_eventsListResponse)
async def query_analytics_eventss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query analytics_eventss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying analytics_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Analytics_eventsService(db)
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
        logger.debug(f"Found {result['total']} analytics_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying analytics_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Analytics_eventsResponse)
async def get_analytics_events(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single analytics_events by ID (user can only see their own records)"""
    logger.debug(f"Fetching analytics_events with id: {id}, fields={fields}")
    
    service = Analytics_eventsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Analytics_events with id {id} not found")
            raise HTTPException(status_code=404, detail="Analytics_events not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analytics_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Analytics_eventsResponse, status_code=201)
async def create_analytics_events(
    data: Analytics_eventsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new analytics_events"""
    logger.debug(f"Creating new analytics_events with data: {data}")
    
    service = Analytics_eventsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create analytics_events")
        
        logger.info(f"Analytics_events created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating analytics_events: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating analytics_events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Analytics_eventsResponse], status_code=201)
async def create_analytics_eventss_batch(
    request: Analytics_eventsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple analytics_eventss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} analytics_eventss")
    
    service = Analytics_eventsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} analytics_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Analytics_eventsResponse])
async def update_analytics_eventss_batch(
    request: Analytics_eventsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple analytics_eventss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} analytics_eventss")
    
    service = Analytics_eventsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} analytics_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Analytics_eventsResponse)
async def update_analytics_events(
    id: int,
    data: Analytics_eventsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing analytics_events (requires ownership)"""
    logger.debug(f"Updating analytics_events {id} with data: {data}")

    service = Analytics_eventsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Analytics_events with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Analytics_events not found")
        
        logger.info(f"Analytics_events {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating analytics_events {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating analytics_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_analytics_eventss_batch(
    request: Analytics_eventsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple analytics_eventss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} analytics_eventss")
    
    service = Analytics_eventsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} analytics_eventss successfully")
        return {"message": f"Successfully deleted {deleted_count} analytics_eventss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_analytics_events(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single analytics_events by ID (requires ownership)"""
    logger.debug(f"Deleting analytics_events with id: {id}")
    
    service = Analytics_eventsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Analytics_events with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Analytics_events not found")
        
        logger.info(f"Analytics_events {id} deleted successfully")
        return {"message": "Analytics_events deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting analytics_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")