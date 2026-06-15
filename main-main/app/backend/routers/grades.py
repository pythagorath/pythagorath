import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.grades import GradesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/grades", tags=["grades"])


# ---------- Pydantic Schemas ----------
class GradesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    grade_number: Optional[int] = None
    stage: Optional[str] = None
    curriculum_id: Optional[int] = None
    country_id: Optional[int] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class GradesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    grade_number: Optional[int] = None
    stage: Optional[str] = None
    curriculum_id: Optional[int] = None
    country_id: Optional[int] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class GradesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    grade_number: Optional[int] = None
    stage: Optional[str] = None
    curriculum_id: Optional[int] = None
    country_id: Optional[int] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GradesListResponse(BaseModel):
    """List response schema"""
    items: List[GradesResponse]
    total: int
    skip: int
    limit: int


class GradesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[GradesData]


class GradesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: GradesUpdateData


class GradesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[GradesBatchUpdateItem]


class GradesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=GradesListResponse)
async def query_gradess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query gradess with filtering, sorting, and pagination"""
    logger.debug(f"Querying gradess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = GradesService(db)
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
        logger.debug(f"Found {result['total']} gradess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying gradess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=GradesListResponse)
async def query_gradess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query gradess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying gradess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = GradesService(db)
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
        logger.debug(f"Found {result['total']} gradess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying gradess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=GradesResponse)
async def get_grades(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single grades by ID"""
    logger.debug(f"Fetching grades with id: {id}, fields={fields}")
    
    service = GradesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Grades with id {id} not found")
            raise HTTPException(status_code=404, detail="Grades not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching grades {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=GradesResponse, status_code=201)
async def create_grades(
    data: GradesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new grades"""
    logger.debug(f"Creating new grades with data: {data}")
    
    service = GradesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create grades")
        
        logger.info(f"Grades created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating grades: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating grades: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[GradesResponse], status_code=201)
async def create_gradess_batch(
    request: GradesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple gradess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} gradess")
    
    service = GradesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} gradess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[GradesResponse])
async def update_gradess_batch(
    request: GradesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple gradess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} gradess")
    
    service = GradesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} gradess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=GradesResponse)
async def update_grades(
    id: int,
    data: GradesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing grades"""
    logger.debug(f"Updating grades {id} with data: {data}")

    service = GradesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Grades with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Grades not found")
        
        logger.info(f"Grades {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating grades {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating grades {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_gradess_batch(
    request: GradesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple gradess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} gradess")
    
    service = GradesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} gradess successfully")
        return {"message": f"Successfully deleted {deleted_count} gradess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_grades(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single grades by ID"""
    logger.debug(f"Deleting grades with id: {id}")
    
    service = GradesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Grades with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Grades not found")
        
        logger.info(f"Grades {id} deleted successfully")
        return {"message": "Grades deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting grades {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")