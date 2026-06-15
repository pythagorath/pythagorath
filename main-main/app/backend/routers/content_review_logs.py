import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.content_review_logs import Content_review_logsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/content_review_logs", tags=["content_review_logs"])


# ---------- Pydantic Schemas ----------
class Content_review_logsData(BaseModel):
    """Entity data schema (for create/update)"""
    entity_type: str
    entity_id: int
    action: str
    notes: str = None
    previous_status: str = None
    new_status: str = None


class Content_review_logsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    action: Optional[str] = None
    notes: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None


class Content_review_logsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    entity_type: str
    entity_id: int
    action: str
    notes: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Content_review_logsListResponse(BaseModel):
    """List response schema"""
    items: List[Content_review_logsResponse]
    total: int
    skip: int
    limit: int


class Content_review_logsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Content_review_logsData]


class Content_review_logsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Content_review_logsUpdateData


class Content_review_logsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Content_review_logsBatchUpdateItem]


class Content_review_logsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Content_review_logsListResponse)
async def query_content_review_logss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query content_review_logss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying content_review_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Content_review_logsService(db)
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
        logger.debug(f"Found {result['total']} content_review_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying content_review_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Content_review_logsListResponse)
async def query_content_review_logss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query content_review_logss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying content_review_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Content_review_logsService(db)
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
        logger.debug(f"Found {result['total']} content_review_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying content_review_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Content_review_logsResponse)
async def get_content_review_logs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single content_review_logs by ID (user can only see their own records)"""
    logger.debug(f"Fetching content_review_logs with id: {id}, fields={fields}")
    
    service = Content_review_logsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Content_review_logs with id {id} not found")
            raise HTTPException(status_code=404, detail="Content_review_logs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching content_review_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Content_review_logsResponse, status_code=201)
async def create_content_review_logs(
    data: Content_review_logsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new content_review_logs"""
    logger.debug(f"Creating new content_review_logs with data: {data}")
    
    service = Content_review_logsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create content_review_logs")
        
        logger.info(f"Content_review_logs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating content_review_logs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating content_review_logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Content_review_logsResponse], status_code=201)
async def create_content_review_logss_batch(
    request: Content_review_logsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple content_review_logss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} content_review_logss")
    
    service = Content_review_logsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} content_review_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Content_review_logsResponse])
async def update_content_review_logss_batch(
    request: Content_review_logsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple content_review_logss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} content_review_logss")
    
    service = Content_review_logsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} content_review_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Content_review_logsResponse)
async def update_content_review_logs(
    id: int,
    data: Content_review_logsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing content_review_logs (requires ownership)"""
    logger.debug(f"Updating content_review_logs {id} with data: {data}")

    service = Content_review_logsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Content_review_logs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Content_review_logs not found")
        
        logger.info(f"Content_review_logs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating content_review_logs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating content_review_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_content_review_logss_batch(
    request: Content_review_logsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple content_review_logss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} content_review_logss")
    
    service = Content_review_logsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} content_review_logss successfully")
        return {"message": f"Successfully deleted {deleted_count} content_review_logss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_content_review_logs(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single content_review_logs by ID (requires ownership)"""
    logger.debug(f"Deleting content_review_logs with id: {id}")
    
    service = Content_review_logsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Content_review_logs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Content_review_logs not found")
        
        logger.info(f"Content_review_logs {id} deleted successfully")
        return {"message": "Content_review_logs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting content_review_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")