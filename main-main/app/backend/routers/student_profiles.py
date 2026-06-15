import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.student_profiles import Student_profilesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/student_profiles", tags=["student_profiles"])


# ---------- Pydantic Schemas ----------
class Student_profilesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    grade: int
    semester: int
    guardian_contact: str = None
    avatar_color: str = None
    status: str = None


class Student_profilesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    grade: Optional[int] = None
    semester: Optional[int] = None
    guardian_contact: Optional[str] = None
    avatar_color: Optional[str] = None
    status: Optional[str] = None


class Student_profilesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    name: str
    grade: int
    semester: int
    guardian_contact: Optional[str] = None
    avatar_color: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Student_profilesListResponse(BaseModel):
    """List response schema"""
    items: List[Student_profilesResponse]
    total: int
    skip: int
    limit: int


class Student_profilesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Student_profilesData]


class Student_profilesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Student_profilesUpdateData


class Student_profilesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Student_profilesBatchUpdateItem]


class Student_profilesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Student_profilesListResponse)
async def query_student_profiless(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query student_profiless with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying student_profiless: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Student_profilesService(db)
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
        logger.debug(f"Found {result['total']} student_profiless")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying student_profiless: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Student_profilesListResponse)
async def query_student_profiless_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query student_profiless with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying student_profiless: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Student_profilesService(db)
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
        logger.debug(f"Found {result['total']} student_profiless")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying student_profiless: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Student_profilesResponse)
async def get_student_profiles(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single student_profiles by ID (user can only see their own records)"""
    logger.debug(f"Fetching student_profiles with id: {id}, fields={fields}")
    
    service = Student_profilesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Student_profiles with id {id} not found")
            raise HTTPException(status_code=404, detail="Student_profiles not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student_profiles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Student_profilesResponse, status_code=201)
async def create_student_profiles(
    data: Student_profilesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new student_profiles"""
    logger.debug(f"Creating new student_profiles with data: {data}")
    
    service = Student_profilesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create student_profiles")
        
        logger.info(f"Student_profiles created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating student_profiles: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating student_profiles: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Student_profilesResponse], status_code=201)
async def create_student_profiless_batch(
    request: Student_profilesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple student_profiless in a single request"""
    logger.debug(f"Batch creating {len(request.items)} student_profiless")
    
    service = Student_profilesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} student_profiless successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Student_profilesResponse])
async def update_student_profiless_batch(
    request: Student_profilesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple student_profiless in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} student_profiless")
    
    service = Student_profilesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} student_profiless successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Student_profilesResponse)
async def update_student_profiles(
    id: int,
    data: Student_profilesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing student_profiles (requires ownership)"""
    logger.debug(f"Updating student_profiles {id} with data: {data}")

    service = Student_profilesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Student_profiles with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Student_profiles not found")
        
        logger.info(f"Student_profiles {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating student_profiles {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating student_profiles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_student_profiless_batch(
    request: Student_profilesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple student_profiless by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} student_profiless")
    
    service = Student_profilesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} student_profiless successfully")
        return {"message": f"Successfully deleted {deleted_count} student_profiless", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_student_profiles(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single student_profiles by ID (requires ownership)"""
    logger.debug(f"Deleting student_profiles with id: {id}")
    
    service = Student_profilesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Student_profiles with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Student_profiles not found")
        
        logger.info(f"Student_profiles {id} deleted successfully")
        return {"message": "Student_profiles deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student_profiles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")