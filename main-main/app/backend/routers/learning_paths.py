import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.learning_paths import Learning_pathsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/learning_paths", tags=["learning_paths"])


# ---------- Pydantic Schemas ----------
class Learning_pathsData(BaseModel):
    """Entity data schema (for create/update)"""
    curriculum_upload_id: Optional[int] = None
    title: str
    grade_number: int
    subject_name: str
    semester: int
    status: str
    total_nodes: Optional[int] = None


class Learning_pathsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    curriculum_upload_id: Optional[int] = None
    title: Optional[str] = None
    grade_number: Optional[int] = None
    subject_name: Optional[str] = None
    semester: Optional[int] = None
    status: Optional[str] = None
    total_nodes: Optional[int] = None


class Learning_pathsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: Optional[str] = None
    curriculum_upload_id: Optional[int] = None
    title: str
    grade_number: int
    subject_name: str
    semester: int
    status: str
    total_nodes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Learning_pathsListResponse(BaseModel):
    """List response schema"""
    items: List[Learning_pathsResponse]
    total: int
    skip: int
    limit: int


class Learning_pathsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Learning_pathsData]


class Learning_pathsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Learning_pathsUpdateData


class Learning_pathsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Learning_pathsBatchUpdateItem]


class Learning_pathsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Learning_pathsListResponse)
async def query_learning_pathss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query learning_pathss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying learning_pathss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Learning_pathsService(db)
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
        logger.debug(f"Found {result['total']} learning_pathss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying learning_pathss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Learning_pathsListResponse)
async def query_learning_pathss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query learning_pathss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying learning_pathss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Learning_pathsService(db)
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
        logger.debug(f"Found {result['total']} learning_pathss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying learning_pathss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Learning_pathsResponse)
async def get_learning_paths(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single learning_paths by ID (user can only see their own records)"""
    logger.debug(f"Fetching learning_paths with id: {id}, fields={fields}")
    
    service = Learning_pathsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Learning_paths with id {id} not found")
            raise HTTPException(status_code=404, detail="Learning_paths not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching learning_paths {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Learning_pathsResponse, status_code=201)
async def create_learning_paths(
    data: Learning_pathsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new learning_paths"""
    logger.debug(f"Creating new learning_paths with data: {data}")
    
    service = Learning_pathsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create learning_paths")
        
        logger.info(f"Learning_paths created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating learning_paths: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating learning_paths: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Learning_pathsResponse], status_code=201)
async def create_learning_pathss_batch(
    request: Learning_pathsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple learning_pathss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} learning_pathss")
    
    service = Learning_pathsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} learning_pathss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Learning_pathsResponse])
async def update_learning_pathss_batch(
    request: Learning_pathsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple learning_pathss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} learning_pathss")
    
    service = Learning_pathsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} learning_pathss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Learning_pathsResponse)
async def update_learning_paths(
    id: int,
    data: Learning_pathsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing learning_paths (requires ownership)"""
    logger.debug(f"Updating learning_paths {id} with data: {data}")

    service = Learning_pathsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Learning_paths with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Learning_paths not found")
        
        logger.info(f"Learning_paths {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating learning_paths {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating learning_paths {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_learning_pathss_batch(
    request: Learning_pathsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple learning_pathss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} learning_pathss")
    
    service = Learning_pathsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} learning_pathss successfully")
        return {"message": f"Successfully deleted {deleted_count} learning_pathss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_learning_paths(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single learning_paths by ID (requires ownership)"""
    logger.debug(f"Deleting learning_paths with id: {id}")
    
    service = Learning_pathsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Learning_paths with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Learning_paths not found")
        
        logger.info(f"Learning_paths {id} deleted successfully")
        return {"message": "Learning_paths deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting learning_paths {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")