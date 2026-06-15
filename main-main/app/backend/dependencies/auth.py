import hashlib
import logging
from datetime import datetime
from typing import Optional

from core.auth import AccessTokenError, decode_access_token
from core.config import settings
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

# Local-development auth bypass. Enabled ONLY when DEV_AUTH_BYPASS is truthy in the
# environment. When on, requests without a valid token are treated as this admin dev
# user instead of being rejected with 401. NEVER enable this in production.
_DEV_USER = UserResponse(id="dev-local", email="dev@local", name="Local Dev", role="admin", last_login=None)


def _dev_auth_bypass_enabled() -> bool:
    return str(getattr(settings, "dev_auth_bypass", "") or "").lower() in ("1", "true", "yes")


async def get_bearer_token(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> str:
    """Extract bearer token from Authorization header."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials

    logger.debug("Authentication required for request %s %s", request.method, request.url.path)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials were not provided")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> UserResponse:
    """Dependency to get current authenticated user via JWT token."""
    token = credentials.credentials if (credentials and credentials.scheme.lower() == "bearer") else None

    if not token:
        if _dev_auth_bypass_enabled():
            logger.warning("DEV_AUTH_BYPASS active: treating unauthenticated request as '%s'", _DEV_USER.id)
            return _DEV_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials were not provided"
        )

    try:
        payload = decode_access_token(token)
    except AccessTokenError as exc:
        # Log error type only, not the full exception which may contain sensitive token data
        logger.warning("Token validation failed: %s", type(exc).__name__)
        if _dev_auth_bypass_enabled():
            logger.warning("DEV_AUTH_BYPASS active: accepting request despite invalid token as '%s'", _DEV_USER.id)
            return _DEV_USER
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    last_login_raw = payload.get("last_login")
    last_login = None
    if isinstance(last_login_raw, str):
        try:
            last_login = datetime.fromisoformat(last_login_raw)
        except ValueError:
            # Log user hash instead of actual user ID to avoid exposing sensitive information
            user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id else "unknown"
            logger.debug("Failed to parse last_login for user hash: %s", user_hash)

    return UserResponse(
        id=user_id,
        email=payload.get("email", ""),
        name=payload.get("name"),
        role=payload.get("role", "user"),
        last_login=last_login,
    )


async def get_admin_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
