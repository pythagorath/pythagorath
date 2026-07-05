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

import hashlib
import hmac
import secrets

import jwt
from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import config, ratelimit, schemas
from app import email as mailer
from app.db import get_db
from app.models import PairingCode, Student, User

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


# ---------- registration OTP (pending account held in a signed httpOnly cookie) ----------
def _gen_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(config.OTP_LENGTH))


def _hash_code(code: str) -> str:
    """Keyed (HMAC-SHA256) digest of an OTP. The signed cookie stores this DIGEST, never the code
    itself, so a registrant can't read their own code out of the cookie to bypass the email — and
    the digest is meaningless without SECRET_KEY. Compared with hmac.compare_digest (constant-time)."""
    return hmac.new(config.SECRET_KEY.encode(), (code or "").encode(), hashlib.sha256).hexdigest()


def _code_matches(code: str, code_hash: str) -> bool:
    return hmac.compare_digest(_hash_code(code), code_hash or "")


def _client_ip(request: Request) -> str:
    return request.client.host if request and request.client else "?"


def _enforce_send_limit(request: Request, email: str) -> None:
    """Rate-limit the email-SENDING routes per (email + client IP) — caps inbox-bombing a victim
    and runaway provider cost. Raises 429 with a clear Arabic message once the window is full."""
    key = f"otp-send:{(email or '').strip().lower()}:{_client_ip(request)}"
    if not ratelimit.allow(key, config.OTP_SEND_MAX, config.OTP_SEND_WINDOW_MINUTES * 60):
        raise HTTPException(429, "محاولات كثيرة جداً. الرجاء المحاولة بعد قليل.")


def create_pending_token(payload: dict) -> str:
    # holds {email, pw_hash, name, whatsapp, code_hash, attempts?} until the email is verified —
    # signed + short-lived; carried ONLY in an httpOnly cookie. Stores the OTP's HASH (not the
    # code) so the cookie can't be read to skip the email, and never the plaintext password.
    return _encode(payload, "pending", timedelta(minutes=config.OTP_TTL_MINUTES))


def set_pending_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(config.PENDING_COOKIE, token, httponly=True, secure=config.COOKIE_SECURE,
                    samesite="lax", max_age=config.OTP_TTL_MINUTES * 60, path="/")


def clear_pending_cookie(resp: Response) -> None:
    resp.delete_cookie(config.PENDING_COOKIE, path="/")


def set_session_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        config.SESSION_COOKIE, token,
        httponly=True, secure=config.COOKIE_SECURE, samesite="lax",
        max_age=config.SESSION_TTL_HOURS * 3600, path="/",
    )


def clear_session_cookie(resp: Response) -> None:
    resp.delete_cookie(config.SESSION_COOKIE, path="/")


# ---------- child-device tokens (accounts step 6) ----------
def create_device_token(guardian_id: int) -> str:
    return _encode({"sub": str(guardian_id)}, "device", timedelta(days=config.DEVICE_TTL_DAYS))


def create_child_token(student_id: int) -> str:
    return _encode({"sub": str(student_id)}, "child", timedelta(days=config.CHILD_TTL_DAYS))


def set_device_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(config.DEVICE_COOKIE, token, httponly=True, secure=config.COOKIE_SECURE,
                    samesite="lax", max_age=config.DEVICE_TTL_DAYS * 86400, path="/")


def set_child_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(config.CHILD_COOKIE, token, httponly=True, secure=config.COOKIE_SECURE,
                    samesite="lax", max_age=config.CHILD_TTL_DAYS * 86400, path="/")


def clear_device_cookie(resp: Response) -> None:
    resp.delete_cookie(config.DEVICE_COOKIE, path="/")


def clear_child_cookie(resp: Response) -> None:
    resp.delete_cookie(config.CHILD_COOKIE, path="/")


def device_guardian_id(request: Request) -> int | None:
    """The guardian id from a valid DEVICE cookie, else None. NEVER grants guardian/admin
    access (those require a 'session' token) — only authorizes the device's children list."""
    token = request.cookies.get(config.DEVICE_COOKIE)
    if not token:
        return None
    data = _decode(token, "device")
    return int(data["sub"]) if data else None


def child_token_student_id(request: Request) -> int | None:
    """The student id from a valid CHILD cookie, else None (used by the learner boundary)."""
    token = request.cookies.get(config.CHILD_COOKIE)
    if not token:
        return None
    data = _decode(token, "child")
    return int(data["sub"]) if data else None


