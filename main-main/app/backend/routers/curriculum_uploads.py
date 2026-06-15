import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.curriculum_uploads import Curriculum_uploadsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/curriculum_uploads", tags=["curriculum_uploads"])


# ---------- Pydantic Schemas ----------
class Curriculum_uploadsData(BaseModel):
    """Entity data schema (for create/update)"""
    grade_number: int
    subject_name: str
    semester: int
    title: str
    status: str


class Curriculum_uploadsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    grade_number: Optional[int] = None
    subject_name: Optional[str] = None
    semester: Optional[int] = None
    title: Optional[str] = None
    status: Optional[str] = None


class Curriculum_uploadsResponse(BaseModel):
    """Entity response schema"""
    id: int
    grade_number: int
    subject_name: str
    semester: int
    title: str
    status: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Curriculum_uploadsListResponse(BaseModel):
    """List response schema"""
    items: List[Curriculum_uploadsResponse]
    total: int
    skip: int
    limit: int


class Curriculum_uploadsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Curriculum_uploadsData]


class Curriculum_uploadsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Curriculum_uploadsUpdateData


class Curriculum_uploadsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Curriculum_uploadsBatchUpdateItem]


class Curriculum_uploadsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Curriculum_uploadsListResponse)
async def query_curriculum_uploadss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query curriculum_uploadss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying curriculum_uploadss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Curriculum_uploadsService(db)
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
        logger.debug(f"Found {result['total']} curriculum_uploadss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying curriculum_uploadss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Curriculum_uploadsListResponse)
async def query_curriculum_uploadss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query curriculum_uploadss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying curriculum_uploadss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Curriculum_uploadsService(db)
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
        logger.debug(f"Found {result['total']} curriculum_uploadss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying curriculum_uploadss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Curriculum_uploadsResponse)
async def get_curriculum_uploads(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single curriculum_uploads by ID (user can only see their own records)"""
    logger.debug(f"Fetching curriculum_uploads with id: {id}, fields={fields}")
    
    service = Curriculum_uploadsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Curriculum_uploads with id {id} not found")
            raise HTTPException(status_code=404, detail="Curriculum_uploads not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching curriculum_uploads {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Curriculum_uploadsResponse, status_code=201)
async def create_curriculum_uploads(
    data: Curriculum_uploadsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new curriculum_uploads"""
    logger.debug(f"Creating new curriculum_uploads with data: {data}")
    
    service = Curriculum_uploadsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create curriculum_uploads")
        
        logger.info(f"Curriculum_uploads created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating curriculum_uploads: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating curriculum_uploads: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Curriculum_uploadsResponse], status_code=201)
async def create_curriculum_uploadss_batch(
    request: Curriculum_uploadsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple curriculum_uploadss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} curriculum_uploadss")
    
    service = Curriculum_uploadsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} curriculum_uploadss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Curriculum_uploadsResponse])
async def update_curriculum_uploadss_batch(
    request: Curriculum_uploadsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple curriculum_uploadss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} curriculum_uploadss")
    
    service = Curriculum_uploadsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} curriculum_uploadss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Curriculum_uploadsResponse)
async def update_curriculum_uploads(
    id: int,
    data: Curriculum_uploadsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing curriculum_uploads (requires ownership)"""
    logger.debug(f"Updating curriculum_uploads {id} with data: {data}")

    service = Curriculum_uploadsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Curriculum_uploads with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Curriculum_uploads not found")
        
        logger.info(f"Curriculum_uploads {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating curriculum_uploads {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating curriculum_uploads {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_curriculum_uploadss_batch(
    request: Curriculum_uploadsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple curriculum_uploadss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} curriculum_uploadss")
    
    service = Curriculum_uploadsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} curriculum_uploadss successfully")
        return {"message": f"Successfully deleted {deleted_count} curriculum_uploadss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_curriculum_uploads(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single curriculum_uploads by ID (requires ownership)"""
    logger.debug(f"Deleting curriculum_uploads with id: {id}")
    
    service = Curriculum_uploadsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Curriculum_uploads with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Curriculum_uploads not found")
        
        logger.info(f"Curriculum_uploads {id} deleted successfully")
        return {"message": "Curriculum_uploads deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting curriculum_uploads {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")