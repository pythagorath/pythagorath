"""Per-question audio: upload (admin), stream (child + admin), delete (admin)."""
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.audio import QuestionAudio
from app.models.skill import Question

router = APIRouter(tags=["audio"])

MAX_BYTES = 5 * 1024 * 1024  # 5 MB safety cap
_EXT = {"audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav"}


def _audio_dir() -> Path:
    d = Path(settings.uploads_dir) / "audio"
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("/admin/questions/{question_id}/audio")
async def upload_audio(question_id: int, file: UploadFile, db: Session = Depends(get_db)):
    if db.get(Question, question_id) is None:
        raise HTTPException(404, f"question {question_id} not found")
    ctype = file.content_type or "application/octet-stream"
    if not ctype.startswith("audio/"):
        raise HTTPException(415, f"expected an audio file, got {ctype}")
    data = await file.read()
    if not data:
        raise HTTPException(400, "empty upload")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "audio too large")

    ext = _EXT.get(ctype, ".bin")
    rel = f"audio/q{question_id}{ext}"
    (Path(settings.uploads_dir) / rel).parent.mkdir(parents=True, exist_ok=True)
    (Path(settings.uploads_dir) / rel).write_bytes(data)

    row = db.get(QuestionAudio, question_id)
    if row is None:
        row = QuestionAudio(question_id=question_id)
        db.add(row)
    row.content_type = ctype
    row.path = rel
    row.byte_size = len(data)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"question_id": question_id, "content_type": ctype, "byte_size": len(data)}


@router.get("/admin/audio/recorded")
def recorded_ids(db: Session = Depends(get_db)):
    """Question ids that already have a recording (for the studio's ✓ markers)."""
    ids = db.execute(select(QuestionAudio.question_id)).scalars().all()
    return {"recorded_ids": list(ids)}


@router.get("/questions/{question_id}/audio")
def get_audio(question_id: int, db: Session = Depends(get_db)):
    row = db.get(QuestionAudio, question_id)
    if row is None:
        raise HTTPException(404, "no audio for this question")
    full = Path(settings.uploads_dir) / row.path
    if not full.exists():
        raise HTTPException(404, "audio file missing")
    return FileResponse(str(full), media_type=row.content_type)


@router.delete("/admin/questions/{question_id}/audio", status_code=204)
def delete_audio(question_id: int, db: Session = Depends(get_db)):
    row = db.get(QuestionAudio, question_id)
    if row is None:
        raise HTTPException(404, "no audio for this question")
    try:
        (Path(settings.uploads_dir) / row.path).unlink(missing_ok=True)
    except OSError:
        pass
    db.delete(row)
    db.commit()
    return None
