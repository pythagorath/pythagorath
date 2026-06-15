import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.pilot_feedback import Pilot_feedbackService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/pilot_feedback", tags=["pilot_feedback"])


# ---------- Pydantic Schemas ----------
class Pilot_feedbackData(BaseModel):
    """Entity data schema (for create/update)"""
    feedback_type: str
    rating: int = None
    ease_of_use: int = None
    clarity: int = None
    engagement: int = None
    comment: str = None
    page_context: str = None
    device_type: str = None


class Pilot_feedbackUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    feedback_type: Optional[str] = None
    rating: Optional[int] = None
    ease_of_use: Optional[int] = None
    clarity: Optional[int] = None
    engagement: Optional[int] = None
    comment: Optional[str] = None
    page_context: Optional[str] = None
    device_type: Optional[str] = None


class Pilot_feedbackResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    feedback_type: str
    rating: Optional[int] = None
    ease_of_use: Optional[int] = None
    clarity: Optional[int] = None
    engagement: Optional[int] = None
    comment: Optional[str] = None
    page_context: Optional[str] = None
    device_type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Pilot_feedbackListResponse(BaseModel):
    """List response schema"""
    items: List[Pilot_feedbackResponse]
    total: int
    skip: int
    limit: int


class Pilot_feedbackBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Pilot_feedbackData]


class Pilot_feedbackBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Pilot_feedbackUpdateData


class Pilot_feedbackBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Pilot_feedbackBatchUpdateItem]


class Pilot_feedbackBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Pilot_feedbackListResponse)
async def query_pilot_feedbacks(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query pilot_feedbacks with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying pilot_feedbacks: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Pilot_feedbackService(db)
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
        logger.debug(f"Found {result['total']} pilot_feedbacks")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying pilot_feedbacks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Pilot_feedbackListResponse)
async def query_pilot_feedbacks_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query pilot_feedbacks with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying pilot_feedbacks: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Pilot_feedbackService(db)
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
        logger.debug(f"Found {result['total']} pilot_feedbacks")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying pilot_feedbacks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Pilot_feedbackResponse)
async def get_pilot_feedback(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single pilot_feedback by ID (user can only see their own records)"""
    logger.debug(f"Fetching pilot_feedback with id: {id}, fields={fields}")
    
    service = Pilot_feedbackService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Pilot_feedback with id {id} not found")
            raise HTTPException(status_code=404, detail="Pilot_feedback not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pilot_feedback {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Pilot_feedbackResponse, status_code=201)
async def create_pilot_feedback(
    data: Pilot_feedbackData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new pilot_feedback"""
    logger.debug(f"Creating new pilot_feedback with data: {data}")
    
    service = Pilot_feedbackService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create pilot_feedback")
        
        logger.info(f"Pilot_feedback created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating pilot_feedback: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating pilot_feedback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Pilot_feedbackResponse], status_code=201)
async def create_pilot_feedbacks_batch(
    request: Pilot_feedbackBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple pilot_feedbacks in a single request"""
    logger.debug(f"Batch creating {len(request.items)} pilot_feedbacks")
    
    service = Pilot_feedbackService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} pilot_feedbacks successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Pilot_feedbackResponse])
async def update_pilot_feedbacks_batch(
    request: Pilot_feedbackBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple pilot_feedbacks in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} pilot_feedbacks")
    
    service = Pilot_feedbackService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} pilot_feedbacks successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Pilot_feedbackResponse)
async def update_pilot_feedback(
    id: int,
    data: Pilot_feedbackUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing pilot_feedback (requires ownership)"""
    logger.debug(f"Updating pilot_feedback {id} with data: {data}")

    service = Pilot_feedbackService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Pilot_feedback with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Pilot_feedback not found")
        
        logger.info(f"Pilot_feedback {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating pilot_feedback {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating pilot_feedback {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_pilot_feedbacks_batch(
    request: Pilot_feedbackBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple pilot_feedbacks by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} pilot_feedbacks")
    
    service = Pilot_feedbackService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} pilot_feedbacks successfully")
        return {"message": f"Successfully deleted {deleted_count} pilot_feedbacks", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_pilot_feedback(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single pilot_feedback by ID (requires ownership)"""
    logger.debug(f"Deleting pilot_feedback with id: {id}")
    
    service = Pilot_feedbackService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Pilot_feedback with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Pilot_feedback not found")
        
        logger.info(f"Pilot_feedback {id} deleted successfully")
        return {"message": "Pilot_feedback deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pilot_feedback {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")