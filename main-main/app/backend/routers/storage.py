import logging

from dependencies.auth import get_admin_user, get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from schemas.auth import UserResponse
from schemas.storage import (
    BucketListResponse,
    BucketRequest,
    BucketResponse,
    DeleteResponse,
    FileUpDownRequest,
    FileUpDownResponse,
    ObjectInfo,
    ObjectListResponse,
    ObjectRequest,
    OSSBaseModel,
    RenameRequest,
    RenameResponse,
)
from services.local_storage import LocalStorageService, oss_configured
from services.storage import StorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/storage", tags=["storage"])


@router.post("/create-bucket", response_model=BucketResponse)
async def create_bucket(request: BucketRequest, _current_user: UserResponse = Depends(get_admin_user)):
    """
    Create a new bucket
    """
    try:
        service = StorageService()
        return await service.create_bucket(request)
    except ValueError as e:
        logger.error(f"Invalid create bucket request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create bucket: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/list-buckets", response_model=BucketListResponse)
async def list_buckets(_current_user: UserResponse = Depends(get_current_user)):
    """
    List buckets of the user
    """
    try:
        service = StorageService()
        return await service.list_buckets()
    except ValueError as e:
        logger.error(f"Invalid list buckets request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to list buckets: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/list-objects", response_model=ObjectListResponse)
async def list_objects(request: OSSBaseModel = Depends(), _current_user: UserResponse = Depends(get_current_user)):
    """
    List objects under the bucket
    """
    try:
        service = StorageService()
        return await service.list_objects(request)
    except ValueError as e:
        logger.error(f"Invalid list objects request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to list objects: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/get-object-info", response_model=ObjectInfo)
async def get_object_info(request: ObjectRequest = Depends(), _current_user: UserResponse = Depends(get_current_user)):
    """
    Get object metadata from the bucket
    """
    try:
        service = StorageService()
        return await service.get_object_info(request)
    except ValueError as e:
        logger.error(f"Invalid get object metadata request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get object metadata: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.post("/rename-object", response_model=RenameResponse)
async def rename_object(request: RenameRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Rename object inside the bucket
    """
    try:
        service = StorageService()
        return await service.rename_object(request)
    except ValueError as e:
        logger.error(f"Invalid rename object: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to rename object: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.delete("/delete-object", response_model=DeleteResponse)
async def delete_object(request: ObjectRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Delete object inside the bucket
    """
    try:
        service = StorageService()
        return await service.delete_object(request)
    except ValueError as e:
        logger.error(f"Invalid delete object: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete object: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.post("/upload-url", response_model=FileUpDownResponse)
async def upload_file(request: FileUpDownRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Get a presigned URL for uploading a file to StorageService.

    Steps:
    1. Client calls this endpoint with file details
    2. Server validates and calls OSS service
    3. Returns presigned URL and access_url from OSS service
    4. Client uploads file directly to ObjectStorage using the presigned URL
    5. File is accessible at the returned access_url
    """
    # Local-disk fallback when the hosted OSS service is not configured.
    if not oss_configured():
        url = LocalStorageService().url_for(request.bucket_name, request.object_key)
        return FileUpDownResponse(upload_url=url, download_url=url, expires_at="")
    try:
        service = StorageService()
        return await service.create_upload_url(request)
    except ValueError as e:
        logger.error(f"Invalid upload request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate upload URL: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.post("/download-url", response_model=FileUpDownResponse)
async def download_file(request: FileUpDownRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Get a presigned URL for downloading a file to StorageService.
    """
    # Local-disk fallback when the hosted OSS service is not configured.
    if not oss_configured():
        url = LocalStorageService().url_for(request.bucket_name, request.object_key)
        return FileUpDownResponse(upload_url=url, download_url=url, expires_at="")
    try:
        service = StorageService()
        return await service.create_download_url(request)
    except ValueError as e:
        logger.error(f"Invalid download request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


# ---------- Local-disk storage endpoints (used only when OSS is not configured) ----------
# These are intentionally unauthenticated: the frontend SDK uploads/downloads via a raw
# fetch() to the returned URL without auth headers (mirroring presigned-URL semantics).
@router.put("/local/{bucket_name}/{object_key:path}")
async def local_put_object(bucket_name: str, object_key: str, request: Request):
    """Write an uploaded file to local disk (presigned-PUT equivalent)."""
    if oss_configured():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    try:
        body = await request.body()
        LocalStorageService().save(bucket_name, object_key, body)
        return {"success": True, "bucket_name": bucket_name, "object_key": object_key, "size": len(body)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to store local object: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/local/{bucket_name}/{object_key:path}")
async def local_get_object(bucket_name: str, object_key: str):
    """Serve a locally stored file (presigned-GET equivalent)."""
    if oss_configured():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    try:
        path = LocalStorageService().resolve_path(bucket_name, object_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")
    return FileResponse(path, filename=path.name)
