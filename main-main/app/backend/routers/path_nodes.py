import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.path_nodes import Path_nodesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/path_nodes", tags=["path_nodes"])


# ---------- Pydantic Schemas ----------
class Path_nodesData(BaseModel):
    """Entity data schema (for create/update)"""
    learning_path_id: int
    node_type: str
    title: str
    order_index: int
    parent_node_id: Optional[int] = None
    content_config: Optional[str] = None
    duration_minutes: Optional[int] = None


class Path_nodesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    learning_path_id: Optional[int] = None
    node_type: Optional[str] = None
    title: Optional[str] = None
    order_index: Optional[int] = None
    parent_node_id: Optional[int] = None
    content_config: Optional[str] = None
    duration_minutes: Optional[int] = None


class Path_nodesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: Optional[str] = None
    learning_path_id: int
    node_type: str
    title: str
    order_index: int
    parent_node_id: Optional[int] = None
    content_config: Optional[str] = None
    duration_minutes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Path_nodesListResponse(BaseModel):
    """List response schema"""
    items: List[Path_nodesResponse]
    total: int
    skip: int
    limit: int


class Path_nodesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Path_nodesData]


class Path_nodesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Path_nodesUpdateData


class Path_nodesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Path_nodesBatchUpdateItem]


class Path_nodesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Path_nodesListResponse)
async def query_path_nodess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query path_nodess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying path_nodess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Path_nodesService(db)
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
        logger.debug(f"Found {result['total']} path_nodess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying path_nodess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Path_nodesListResponse)
async def query_path_nodess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query path_nodess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying path_nodess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Path_nodesService(db)
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
        logger.debug(f"Found {result['total']} path_nodess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying path_nodess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Path_nodesResponse)
async def get_path_nodes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single path_nodes by ID (user can only see their own records)"""
    logger.debug(f"Fetching path_nodes with id: {id}, fields={fields}")
    
    service = Path_nodesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Path_nodes with id {id} not found")
            raise HTTPException(status_code=404, detail="Path_nodes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching path_nodes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Path_nodesResponse, status_code=201)
async def create_path_nodes(
    data: Path_nodesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new path_nodes"""
    logger.debug(f"Creating new path_nodes with data: {data}")
    
    service = Path_nodesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create path_nodes")
        
        logger.info(f"Path_nodes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating path_nodes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating path_nodes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Path_nodesResponse], status_code=201)
async def create_path_nodess_batch(
    request: Path_nodesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple path_nodess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} path_nodess")
    
    service = Path_nodesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} path_nodess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Path_nodesResponse])
async def update_path_nodess_batch(
    request: Path_nodesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple path_nodess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} path_nodess")
    
    service = Path_nodesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} path_nodess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Path_nodesResponse)
async def update_path_nodes(
    id: int,
    data: Path_nodesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing path_nodes (requires ownership)"""
    logger.debug(f"Updating path_nodes {id} with data: {data}")

    service = Path_nodesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Path_nodes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Path_nodes not found")
        
        logger.info(f"Path_nodes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating path_nodes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating path_nodes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_path_nodess_batch(
    request: Path_nodesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple path_nodess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} path_nodess")
    
    service = Path_nodesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} path_nodess successfully")
        return {"message": f"Successfully deleted {deleted_count} path_nodess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_path_nodes(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single path_nodes by ID (requires ownership)"""
    logger.debug(f"Deleting path_nodes with id: {id}")
    
    service = Path_nodesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Path_nodes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Path_nodes not found")
        
        logger.info(f"Path_nodes {id} deleted successfully")
        return {"message": "Path_nodes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting path_nodes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")