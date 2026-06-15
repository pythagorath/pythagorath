import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.admin_subjects import Admin_subjectsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/admin_subjects", tags=["admin_subjects"])


# ---------- Pydantic Schemas ----------
class Admin_subjectsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    grade_id: int = None
    semester_id: int = None
    slug: str = None
    description: str = None
    status: str = None
    country_id: int = None
    curriculum_id: int = None


class Admin_subjectsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    grade_id: Optional[int] = None
    semester_id: Optional[int] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class Admin_subjectsResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    grade_id: Optional[int] = None
    semester_id: Optional[int] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Admin_subjectsListResponse(BaseModel):
    """List response schema"""
    items: List[Admin_subjectsResponse]
    total: int
    skip: int
    limit: int


class Admin_subjectsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Admin_subjectsData]


class Admin_subjectsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Admin_subjectsUpdateData


class Admin_subjectsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Admin_subjectsBatchUpdateItem]


class Admin_subjectsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Admin_subjectsListResponse)
async def query_admin_subjectss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query admin_subjectss with filtering, sorting, and pagination"""
    logger.debug(f"Querying admin_subjectss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Admin_subjectsService(db)
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
        logger.debug(f"Found {result['total']} admin_subjectss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying admin_subjectss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Admin_subjectsListResponse)
async def query_admin_subjectss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query admin_subjectss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying admin_subjectss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Admin_subjectsService(db)
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
        logger.debug(f"Found {result['total']} admin_subjectss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying admin_subjectss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Admin_subjectsResponse)
async def get_admin_subjects(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single admin_subjects by ID"""
    logger.debug(f"Fetching admin_subjects with id: {id}, fields={fields}")
    
    service = Admin_subjectsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Admin_subjects with id {id} not found")
            raise HTTPException(status_code=404, detail="Admin_subjects not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin_subjects {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Admin_subjectsResponse, status_code=201)
async def create_admin_subjects(
    data: Admin_subjectsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin_subjects"""
    logger.debug(f"Creating new admin_subjects with data: {data}")
    
    service = Admin_subjectsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create admin_subjects")
        
        logger.info(f"Admin_subjects created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating admin_subjects: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating admin_subjects: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Admin_subjectsResponse], status_code=201)
async def create_admin_subjectss_batch(
    request: Admin_subjectsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple admin_subjectss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} admin_subjectss")
    
    service = Admin_subjectsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} admin_subjectss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Admin_subjectsResponse])
async def update_admin_subjectss_batch(
    request: Admin_subjectsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple admin_subjectss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} admin_subjectss")
    
    service = Admin_subjectsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} admin_subjectss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Admin_subjectsResponse)
async def update_admin_subjects(
    id: int,
    data: Admin_subjectsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing admin_subjects"""
    logger.debug(f"Updating admin_subjects {id} with data: {data}")

    service = Admin_subjectsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Admin_subjects with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Admin_subjects not found")
        
        logger.info(f"Admin_subjects {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating admin_subjects {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating admin_subjects {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_admin_subjectss_batch(
    request: Admin_subjectsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple admin_subjectss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} admin_subjectss")
    
    service = Admin_subjectsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} admin_subjectss successfully")
        return {"message": f"Successfully deleted {deleted_count} admin_subjectss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_admin_subjects(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single admin_subjects by ID"""
    logger.debug(f"Deleting admin_subjects with id: {id}")
    
    service = Admin_subjectsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Admin_subjects with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Admin_subjects not found")
        
        logger.info(f"Admin_subjects {id} deleted successfully")
        return {"message": "Admin_subjects deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting admin_subjects {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")