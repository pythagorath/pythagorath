import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.admin_skills import Admin_skillsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/admin_skills", tags=["admin_skills"])


# ---------- Pydantic Schemas ----------
class Admin_skillsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    grade_id: int = None
    semester_id: int = None
    subject_id: int = None
    unit_id: int = None
    lesson_id: int = None
    domain: str = None
    difficulty: str = None
    prerequisites: str = None
    mastery_threshold: int = None
    retention_schedule: str = None
    remediation_skill_id: int = None
    status: str = "published"
    country_id: int = None
    curriculum_id: int = None


class Admin_skillsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    grade_id: Optional[int] = None
    semester_id: Optional[int] = None
    subject_id: Optional[int] = None
    unit_id: Optional[int] = None
    lesson_id: Optional[int] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    prerequisites: Optional[str] = None
    mastery_threshold: Optional[int] = None
    retention_schedule: Optional[str] = None
    remediation_skill_id: Optional[int] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class Admin_skillsResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: Optional[str] = None
    grade_id: Optional[int] = None
    semester_id: Optional[int] = None
    subject_id: Optional[int] = None
    unit_id: Optional[int] = None
    lesson_id: Optional[int] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    prerequisites: Optional[str] = None
    mastery_threshold: Optional[int] = None
    retention_schedule: Optional[str] = None
    remediation_skill_id: Optional[int] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Admin_skillsListResponse(BaseModel):
    """List response schema"""
    items: List[Admin_skillsResponse]
    total: int
    skip: int
    limit: int


class Admin_skillsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Admin_skillsData]


class Admin_skillsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Admin_skillsUpdateData


class Admin_skillsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Admin_skillsBatchUpdateItem]


class Admin_skillsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Admin_skillsListResponse)
async def query_admin_skillss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query admin_skillss with filtering, sorting, and pagination"""
    logger.debug(f"Querying admin_skillss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Admin_skillsService(db)
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
        logger.debug(f"Found {result['total']} admin_skillss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying admin_skillss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Admin_skillsListResponse)
async def query_admin_skillss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query admin_skillss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying admin_skillss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Admin_skillsService(db)
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
        logger.debug(f"Found {result['total']} admin_skillss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying admin_skillss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Admin_skillsResponse)
async def get_admin_skills(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single admin_skills by ID"""
    logger.debug(f"Fetching admin_skills with id: {id}, fields={fields}")
    
    service = Admin_skillsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Admin_skills with id {id} not found")
            raise HTTPException(status_code=404, detail="Admin_skills not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin_skills {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Admin_skillsResponse, status_code=201)
async def create_admin_skills(
    data: Admin_skillsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin_skills"""
    logger.debug(f"Creating new admin_skills with data: {data}")
    
    service = Admin_skillsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create admin_skills")
        
        logger.info(f"Admin_skills created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating admin_skills: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating admin_skills: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Admin_skillsResponse], status_code=201)
async def create_admin_skillss_batch(
    request: Admin_skillsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple admin_skillss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} admin_skillss")
    
    service = Admin_skillsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} admin_skillss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Admin_skillsResponse])
async def update_admin_skillss_batch(
    request: Admin_skillsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple admin_skillss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} admin_skillss")
    
    service = Admin_skillsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} admin_skillss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Admin_skillsResponse)
async def update_admin_skills(
    id: int,
    data: Admin_skillsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing admin_skills"""
    logger.debug(f"Updating admin_skills {id} with data: {data}")

    service = Admin_skillsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Admin_skills with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Admin_skills not found")
        
        logger.info(f"Admin_skills {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating admin_skills {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating admin_skills {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_admin_skillss_batch(
    request: Admin_skillsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple admin_skillss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} admin_skillss")
    
    service = Admin_skillsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} admin_skillss successfully")
        return {"message": f"Successfully deleted {deleted_count} admin_skillss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_admin_skills(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single admin_skills by ID"""
    logger.debug(f"Deleting admin_skills with id: {id}")
    
    service = Admin_skillsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Admin_skills with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Admin_skills not found")
        
        logger.info(f"Admin_skills {id} deleted successfully")
        return {"message": "Admin_skills deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting admin_skills {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")