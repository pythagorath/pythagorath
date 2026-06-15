import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.learning_sessions import Learning_sessionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/learning_sessions", tags=["learning_sessions"])


# ---------- Pydantic Schemas ----------
class Learning_sessionsData(BaseModel):
    """Entity data schema (for create/update)"""
    session_type: str = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int = None
    questions_attempted: int = None
    questions_correct: int = None
    skills_practiced: str = None
    missions_completed: int = None
    xp_earned: int = None
    engagement_score: float = None
    device_type: str = None


class Learning_sessionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    session_type: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    questions_attempted: Optional[int] = None
    questions_correct: Optional[int] = None
    skills_practiced: Optional[str] = None
    missions_completed: Optional[int] = None
    xp_earned: Optional[int] = None
    engagement_score: Optional[float] = None
    device_type: Optional[str] = None


class Learning_sessionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    session_type: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    questions_attempted: Optional[int] = None
    questions_correct: Optional[int] = None
    skills_practiced: Optional[str] = None
    missions_completed: Optional[int] = None
    xp_earned: Optional[int] = None
    engagement_score: Optional[float] = None
    device_type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Learning_sessionsListResponse(BaseModel):
    """List response schema"""
    items: List[Learning_sessionsResponse]
    total: int
    skip: int
    limit: int


class Learning_sessionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Learning_sessionsData]


class Learning_sessionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Learning_sessionsUpdateData


class Learning_sessionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Learning_sessionsBatchUpdateItem]


class Learning_sessionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Learning_sessionsListResponse)
async def query_learning_sessionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query learning_sessionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying learning_sessionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Learning_sessionsService(db)
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
        logger.debug(f"Found {result['total']} learning_sessionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying learning_sessionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Learning_sessionsListResponse)
async def query_learning_sessionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query learning_sessionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying learning_sessionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Learning_sessionsService(db)
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
        logger.debug(f"Found {result['total']} learning_sessionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying learning_sessionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Learning_sessionsResponse)
async def get_learning_sessions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single learning_sessions by ID (user can only see their own records)"""
    logger.debug(f"Fetching learning_sessions with id: {id}, fields={fields}")
    
    service = Learning_sessionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Learning_sessions with id {id} not found")
            raise HTTPException(status_code=404, detail="Learning_sessions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching learning_sessions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Learning_sessionsResponse, status_code=201)
async def create_learning_sessions(
    data: Learning_sessionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new learning_sessions"""
    logger.debug(f"Creating new learning_sessions with data: {data}")
    
    service = Learning_sessionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create learning_sessions")
        
        logger.info(f"Learning_sessions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating learning_sessions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating learning_sessions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Learning_sessionsResponse], status_code=201)
async def create_learning_sessionss_batch(
    request: Learning_sessionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple learning_sessionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} learning_sessionss")
    
    service = Learning_sessionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} learning_sessionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Learning_sessionsResponse])
async def update_learning_sessionss_batch(
    request: Learning_sessionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple learning_sessionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} learning_sessionss")
    
    service = Learning_sessionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} learning_sessionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Learning_sessionsResponse)
async def update_learning_sessions(
    id: int,
    data: Learning_sessionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing learning_sessions (requires ownership)"""
    logger.debug(f"Updating learning_sessions {id} with data: {data}")

    service = Learning_sessionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Learning_sessions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Learning_sessions not found")
        
        logger.info(f"Learning_sessions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating learning_sessions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating learning_sessions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_learning_sessionss_batch(
    request: Learning_sessionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple learning_sessionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} learning_sessionss")
    
    service = Learning_sessionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} learning_sessionss successfully")
        return {"message": f"Successfully deleted {deleted_count} learning_sessionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_learning_sessions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single learning_sessions by ID (requires ownership)"""
    logger.debug(f"Deleting learning_sessions with id: {id}")
    
    service = Learning_sessionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Learning_sessions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Learning_sessions not found")
        
        logger.info(f"Learning_sessions {id} deleted successfully")
        return {"message": "Learning_sessions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting learning_sessions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ---------- Custom Endpoints ----------

class EndSessionRequest(BaseModel):
    """Request to end a learning session"""
    questions_attempted: Optional[int] = None
    questions_correct: Optional[int] = None
    skills_practiced: Optional[str] = None
    missions_completed: Optional[int] = None
    xp_earned: Optional[int] = None
    engagement_score: Optional[float] = None


@router.put("/{id}/end")
async def end_learning_session(
    id: int,
    data: EndSessionRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End a learning session and record final metrics"""
    service = Learning_sessionsService(db)
    try:
        session = await service.get_by_id(id, user_id=str(current_user.id))
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        update_data = data.model_dump(exclude_none=True)
        update_data['ended_at'] = now.isoformat()

        if session.started_at:
            duration = int((now - session.started_at.replace(tzinfo=timezone.utc)).total_seconds())
            update_data['duration_seconds'] = duration

        result = await service.update(id, update_data, user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        return {"message": "Session ended", "id": id, "duration_seconds": update_data.get('duration_seconds', 0)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending session {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")