def device_guardian(request: Request, db: Session = Depends(get_db)) -> User:
    """Dependency: the guardian whose children this paired DEVICE may list/select. 401 if
    the device isn't paired. Does NOT expose the parent account (no session, no email/pwd)."""
    gid = device_guardian_id(request)
    if gid is None:
        raise HTTPException(401, "هذا الجهاز غير مربوط")
    u = db.get(User, gid)
    if u is None:
        raise HTTPException(401, "ربط غير صالح")
    return u


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
    student_id: int, request: Request, db: Session = Depends(get_db)
) -> Student:
    """THE isolation boundary. Access is granted to EITHER the guardian who owns the child
    (session) OR the child themselves (a CHILD cookie scoped to EXACTLY this student) — never
    to any other child or guardian. 404 if absent; 401 if no auth at all; 403 if authed but
    not entitled. (Extended for accounts step 6 part C — the gates/engine are untouched.)"""
    st = db.get(Student, student_id)
    if st is None:
        raise HTTPException(404, "الطفل غير موجود")
    user = optional_user(request, db)
    child_id = child_token_student_id(request)
    if user is not None and st.owner_user_id == user.id:
        return st                                    # the owning guardian
    if child_id is not None and child_id == student_id:
        return st                                    # the child themselves (exact match only)
    if user is None and child_id is None:
        raise HTTPException(401, "غير مُصادَق")
    raise HTTPException(403, "ليس من أطفالك")


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
    """Legacy DIRECT registration (no OTP) — kept for programmatic/admin use and the test
    suite. The public registration PAGE uses the OTP flow below."""
    if db.execute(select(User).where(User.email == body.email)).scalars().first():
        raise HTTPException(409, "البريد مستخدم")
    u = User(email=body.email, password_hash=hash_password(body.password), role="guardian")
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


# ---------- OTP registration (the public page): start → verify, with resend ----------
@router.post("/register/start")
def register_start(body: schemas.RegisterStartRequest, request: Request, response: Response,
                   db: Session = Depends(get_db)):
    """Step 1: validate the guardian's details, email a 6-digit OTP, and stash the pending
    account (incl. the password HASH, never the plaintext; and the OTP's HASH, never the code)
    in a signed httpOnly cookie. NO user row is created yet — the account exists only after the
    code is verified. Rate-limited per email+IP to prevent inbox-bombing."""
    if db.execute(select(User).where(User.email == body.email)).scalars().first():
        raise HTTPException(409, "البريد مستخدم")
    _enforce_send_limit(request, body.email)
    code = _gen_otp()
    token = create_pending_token({
        "email": body.email, "pw_hash": hash_password(body.password),
        "name": body.name, "whatsapp": body.whatsapp, "code_hash": _hash_code(code),
    })
    set_pending_cookie(response, token)
    mailer.send_otp(body.email, code)        # real email if SMTP set, else DEV log
    return {"ok": True, "email": body.email, "ttl_minutes": config.OTP_TTL_MINUTES}


@router.post("/register/resend")
def register_resend(request: Request, response: Response):
    """Re-issue a fresh OTP for the SAME pending account (new code, reset attempts, refreshed
    cookie+TTL). Rate-limited per email+IP like /start."""
    data = _decode(request.cookies.get(config.PENDING_COOKIE, ""), "pending")
    if data is None:
        raise HTTPException(400, "انتهت الجلسة — أعد إدخال بياناتك.")
    _enforce_send_limit(request, data["email"])
    code = _gen_otp()
    payload = {k: data[k] for k in ("email", "pw_hash", "name", "whatsapp") if k in data}
    payload["code_hash"] = _hash_code(code)           # store the digest; attempts reset to 0
    set_pending_cookie(response, create_pending_token(payload))
    mailer.send_otp(data["email"], code)
    return {"ok": True, "email": data["email"], "ttl_minutes": config.OTP_TTL_MINUTES}


@router.post("/register/verify", response_model=schemas.UserRead)
def register_verify(body: schemas.RegisterVerifyRequest, request: Request,
                    response: Response, db: Session = Depends(get_db)):
    """Step 2: check the code against the pending cookie → create the guardian (with name +
    whatsapp), clear the pending cookie, and log them in (session cookie). Wrong codes are
    counted IN the signed cookie; after OTP_MAX_VERIFY_ATTEMPTS the code is burned (brute-force
    cap, stateless across workers)."""
    data = _decode(request.cookies.get(config.PENDING_COOKIE, ""), "pending")
    if data is None:
        raise HTTPException(400, "انتهت صلاحية الرمز — أعد المحاولة.")
    attempts = int(data.get("attempts", 0))
    # The attempt counter lives in the cookie, so the (re)set MUST ride the ERROR response — a
    # cookie set on the injected `response` is dropped when we raise. Hence JSONResponse returns.
    if attempts >= config.OTP_MAX_VERIFY_ATTEMPTS:
        resp = JSONResponse(status_code=429, content={"detail": "محاولات كثيرة خاطئة — اطلب رمزاً جديداً."})
        clear_pending_cookie(resp)                    # burn the code → a fresh one must be requested
        return resp
    if not _code_matches(body.code or "", data.get("code_hash", "")):
        payload = {k: data[k] for k in ("email", "pw_hash", "name", "whatsapp", "code_hash") if k in data}
        payload["attempts"] = attempts + 1            # count the wrong try inside the cookie
        resp = JSONResponse(status_code=400, content={"detail": "الرمز غير صحيح."})
        set_pending_cookie(resp, create_pending_token(payload))
        return resp
    if db.execute(select(User).where(User.email == data["email"])).scalars().first():
        clear_pending_cookie(response)
        raise HTTPException(409, "البريد مستخدم")
    u = User(email=data["email"], password_hash=data["pw_hash"], role="guardian",
             name=data.get("name"), whatsapp=data.get("whatsapp"))
    db.add(u)
    db.commit()
    db.refresh(u)
    clear_pending_cookie(response)
    set_session_cookie(response, create_session_token(u))   # verified → logged in
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


