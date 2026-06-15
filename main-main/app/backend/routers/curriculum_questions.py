import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.curriculum_questions import Curriculum_questionsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/curriculum_questions", tags=["curriculum_questions"])


# ---------- Pydantic Schemas ----------
class Curriculum_questionsData(BaseModel):
    """Entity data schema (for create/update)"""
    skill_id: int
    question_text: str
    question_type: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    misconception_tag: Optional[str] = None
    retention_tag: Optional[str] = None
    visual_asset_url: Optional[str] = None
    has_visual: Optional[bool] = None
    review_status: Optional[str] = None
    review_notes: Optional[str] = None
    performance_score: Optional[float] = None
    attempt_count: Optional[int] = None
    question_text_ar: Optional[str] = None


class Curriculum_questionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    skill_id: Optional[int] = None
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    misconception_tag: Optional[str] = None
    retention_tag: Optional[str] = None
    visual_asset_url: Optional[str] = None
    has_visual: Optional[bool] = None
    review_status: Optional[str] = None
    review_notes: Optional[str] = None
    performance_score: Optional[float] = None
    attempt_count: Optional[int] = None
    question_text_ar: Optional[str] = None


class Curriculum_questionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    skill_id: int
    question_text: str
    question_type: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    misconception_tag: Optional[str] = None
    retention_tag: Optional[str] = None
    visual_asset_url: Optional[str] = None
    has_visual: Optional[bool] = None
    review_status: Optional[str] = None
    review_notes: Optional[str] = None
    performance_score: Optional[float] = None
    attempt_count: Optional[int] = None
    question_text_ar: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Curriculum_questionsListResponse(BaseModel):
    """List response schema"""
    items: List[Curriculum_questionsResponse]
    total: int
    skip: int
    limit: int


class Curriculum_questionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Curriculum_questionsData]


class Curriculum_questionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Curriculum_questionsUpdateData


class Curriculum_questionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Curriculum_questionsBatchUpdateItem]


class Curriculum_questionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Curriculum_questionsListResponse)
async def query_curriculum_questionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query curriculum_questionss with filtering, sorting, and pagination"""
    logger.debug(f"Querying curriculum_questionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Curriculum_questionsService(db)
    try:
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
        logger.debug(f"Found {result['total']} curriculum_questionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying curriculum_questionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Curriculum_questionsListResponse)
async def query_curriculum_questionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query curriculum_questionss without user limitation"""
    logger.debug(f"Querying curriculum_questionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Curriculum_questionsService(db)
    try:
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
        logger.debug(f"Found {result['total']} curriculum_questionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying curriculum_questionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Curriculum_questionsResponse)
async def get_curriculum_questions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single curriculum_questions by ID"""
    logger.debug(f"Fetching curriculum_questions with id: {id}, fields={fields}")
    
    service = Curriculum_questionsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Curriculum_questions with id {id} not found")
            raise HTTPException(status_code=404, detail="Curriculum_questions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching curriculum_questions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Curriculum_questionsResponse, status_code=201)
async def create_curriculum_questions(
    data: Curriculum_questionsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new curriculum_questions"""
    logger.debug(f"Creating new curriculum_questions with data: {data}")
    
    service = Curriculum_questionsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create curriculum_questions")
        
        logger.info(f"Curriculum_questions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating curriculum_questions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating curriculum_questions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Curriculum_questionsResponse], status_code=201)
async def create_curriculum_questionss_batch(
    request: Curriculum_questionsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple curriculum_questionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} curriculum_questionss")
    
    service = Curriculum_questionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} curriculum_questionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Curriculum_questionsResponse])
async def update_curriculum_questionss_batch(
    request: Curriculum_questionsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple curriculum_questionss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} curriculum_questionss")
    
    service = Curriculum_questionsService(db)
    results = []
    
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} curriculum_questionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Curriculum_questionsResponse)
async def update_curriculum_questions(
    id: int,
    data: Curriculum_questionsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing curriculum_questions"""
    logger.debug(f"Updating curriculum_questions {id} with data: {data}")

    service = Curriculum_questionsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Curriculum_questions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Curriculum_questions not found")
        
        logger.info(f"Curriculum_questions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating curriculum_questions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating curriculum_questions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_curriculum_questionss_batch(
    request: Curriculum_questionsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple curriculum_questionss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} curriculum_questionss")
    
    service = Curriculum_questionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} curriculum_questionss successfully")
        return {"message": f"Successfully deleted {deleted_count} curriculum_questionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_curriculum_questions(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single curriculum_questions by ID"""
    logger.debug(f"Deleting curriculum_questions with id: {id}")
    
    service = Curriculum_questionsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Curriculum_questions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Curriculum_questions not found")
        
        logger.info(f"Curriculum_questions {id} deleted successfully")
        return {"message": "Curriculum_questions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting curriculum_questions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")