import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.semesters import SemestersService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/semesters", tags=["semesters"])


# ---------- Pydantic Schemas ----------
class SemestersData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    grade_id: Optional[int] = None
    academic_year: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class SemestersUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    grade_id: Optional[int] = None
    academic_year: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class SemestersResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    grade_id: Optional[int] = None
    academic_year: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SemestersListResponse(BaseModel):
    """List response schema"""
    items: List[SemestersResponse]
    total: int
    skip: int
    limit: int


class SemestersBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[SemestersData]


class SemestersBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: SemestersUpdateData


class SemestersBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[SemestersBatchUpdateItem]


class SemestersBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=SemestersListResponse)
async def query_semesterss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query semesterss with filtering, sorting, and pagination"""
    logger.debug(f"Querying semesterss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = SemestersService(db)
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
        logger.debug(f"Found {result['total']} semesterss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying semesterss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=SemestersListResponse)
async def query_semesterss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query semesterss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying semesterss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = SemestersService(db)
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
        logger.debug(f"Found {result['total']} semesterss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying semesterss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=SemestersResponse)
async def get_semesters(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single semesters by ID"""
    logger.debug(f"Fetching semesters with id: {id}, fields={fields}")
    
    service = SemestersService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Semesters with id {id} not found")
            raise HTTPException(status_code=404, detail="Semesters not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching semesters {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=SemestersResponse, status_code=201)
async def create_semesters(
    data: SemestersData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new semesters"""
    logger.debug(f"Creating new semesters with data: {data}")
    
    service = SemestersService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create semesters")
        
        logger.info(f"Semesters created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating semesters: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating semesters: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[SemestersResponse], status_code=201)
async def create_semesterss_batch(
    request: SemestersBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple semesterss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} semesterss")
    
    service = SemestersService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} semesterss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[SemestersResponse])
async def update_semesterss_batch(
    request: SemestersBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple semesterss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} semesterss")
    
    service = SemestersService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} semesterss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=SemestersResponse)
async def update_semesters(
    id: int,
    data: SemestersUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing semesters"""
    logger.debug(f"Updating semesters {id} with data: {data}")

    service = SemestersService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Semesters with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Semesters not found")
        
        logger.info(f"Semesters {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating semesters {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating semesters {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_semesterss_batch(
    request: SemestersBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple semesterss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} semesterss")
    
    service = SemestersService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} semesterss successfully")
        return {"message": f"Successfully deleted {deleted_count} semesterss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_semesters(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single semesters by ID"""
    logger.debug(f"Deleting semesters with id: {id}")
    
    service = SemestersService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Semesters with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Semesters not found")
        
        logger.info(f"Semesters {id} deleted successfully")
        return {"message": "Semesters deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting semesters {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")