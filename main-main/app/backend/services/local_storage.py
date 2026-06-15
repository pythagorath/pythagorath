"""
Local filesystem storage fallback.

Used when the hosted Object Storage service (OSS) is not configured
(``OSS_SERVICE_URL`` / ``OSS_API_KEY`` are absent), e.g. during local
development. Files are written under a local ``uploads`` directory and served
back through the storage router's ``/local`` endpoints, so the frontend SDK's
presigned-URL upload flow keeps working unchanged.
"""

import logging
import os
import re
from pathlib import Path

from core.config import settings

logger = logging.getLogger(__name__)

# Base directory for locally stored uploads: <backend>/uploads
BASE_DIR = Path(__file__).resolve().parents[1] / "uploads"


def oss_configured() -> bool:
    """Return True when the hosted OSS service is configured."""
    return bool(getattr(settings, "oss_service_url", None) and getattr(settings, "oss_api_key", None))


def _safe_segment(value: str, *, kind: str) -> str:
    """Sanitize a single path segment, preventing traversal and stray separators."""
    base = os.path.basename((value or "").strip())
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "-", base)
    if not cleaned or cleaned in (".", ".."):
        raise ValueError(f"Invalid {kind}: {value!r}")
    return cleaned


class LocalStorageService:
    """Read/write helper for local-disk object storage."""

    def __init__(self, base_dir: Path = BASE_DIR):
        self.base_dir = base_dir

    def resolve_path(self, bucket_name: str, object_key: str) -> Path:
        """Resolve a safe absolute path for a bucket/object pair."""
        bucket = _safe_segment(bucket_name, kind="bucket_name")
        key = _safe_segment(object_key, kind="object_key")
        return self.base_dir / bucket / key

    def save(self, bucket_name: str, object_key: str, data: bytes) -> Path:
        path = self.resolve_path(bucket_name, object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.info("Saved local upload: %s (%d bytes)", path, len(data))
        return path

    def url_for(self, bucket_name: str, object_key: str) -> str:
        """Build an absolute URL the browser and backend can both reach."""
        bucket = _safe_segment(bucket_name, kind="bucket_name")
        key = _safe_segment(object_key, kind="object_key")
        return f"{settings.backend_url.rstrip('/')}/api/v1/storage/local/{bucket}/{key}"
