import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.weakness_records import Weakness_recordsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/weakness_records", tags=["weakness_records"])


# ---------- Pydantic Schemas ----------
class Weakness_recordsData(BaseModel):
    """Entity data schema (for create/update)"""
    skill: str
    subject_id: int = None
    error_count: int
    resolved: bool = None


class Weakness_recordsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    skill: Optional[str] = None
    subject_id: Optional[int] = None
    error_count: Optional[int] = None
    resolved: Optional[bool] = None


class Weakness_recordsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    skill: str
    subject_id: Optional[int] = None
    error_count: int
    resolved: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Weakness_recordsListResponse(BaseModel):
    """List response schema"""
    items: List[Weakness_recordsResponse]
    total: int
    skip: int
    limit: int


class Weakness_recordsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Weakness_recordsData]


class Weakness_recordsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Weakness_recordsUpdateData


class Weakness_recordsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Weakness_recordsBatchUpdateItem]


class Weakness_recordsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Weakness_recordsListResponse)
async def query_weakness_recordss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query weakness_recordss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying weakness_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Weakness_recordsService(db)
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
        logger.debug(f"Found {result['total']} weakness_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying weakness_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Weakness_recordsListResponse)
async def query_weakness_recordss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query weakness_recordss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying weakness_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Weakness_recordsService(db)
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
        logger.debug(f"Found {result['total']} weakness_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying weakness_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Weakness_recordsResponse)
async def get_weakness_records(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single weakness_records by ID (user can only see their own records)"""
    logger.debug(f"Fetching weakness_records with id: {id}, fields={fields}")
    
    service = Weakness_recordsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Weakness_records with id {id} not found")
            raise HTTPException(status_code=404, detail="Weakness_records not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching weakness_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Weakness_recordsResponse, status_code=201)
async def create_weakness_records(
    data: Weakness_recordsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new weakness_records"""
    logger.debug(f"Creating new weakness_records with data: {data}")
    
    service = Weakness_recordsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create weakness_records")
        
        logger.info(f"Weakness_records created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating weakness_records: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating weakness_records: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Weakness_recordsResponse], status_code=201)
async def create_weakness_recordss_batch(
    request: Weakness_recordsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple weakness_recordss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} weakness_recordss")
    
    service = Weakness_recordsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} weakness_recordss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Weakness_recordsResponse])
async def update_weakness_recordss_batch(
    request: Weakness_recordsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple weakness_recordss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} weakness_recordss")
    
    service = Weakness_recordsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} weakness_recordss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Weakness_recordsResponse)
async def update_weakness_records(
    id: int,
    data: Weakness_recordsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing weakness_records (requires ownership)"""
    logger.debug(f"Updating weakness_records {id} with data: {data}")

    service = Weakness_recordsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Weakness_records with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Weakness_records not found")
        
        logger.info(f"Weakness_records {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating weakness_records {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating weakness_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_weakness_recordss_batch(
    request: Weakness_recordsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple weakness_recordss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} weakness_recordss")
    
    service = Weakness_recordsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} weakness_recordss successfully")
        return {"message": f"Successfully deleted {deleted_count} weakness_recordss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_weakness_records(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single weakness_records by ID (requires ownership)"""
    logger.debug(f"Deleting weakness_records with id: {id}")
    
    service = Weakness_recordsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Weakness_records with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Weakness_records not found")
        
        logger.info(f"Weakness_records {id} deleted successfully")
        return {"message": "Weakness_records deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting weakness_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")