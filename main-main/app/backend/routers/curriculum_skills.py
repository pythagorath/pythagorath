import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.curriculum_skills import Curriculum_skillsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/curriculum_skills", tags=["curriculum_skills"])


# ---------- Pydantic Schemas ----------
class Curriculum_skillsData(BaseModel):
    """Entity data schema (for create/update)"""
    lesson_id: int
    name: str
    skill_type: str
    difficulty_level: int = None


class Curriculum_skillsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    lesson_id: Optional[int] = None
    name: Optional[str] = None
    skill_type: Optional[str] = None
    difficulty_level: Optional[int] = None


class Curriculum_skillsResponse(BaseModel):
    """Entity response schema"""
    id: int
    lesson_id: int
    name: str
    skill_type: str
    difficulty_level: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Curriculum_skillsListResponse(BaseModel):
    """List response schema"""
    items: List[Curriculum_skillsResponse]
    total: int
    skip: int
    limit: int


class Curriculum_skillsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Curriculum_skillsData]


class Curriculum_skillsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Curriculum_skillsUpdateData


class Curriculum_skillsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Curriculum_skillsBatchUpdateItem]


class Curriculum_skillsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Curriculum_skillsListResponse)
async def query_curriculum_skillss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query curriculum_skillss with filtering, sorting, and pagination"""
    logger.debug(f"Querying curriculum_skillss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Curriculum_skillsService(db)
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
        logger.debug(f"Found {result['total']} curriculum_skillss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying curriculum_skillss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Curriculum_skillsListResponse)
async def query_curriculum_skillss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query curriculum_skillss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying curriculum_skillss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Curriculum_skillsService(db)
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
        logger.debug(f"Found {result['total']} curriculum_skillss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying curriculum_skillss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Curriculum_skillsResponse)
async def get_curriculum_skills(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single curriculum_skills by ID"""
    logger.debug(f"Fetching curriculum_skills with id: {id}, fields={fields}")
    
    service = Curriculum_skillsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Curriculum_skills with id {id} not found")
            raise HTTPException(status_code=404, detail="Curriculum_skills not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching curriculum_skills {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Curriculum_skillsResponse, status_code=201)
async def create_curriculum_skills(
    data: Curriculum_skillsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new curriculum_skills"""
    logger.debug(f"Creating new curriculum_skills with data: {data}")
    
    service = Curriculum_skillsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create curriculum_skills")
        
        logger.info(f"Curriculum_skills created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating curriculum_skills: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating curriculum_skills: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Curriculum_skillsResponse], status_code=201)
async def create_curriculum_skillss_batch(
    request: Curriculum_skillsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple curriculum_skillss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} curriculum_skillss")
    
    service = Curriculum_skillsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} curriculum_skillss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Curriculum_skillsResponse])
async def update_curriculum_skillss_batch(
    request: Curriculum_skillsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple curriculum_skillss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} curriculum_skillss")
    
    service = Curriculum_skillsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} curriculum_skillss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Curriculum_skillsResponse)
async def update_curriculum_skills(
    id: int,
    data: Curriculum_skillsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing curriculum_skills"""
    logger.debug(f"Updating curriculum_skills {id} with data: {data}")

    service = Curriculum_skillsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Curriculum_skills with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Curriculum_skills not found")
        
        logger.info(f"Curriculum_skills {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating curriculum_skills {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating curriculum_skills {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_curriculum_skillss_batch(
    request: Curriculum_skillsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple curriculum_skillss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} curriculum_skillss")
    
    service = Curriculum_skillsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} curriculum_skillss successfully")
        return {"message": f"Successfully deleted {deleted_count} curriculum_skillss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_curriculum_skills(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single curriculum_skills by ID"""
    logger.debug(f"Deleting curriculum_skills with id: {id}")
    
    service = Curriculum_skillsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Curriculum_skills with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Curriculum_skills not found")
        
        logger.info(f"Curriculum_skills {id} deleted successfully")
        return {"message": "Curriculum_skills deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting curriculum_skills {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")