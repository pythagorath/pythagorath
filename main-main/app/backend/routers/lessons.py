import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.lessons import LessonsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/lessons", tags=["lessons"])


# ---------- Pydantic Schemas ----------
class LessonsData(BaseModel):
    """Entity data schema (for create/update)"""
    title: str
    subject_id: int
    grade: str
    video_url: str = None
    duration_minutes: int = None
    order_index: int = None


class LessonsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    title: Optional[str] = None
    subject_id: Optional[int] = None
    grade: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None


class LessonsResponse(BaseModel):
    """Entity response schema"""
    id: int
    title: str
    subject_id: int
    grade: str
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LessonsListResponse(BaseModel):
    """List response schema"""
    items: List[LessonsResponse]
    total: int
    skip: int
    limit: int


class LessonsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[LessonsData]


class LessonsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: LessonsUpdateData


class LessonsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[LessonsBatchUpdateItem]


class LessonsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=LessonsListResponse)
async def query_lessonss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query lessonss with filtering, sorting, and pagination"""
    logger.debug(f"Querying lessonss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = LessonsService(db)
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
        )
        logger.debug(f"Found {result['total']} lessonss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying lessonss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=LessonsListResponse)
async def query_lessonss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query lessonss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying lessonss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = LessonsService(db)
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
        logger.debug(f"Found {result['total']} lessonss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying lessonss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=LessonsResponse)
async def get_lessons(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single lessons by ID"""
    logger.debug(f"Fetching lessons with id: {id}, fields={fields}")
    
    service = LessonsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Lessons with id {id} not found")
            raise HTTPException(status_code=404, detail="Lessons not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lessons {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=LessonsResponse, status_code=201)
async def create_lessons(
    data: LessonsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new lessons"""
    logger.debug(f"Creating new lessons with data: {data}")
    
    service = LessonsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create lessons")
        
        logger.info(f"Lessons created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating lessons: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating lessons: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[LessonsResponse], status_code=201)
async def create_lessonss_batch(
    request: LessonsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple lessonss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} lessonss")
    
    service = LessonsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} lessonss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[LessonsResponse])
async def update_lessonss_batch(
    request: LessonsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple lessonss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} lessonss")
    
    service = LessonsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} lessonss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=LessonsResponse)
async def update_lessons(
    id: int,
    data: LessonsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing lessons"""
    logger.debug(f"Updating lessons {id} with data: {data}")

    service = LessonsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Lessons with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Lessons not found")
        
        logger.info(f"Lessons {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating lessons {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating lessons {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_lessonss_batch(
    request: LessonsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple lessonss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} lessonss")
    
    service = LessonsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} lessonss successfully")
        return {"message": f"Successfully deleted {deleted_count} lessonss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_lessons(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single lessons by ID"""
    logger.debug(f"Deleting lessons with id: {id}")
    
    service = LessonsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Lessons with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Lessons not found")
        
        logger.info(f"Lessons {id} deleted successfully")
        return {"message": "Lessons deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lessons {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")