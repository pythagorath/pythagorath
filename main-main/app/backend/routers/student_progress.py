import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.student_progress import Student_progressService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/student_progress", tags=["student_progress"])


# ---------- Pydantic Schemas ----------
class Student_progressData(BaseModel):
    """Entity data schema (for create/update)"""
    lesson_id: int
    completed: bool = None
    completed_at: str = None


class Student_progressUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    lesson_id: Optional[int] = None
    completed: Optional[bool] = None
    completed_at: Optional[str] = None


class Student_progressResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    lesson_id: int
    completed: Optional[bool] = None
    completed_at: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Student_progressListResponse(BaseModel):
    """List response schema"""
    items: List[Student_progressResponse]
    total: int
    skip: int
    limit: int


class Student_progressBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Student_progressData]


class Student_progressBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Student_progressUpdateData


class Student_progressBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Student_progressBatchUpdateItem]


class Student_progressBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Student_progressListResponse)
async def query_student_progresss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query student_progresss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying student_progresss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Student_progressService(db)
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
        logger.debug(f"Found {result['total']} student_progresss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying student_progresss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Student_progressListResponse)
async def query_student_progresss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query student_progresss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying student_progresss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Student_progressService(db)
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
        logger.debug(f"Found {result['total']} student_progresss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying student_progresss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Student_progressResponse)
async def get_student_progress(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single student_progress by ID (user can only see their own records)"""
    logger.debug(f"Fetching student_progress with id: {id}, fields={fields}")
    
    service = Student_progressService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Student_progress with id {id} not found")
            raise HTTPException(status_code=404, detail="Student_progress not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student_progress {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Student_progressResponse, status_code=201)
async def create_student_progress(
    data: Student_progressData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new student_progress"""
    logger.debug(f"Creating new student_progress with data: {data}")
    
    service = Student_progressService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create student_progress")
        
        logger.info(f"Student_progress created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating student_progress: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating student_progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Student_progressResponse], status_code=201)
async def create_student_progresss_batch(
    request: Student_progressBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple student_progresss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} student_progresss")
    
    service = Student_progressService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} student_progresss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Student_progressResponse])
async def update_student_progresss_batch(
    request: Student_progressBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple student_progresss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} student_progresss")
    
    service = Student_progressService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} student_progresss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Student_progressResponse)
async def update_student_progress(
    id: int,
    data: Student_progressUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing student_progress (requires ownership)"""
    logger.debug(f"Updating student_progress {id} with data: {data}")

    service = Student_progressService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Student_progress with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Student_progress not found")
        
        logger.info(f"Student_progress {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating student_progress {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating student_progress {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_student_progresss_batch(
    request: Student_progressBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple student_progresss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} student_progresss")
    
    service = Student_progressService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} student_progresss successfully")
        return {"message": f"Successfully deleted {deleted_count} student_progresss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_student_progress(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single student_progress by ID (requires ownership)"""
    logger.debug(f"Deleting student_progress with id: {id}")
    
    service = Student_progressService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Student_progress with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Student_progress not found")
        
        logger.info(f"Student_progress {id} deleted successfully")
        return {"message": "Student_progress deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student_progress {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")