# ---------- account self-service (from inside the guardian's own session) ----------
@router.patch("/me", response_model=schemas.UserRead)
def update_me(body: schemas.ProfileUpdate, user: User = Depends(current_user),
              db: Session = Depends(get_db)):
    """Edit own name / WhatsApp. Only the fields sent are changed. Email is NOT editable here
    (it is the login identity — see the OTP flow below). Validators reuse the registration ones."""
    if body.name is not None:
        user.name = body.name
    if body.whatsapp is not None:
        user.whatsapp = body.whatsapp
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", status_code=204)
def change_password(body: schemas.ChangePasswordRequest, user: User = Depends(current_user),
                    db: Session = Depends(get_db)):
    """Change the password from within the session — the CURRENT password is verified first,
    so a hijacked-but-unlocked session still can't silently swap the password."""
    if not verify_password(user.password_hash, body.current_password):
        raise HTTPException(400, "كلمة السر الحالية غير صحيحة")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return Response(status_code=204)


def _set_emailchg_cookie(response: Response, payload: dict) -> None:
    token = _encode(payload, "emailchg", timedelta(minutes=config.OTP_TTL_MINUTES))
    response.set_cookie(config.EMAILCHG_COOKIE, token, httponly=True,
                        secure=config.COOKIE_SECURE, samesite="lax",
                        max_age=config.OTP_TTL_MINUTES * 60, path="/")


