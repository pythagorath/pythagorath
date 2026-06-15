import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["migration"])


@router.post("/migrate-admin-questions")
async def migrate_admin_questions(db: AsyncSession = Depends(get_db)):
    """Add missing columns to admin_questions table"""
    columns_to_add = [
        ("config_json", "TEXT"),
        ("visual_type", "TEXT"),
        ("visual_data", "TEXT"),
        ("misconception_type", "TEXT"),
        ("retention_tag", "TEXT"),
    ]
    
    added = []
    errors = []
    
    for col_name, col_type in columns_to_add:
        try:
            await db.execute(text(
                f"ALTER TABLE admin_questions ADD COLUMN IF NOT EXISTS {col_name} {col_type};"
            ))
            added.append(col_name)
        except Exception as e:
            errors.append(f"{col_name}: {str(e)}")
    
    await db.commit()
    
    # Get current columns
    result = await db.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_questions' ORDER BY ordinal_position;"
    ))
    columns = [row[0] for row in result.fetchall()]
    
    return {
        "status": "success",
        "added_columns": added,
        "errors": errors,
        "current_columns": columns
    }