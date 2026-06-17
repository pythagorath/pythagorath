"""Authentication + authorisation — the security envelope around the (untouched)
constitutional core.

* Passwords: Argon2 (argon2-cffi).
* Sessions: a signed JWT carried in an httpOnly + Secure + SameSite cookie —
  stateless (scales across workers, no shared store), XSS-safe (JS never sees the
  token), CSRF-mitigated (SameSite + same-origin API).
* Data isolation: `owned_student` is the boundary — every child-scoped endpoint
  depends on it, and it 403s unless the authenticated user OWNS that child. The
  gate/diagnostic logic is called only AFTER this check, with the same arguments —
  its logic is never touched.
"""
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import config, schemas
from app.db import get_db
from app.models import Student, User

router = APIRouter(prefix="/api/auth", tags=["auth"])
_ph = PasswordHasher()


# ---------- passwords ----------
def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        _ph.verify(stored_hash, password)
        return True
    except Exception:
        return False


# ---------- tokens ----------
def _encode(payload: dict, typ: str, ttl: timedelta) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {**payload, "typ": typ, "iat": now, "exp": now + ttl},
        config.SECRET_KEY,
        algorithm="HS256",
    )


def _decode(token: str, typ: str) -> dict | None:
    try:
        data = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None                      # bad signature OR expired → invalid
    return data if data.get("typ") == typ else None


def create_session_token(user: User) -> str:
    return _encode({"sub": str(user.id), "role": user.role}, "session",
                   timedelta(hours=config.SESSION_TTL_HOURS))


def create_reset_token(user: User) -> str:
    # signed AND short-lived — never valid forever, so it can't become a backdoor
    return _encode({"sub": str(user.id)}, "reset",
                   timedelta(minutes=config.RESET_TTL_MINUTES))


def set_session_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        config.SESSION_COOKIE, token,
        httponly=True, secure=config.COOKIE_SECURE, samesite="lax",
        max_age=config.SESSION_TTL_HOURS * 3600, path="/",
    )


def clear_session_cookie(resp: Response) -> None:
    resp.delete_cookie(config.SESSION_COOKIE, path="/")


# ---------- dependencies ----------
def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """Like current_user but NEVER raises — returns None for anonymous callers. For
    public surfaces (announcements) that personalise IF logged in, else show the public
    set. Read-only."""
    token = request.cookies.get(config.SESSION_COOKIE)
    if not token:
        return None
    data = _decode(token, "session")
    if not data:
        return None
    return db.get(User, int(data["sub"]))


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "غير مُصادَق")
    data = _decode(token, "session")
    if not data:
        raise HTTPException(401, "جلسة غير صالحة")
    user = db.get(User, int(data["sub"]))
    if user is None:
        raise HTTPException(401, "المستخدم غير موجود")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "يتطلب دور المدير")
    return user


def owned_student(
    student_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Student:
    """THE isolation boundary. 404 if the child does not exist; 403 if it is not
    THIS user's child. A NULL-owner child matches no user → unreachable."""
    st = db.get(Student, student_id)
    if st is None:
        raise HTTPException(404, "الطفل غير موجود")
    if st.owner_user_id != user.id:
        raise HTTPException(403, "ليس من أطفالك")
    return st


# ---------- bootstrap admin ----------
def ensure_admin(db: Session) -> None:
    if not (config.ADMIN_EMAIL and config.ADMIN_PASSWORD):
        return
    exists = db.execute(select(User).where(User.email == config.ADMIN_EMAIL)).scalars().first()
    if exists is None:
        db.add(User(email=config.ADMIN_EMAIL,
                    password_hash=hash_password(config.ADMIN_PASSWORD), role="admin"))
        db.commit()


# ---------- endpoints ----------
@router.post("/register", response_model=schemas.UserRead)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.email == body.email)).scalars().first():
        raise HTTPException(409, "البريد مستخدم")
    u = User(email=body.email, password_hash=hash_password(body.password), role="guardian")
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.post("/login", response_model=schemas.UserRead)
def login(body: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    u = db.execute(select(User).where(User.email == body.email)).scalars().first()
    if u is None or not verify_password(u.password_hash, body.password):
        raise HTTPException(401, "بريد أو كلمة سر غير صحيحة")
    set_session_cookie(response, create_session_token(u))
    return u


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=schemas.UserRead)
def me(user: User = Depends(current_user)):
    return user


@router.post("/password-reset/request", status_code=204)
def password_reset_request(body: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    u = db.execute(select(User).where(User.email == body.email)).scalars().first()
    if u is not None:
        token = create_reset_token(u)
        # TODO(provider): email this token. For now it is logged server-side only.
        print(f"[password-reset] {u.email}: {token}")
    return Response(status_code=204)      # always 204 → no account enumeration


@router.post("/password-reset/confirm", status_code=204)
def password_reset_confirm(body: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    data = _decode(body.token, "reset")
    if data is None:
        raise HTTPException(400, "رمز غير صالح أو منتهٍ")
    u = db.get(User, int(data["sub"]))
    if u is None:
        raise HTTPException(400, "المستخدم غير موجود")
    u.password_hash = hash_password(body.new_password)
    db.commit()
    return Response(status_code=204)