@router.post("/email-change/start")
def email_change_start(body: schemas.EmailChangeStart, request: Request, response: Response,
                       user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Step 1 of changing the login email: prove the password, ensure the new address is free,
    then email a 6-digit OTP to the NEW address. The current email is NOT touched yet — the
    signed {sub,new_email,code_hash} lives in a short-lived httpOnly cookie (digest, not the
    code) until verification. Rate-limited per new-email+IP."""
    if not verify_password(user.password_hash, body.password):
        raise HTTPException(400, "كلمة السر غير صحيحة")
    if body.new_email == user.email:
        raise HTTPException(400, "هذا هو بريدك الحالي")
    if db.execute(select(User).where(User.email == body.new_email)).scalars().first():
        raise HTTPException(409, "البريد مستخدم")
    _enforce_send_limit(request, body.new_email)
    code = _gen_otp()
    _set_emailchg_cookie(response, {"sub": str(user.id), "new_email": body.new_email,
                                    "code_hash": _hash_code(code)})
    mailer.send_otp(body.new_email, code)        # real email if SMTP set, else DEV log
    return {"ok": True, "email": body.new_email, "ttl_minutes": config.OTP_TTL_MINUTES}


@router.post("/email-change/verify", response_model=schemas.UserRead)
def email_change_verify(body: schemas.EmailChangeVerify, request: Request, response: Response,
                        user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Step 2: check the code against the email-change cookie (and that it belongs to THIS
    user) → apply the new email. Wrong codes are counted in the cookie (brute-force cap); the
    address is re-checked free at commit time."""
    data = _decode(request.cookies.get(config.EMAILCHG_COOKIE, ""), "emailchg")
    if data is None or str(data.get("sub")) != str(user.id):
        raise HTTPException(400, "انتهت صلاحية الرمز — أعد المحاولة.")
    attempts = int(data.get("attempts", 0))
    if attempts >= config.OTP_MAX_VERIFY_ATTEMPTS:
        resp = JSONResponse(status_code=429, content={"detail": "محاولات كثيرة خاطئة — اطلب رمزاً جديداً."})
        resp.delete_cookie(config.EMAILCHG_COOKIE, path="/")
        return resp
    if not _code_matches(body.code or "", data.get("code_hash", "")):
        resp = JSONResponse(status_code=400, content={"detail": "الرمز غير صحيح."})
        _set_emailchg_cookie(resp, {"sub": data["sub"], "new_email": data["new_email"],
                                    "code_hash": data.get("code_hash", ""), "attempts": attempts + 1})
        return resp
    new_email = data["new_email"]
    if db.execute(select(User).where(User.email == new_email)).scalars().first():
        response.delete_cookie(config.EMAILCHG_COOKIE, path="/")
        raise HTTPException(409, "البريد مستخدم")
    user.email = new_email
    db.commit()
    db.refresh(user)
    response.delete_cookie(config.EMAILCHG_COOKIE, path="/")
    return user


# ---------- child-device pairing (accounts step 6 part B) ----------
def _children_of(db: Session, guardian_id: int) -> list[dict]:
    rows = db.execute(select(Student).where(Student.owner_user_id == guardian_id)
                      .order_by(Student.id)).scalars().all()
    return [{"id": s.id, "name": s.name, "has_secret": bool(s.secret_picture)} for s in rows]


# The fixed "secret picture" set a child taps to log in (a friendly per-child selector,
# not a password — the real boundary is the device pairing). Mirrored in device.html.
SECRET_PICTURES = {"🐰", "🐱", "⭐", "⚽", "🍎", "🦋", "🌙", "🚗", "🌸", "🐠", "🎈", "🦁"}


@router.post("/pairing-code")
def make_pairing_code(response: Response, user: User = Depends(current_user),
                      db: Session = Depends(get_db)):
    """GUARDIAN-only: mint a 4-digit, one-time, ~10-min code for a child device. The code
    value is kept unique among currently-active codes so redemption is unambiguous."""
    now = datetime.now(timezone.utc)
    active = {pc.code for pc in db.execute(
        select(PairingCode).where(PairingCode.used.is_(False),
                                  PairingCode.expires_at > now)).scalars().all()}
    code = f"{secrets.randbelow(10000):04d}"
    while code in active:
        code = f"{secrets.randbelow(10000):04d}"
    pc = PairingCode(code=code, guardian_user_id=user.id,
                     expires_at=now + timedelta(minutes=config.PAIRING_TTL_MINUTES))
    db.add(pc)
    db.commit()
    return {"code": code, "expires_at": pc.expires_at.isoformat(),
            "ttl_minutes": config.PAIRING_TTL_MINUTES}


@router.post("/pair")
def pair_device(body: schemas.PairRequest, response: Response, db: Session = Depends(get_db)):
    """CHILD DEVICE: redeem a code → set the DEVICE cookie + return the guardian's children
    for "اختر نفسك". One-time (marks used) + expiry checked. The parent account is NOT
    exposed — the device cookie authorizes only listing/selecting that guardian's children."""
    now = datetime.now(timezone.utc)
    pc = db.execute(
        select(PairingCode).where(
            PairingCode.code == (body.code or "").strip(),
            PairingCode.used.is_(False),
            PairingCode.expires_at > now,
        ).order_by(PairingCode.id.desc())
    ).scalars().first()
    if pc is None:
        raise HTTPException(400, "رمز غير صالح أو منتهٍ")
    pc.used = True                                   # single-use
    db.commit()
    set_device_cookie(response, create_device_token(pc.guardian_user_id))
    return {"children": _children_of(db, pc.guardian_user_id)}


@router.post("/device-from-session")
def device_from_session(response: Response, user: User = Depends(current_user),
                        db: Session = Depends(get_db)):
    """DIRECT setup: a logged-in guardian turns THIS device into the child's device — sets
    the device cookie and CLEARS the parent session, so the parent account isn't left open."""
    set_device_cookie(response, create_device_token(user.id))
    clear_session_cookie(response)
    return {"children": _children_of(db, user.id)}


@router.post("/device-logout")
def device_logout(response: Response):
    clear_device_cookie(response)
    clear_child_cookie(response)
    return {"ok": True}


@router.post("/child-logout")
def child_logout(response: Response):
    """The CHILD finishes/steps away: clear ONLY the child cookie (pyth_child). The DEVICE
    cookie stays, so the device remains paired — returning to /device shows «اختر نفسك» for a
    quick child switch (no re-pairing). Distinct from device-logout (which unpairs)."""
    clear_child_cookie(response)
    return {"ok": True}


@router.post("/password-reset/request", status_code=204)
def password_reset_request(body: schemas.PasswordResetRequest, request: Request,
                           db: Session = Depends(get_db)):
    # Rate-limited per email+IP (caps reset-email spam) BEFORE any DB/email work. The 429 is
    # keyed only by email+IP — independent of whether the account exists — so it leaks nothing.
    _enforce_send_limit(request, body.email)
    u = db.execute(select(User).where(User.email == body.email)).scalars().first()
    if u is not None:
        token = create_reset_token(u)
        mailer.send_reset(u.email, token)   # real email if SMTP set, else DEV console log
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
