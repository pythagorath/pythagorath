import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.admin_lessons import Admin_lessonsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/admin_lessons", tags=["admin_lessons"])


# ---------- Pydantic Schemas ----------
class Admin_lessonsData(BaseModel):
    """Entity data schema (for create/update)"""
    title: str = None
    name: str = None
    unit_id: int = None
    objectives: str = None
    content_type: str = None
    content_data: str = None
    display_order: int = None
    status: str = None
    country_id: int = None
    curriculum_id: int = None


class Admin_lessonsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    title: Optional[str] = None
    name: Optional[str] = None
    unit_id: Optional[int] = None
    objectives: Optional[str] = None
    content_type: Optional[str] = None
    content_data: Optional[str] = None
    display_order: Optional[int] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class Admin_lessonsResponse(BaseModel):
    """Entity response schema"""
    id: int
    title: Optional[str] = None
    name: Optional[str] = None
    unit_id: Optional[int] = None
    objectives: Optional[str] = None
    content_type: Optional[str] = None
    content_data: Optional[str] = None
    display_order: Optional[int] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Admin_lessonsListResponse(BaseModel):
    """List response schema"""
    items: List[Admin_lessonsResponse]
    total: int
    skip: int
    limit: int


class Admin_lessonsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Admin_lessonsData]


class Admin_lessonsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Admin_lessonsUpdateData


class Admin_lessonsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Admin_lessonsBatchUpdateItem]


class Admin_lessonsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


def _normalize_lesson_data(data_dict: dict) -> dict:
    """Ensure both title and name are populated for DB compatibility.
    If only title is provided, copy it to name. If only name is provided, copy to title."""
    if data_dict.get("title") and not data_dict.get("name"):
        data_dict["name"] = data_dict["title"]
    elif data_dict.get("name") and not data_dict.get("title"):
        data_dict["title"] = data_dict["name"]
    elif not data_dict.get("title") and not data_dict.get("name"):
        # At least one must be provided for creation
        pass
    return data_dict


# ---------- Routes ----------
@router.get("", response_model=Admin_lessonsListResponse)
async def query_admin_lessonss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query admin_lessonss with filtering, sorting, and pagination"""
    logger.debug(f"Querying admin_lessonss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Admin_lessonsService(db)
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
        logger.debug(f"Found {result['total']} admin_lessonss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying admin_lessonss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Admin_lessonsListResponse)
async def query_admin_lessonss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query admin_lessonss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying admin_lessonss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Admin_lessonsService(db)
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
        logger.debug(f"Found {result['total']} admin_lessonss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying admin_lessonss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Admin_lessonsResponse)
async def get_admin_lessons(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single admin_lessons by ID"""
    logger.debug(f"Fetching admin_lessons with id: {id}, fields={fields}")
    
    service = Admin_lessonsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Admin_lessons with id {id} not found")
            raise HTTPException(status_code=404, detail="Admin_lessons not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin_lessons {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Admin_lessonsResponse, status_code=201)
async def create_admin_lessons(
    data: Admin_lessonsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin_lessons"""
    logger.debug(f"Creating new admin_lessons with data: {data}")
    
    service = Admin_lessonsService(db)
    try:
        create_data = _normalize_lesson_data(data.model_dump())
        # Ensure name is present (required by DB)
        if not create_data.get("name"):
            raise ValueError("Either 'title' or 'name' must be provided")
        result = await service.create(create_data)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create admin_lessons")
        
        logger.info(f"Admin_lessons created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating admin_lessons: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating admin_lessons: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Admin_lessonsResponse], status_code=201)
async def create_admin_lessonss_batch(
    request: Admin_lessonsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple admin_lessonss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} admin_lessonss")
    
    service = Admin_lessonsService(db)
    results = []
    
    try:
        for item_data in request.items:
            create_data = _normalize_lesson_data(item_data.model_dump())
            if not create_data.get("name"):
                raise ValueError("Either 'title' or 'name' must be provided")
            result = await service.create(create_data)
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} admin_lessonss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Admin_lessonsResponse])
async def update_admin_lessonss_batch(
    request: Admin_lessonsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple admin_lessonss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} admin_lessonss")
    
    service = Admin_lessonsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            update_dict = _normalize_lesson_data(update_dict)
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} admin_lessonss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Admin_lessonsResponse)
async def update_admin_lessons(
    id: int,
    data: Admin_lessonsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing admin_lessons"""
    logger.debug(f"Updating admin_lessons {id} with data: {data}")

    service = Admin_lessonsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        update_dict = _normalize_lesson_data(update_dict)
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Admin_lessons with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Admin_lessons not found")
        
        logger.info(f"Admin_lessons {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating admin_lessons {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating admin_lessons {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_admin_lessonss_batch(
    request: Admin_lessonsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple admin_lessonss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} admin_lessonss")
    
    service = Admin_lessonsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} admin_lessonss successfully")
        return {"message": f"Successfully deleted {deleted_count} admin_lessonss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_admin_lessons(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single admin_lessons by ID"""
    logger.debug(f"Deleting admin_lessons with id: {id}")
    
    service = Admin_lessonsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Admin_lessons with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Admin_lessons not found")
        
        logger.info(f"Admin_lessons {id} deleted successfully")
        return {"message": "Admin_lessons deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting admin_lessons {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")