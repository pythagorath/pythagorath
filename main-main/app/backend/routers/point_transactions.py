import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.point_transactions import Point_transactionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/point_transactions", tags=["point_transactions"])


# ---------- Pydantic Schemas ----------
class Point_transactionsData(BaseModel):
    """Entity data schema (for create/update)"""
    points: int
    reason: str
    reference_id: int = None


class Point_transactionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    points: Optional[int] = None
    reason: Optional[str] = None
    reference_id: Optional[int] = None


class Point_transactionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    points: int
    reason: str
    reference_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Point_transactionsListResponse(BaseModel):
    """List response schema"""
    items: List[Point_transactionsResponse]
    total: int
    skip: int
    limit: int


class Point_transactionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Point_transactionsData]


class Point_transactionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Point_transactionsUpdateData


class Point_transactionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Point_transactionsBatchUpdateItem]


class Point_transactionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Point_transactionsListResponse)
async def query_point_transactionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query point_transactionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying point_transactionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Point_transactionsService(db)
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
        logger.debug(f"Found {result['total']} point_transactionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying point_transactionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Point_transactionsListResponse)
async def query_point_transactionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query point_transactionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying point_transactionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Point_transactionsService(db)
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
        logger.debug(f"Found {result['total']} point_transactionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying point_transactionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Point_transactionsResponse)
async def get_point_transactions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single point_transactions by ID (user can only see their own records)"""
    logger.debug(f"Fetching point_transactions with id: {id}, fields={fields}")
    
    service = Point_transactionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Point_transactions with id {id} not found")
            raise HTTPException(status_code=404, detail="Point_transactions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching point_transactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Point_transactionsResponse, status_code=201)
async def create_point_transactions(
    data: Point_transactionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new point_transactions"""
    logger.debug(f"Creating new point_transactions with data: {data}")
    
    service = Point_transactionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create point_transactions")
        
        logger.info(f"Point_transactions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating point_transactions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating point_transactions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Point_transactionsResponse], status_code=201)
async def create_point_transactionss_batch(
    request: Point_transactionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple point_transactionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} point_transactionss")
    
    service = Point_transactionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} point_transactionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Point_transactionsResponse])
async def update_point_transactionss_batch(
    request: Point_transactionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple point_transactionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} point_transactionss")
    
    service = Point_transactionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} point_transactionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Point_transactionsResponse)
async def update_point_transactions(
    id: int,
    data: Point_transactionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing point_transactions (requires ownership)"""
    logger.debug(f"Updating point_transactions {id} with data: {data}")

    service = Point_transactionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Point_transactions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Point_transactions not found")
        
        logger.info(f"Point_transactions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating point_transactions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating point_transactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_point_transactionss_batch(
    request: Point_transactionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple point_transactionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} point_transactionss")
    
    service = Point_transactionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} point_transactionss successfully")
        return {"message": f"Successfully deleted {deleted_count} point_transactionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_point_transactions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single point_transactions by ID (requires ownership)"""
    logger.debug(f"Deleting point_transactions with id: {id}")
    
    service = Point_transactionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Point_transactions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Point_transactions not found")
        
        logger.info(f"Point_transactions {id} deleted successfully")
        return {"message": "Point_transactions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting point_transactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")