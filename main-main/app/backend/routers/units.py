import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.units import UnitsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/units", tags=["units"])


# ---------- Pydantic Schemas ----------
class UnitsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    subject_id: int
    display_order: int
    description: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class UnitsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    subject_id: Optional[int] = None
    display_order: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None


class UnitsResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    subject_id: int
    display_order: int
    description: Optional[str] = None
    status: str
    country_id: Optional[int] = None
    curriculum_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UnitsListResponse(BaseModel):
    """List response schema"""
    items: List[UnitsResponse]
    total: int
    skip: int
    limit: int


class UnitsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[UnitsData]


class UnitsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: UnitsUpdateData


class UnitsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[UnitsBatchUpdateItem]


class UnitsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=UnitsListResponse)
async def query_unitss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query unitss with filtering, sorting, and pagination"""
    logger.debug(f"Querying unitss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = UnitsService(db)
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
        logger.debug(f"Found {result['total']} unitss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying unitss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=UnitsListResponse)
async def query_unitss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query unitss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying unitss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = UnitsService(db)
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
        logger.debug(f"Found {result['total']} unitss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying unitss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=UnitsResponse)
async def get_units(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single units by ID"""
    logger.debug(f"Fetching units with id: {id}, fields={fields}")
    
    service = UnitsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Units with id {id} not found")
            raise HTTPException(status_code=404, detail="Units not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching units {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=UnitsResponse, status_code=201)
async def create_units(
    data: UnitsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new units"""
    logger.debug(f"Creating new units with data: {data}")
    
    service = UnitsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create units")
        
        logger.info(f"Units created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating units: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating units: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[UnitsResponse], status_code=201)
async def create_unitss_batch(
    request: UnitsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple unitss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} unitss")
    
    service = UnitsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} unitss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[UnitsResponse])
async def update_unitss_batch(
    request: UnitsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple unitss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} unitss")
    
    service = UnitsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} unitss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=UnitsResponse)
async def update_units(
    id: int,
    data: UnitsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing units"""
    logger.debug(f"Updating units {id} with data: {data}")

    service = UnitsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Units with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Units not found")
        
        logger.info(f"Units {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating units {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating units {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_unitss_batch(
    request: UnitsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple unitss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} unitss")
    
    service = UnitsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} unitss successfully")
        return {"message": f"Successfully deleted {deleted_count} unitss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_units(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single units by ID"""
    logger.debug(f"Deleting units with id: {id}")
    
    service = UnitsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Units with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Units not found")
        
        logger.info(f"Units {id} deleted successfully")
        return {"message": "Units deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting units {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")