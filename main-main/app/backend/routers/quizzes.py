import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.quizzes import QuizzesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/quizzes", tags=["quizzes"])


# ---------- Pydantic Schemas ----------
class QuizzesData(BaseModel):
    """Entity data schema (for create/update)"""
    title: str
    lesson_id: int
    subject_id: int
    grade: str
    difficulty: str = None


class QuizzesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    title: Optional[str] = None
    lesson_id: Optional[int] = None
    subject_id: Optional[int] = None
    grade: Optional[str] = None
    difficulty: Optional[str] = None


class QuizzesResponse(BaseModel):
    """Entity response schema"""
    id: int
    title: str
    lesson_id: int
    subject_id: int
    grade: str
    difficulty: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuizzesListResponse(BaseModel):
    """List response schema"""
    items: List[QuizzesResponse]
    total: int
    skip: int
    limit: int


class QuizzesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[QuizzesData]


class QuizzesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: QuizzesUpdateData


class QuizzesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[QuizzesBatchUpdateItem]


class QuizzesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=QuizzesListResponse)
async def query_quizzess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query quizzess with filtering, sorting, and pagination"""
    logger.debug(f"Querying quizzess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = QuizzesService(db)
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
        logger.debug(f"Found {result['total']} quizzess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying quizzess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=QuizzesListResponse)
async def query_quizzess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query quizzess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying quizzess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = QuizzesService(db)
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
        logger.debug(f"Found {result['total']} quizzess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying quizzess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=QuizzesResponse)
async def get_quizzes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single quizzes by ID"""
    logger.debug(f"Fetching quizzes with id: {id}, fields={fields}")
    
    service = QuizzesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Quizzes with id {id} not found")
            raise HTTPException(status_code=404, detail="Quizzes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quizzes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=QuizzesResponse, status_code=201)
async def create_quizzes(
    data: QuizzesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new quizzes"""
    logger.debug(f"Creating new quizzes with data: {data}")
    
    service = QuizzesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create quizzes")
        
        logger.info(f"Quizzes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating quizzes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating quizzes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[QuizzesResponse], status_code=201)
async def create_quizzess_batch(
    request: QuizzesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple quizzess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} quizzess")
    
    service = QuizzesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} quizzess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[QuizzesResponse])
async def update_quizzess_batch(
    request: QuizzesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple quizzess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} quizzess")
    
    service = QuizzesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} quizzess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=QuizzesResponse)
async def update_quizzes(
    id: int,
    data: QuizzesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing quizzes"""
    logger.debug(f"Updating quizzes {id} with data: {data}")

    service = QuizzesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Quizzes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Quizzes not found")
        
        logger.info(f"Quizzes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating quizzes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating quizzes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_quizzess_batch(
    request: QuizzesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple quizzess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} quizzess")
    
    service = QuizzesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} quizzess successfully")
        return {"message": f"Successfully deleted {deleted_count} quizzess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_quizzes(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single quizzes by ID"""
    logger.debug(f"Deleting quizzes with id: {id}")
    
    service = QuizzesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Quizzes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Quizzes not found")
        
        logger.info(f"Quizzes {id} deleted successfully")
        return {"message": "Quizzes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quizzes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")