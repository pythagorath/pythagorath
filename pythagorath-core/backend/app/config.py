"""Environment-driven configuration — the single place the substrate is bound.

Nothing here is environment-specific in code: the database URL and pool sizing come
from environment variables, so the SAME image runs on local SQLite (zero-config dev),
local Postgres (Docker), or Oman Data Park (a sovereign Postgres VM / OCI region) by
changing only ``DATABASE_URL``. No re-engineering to move hosts.
"""
import os

# Default keeps zero-config dev on SQLite; production sets a Postgres URL, e.g.
#   postgresql+psycopg://user:pass@host:5432/pythagorath
DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./pythagorath_core.db")

# Connection pool (used for non-SQLite engines). Sized for 500+ concurrent learners:
# the real load is light (~20-50 req/s), so a modest pool per worker is ample.
DB_POOL_SIZE: int = int(os.environ.get("DB_POOL_SIZE", "20"))
DB_MAX_OVERFLOW: int = int(os.environ.get("DB_MAX_OVERFLOW", "10"))

IS_SQLITE: bool = DATABASE_URL.startswith("sqlite")

# ---- auth / sessions ----
# MUST be overridden in production with a strong random secret (env SECRET_KEY).
SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-insecure-change-me-0123456789-abcdef")
SESSION_COOKIE: str = "pyth_session"
SESSION_TTL_HOURS: int = int(os.environ.get("SESSION_TTL_HOURS", "24"))
RESET_TTL_MINUTES: int = int(os.environ.get("RESET_TTL_MINUTES", "30"))
# Child-device cookies (accounts step 6): a DEVICE token (lists/selects a guardian's
# children) and a CHILD token (one child's adventure). NEITHER authorizes guardian/admin
# endpoints — so the parent account is never exposed on a child's device.
DEVICE_COOKIE: str = "pyth_device"
CHILD_COOKIE: str = "pyth_child"
DEVICE_TTL_DAYS: int = int(os.environ.get("DEVICE_TTL_DAYS", "90"))
CHILD_TTL_DAYS: int = int(os.environ.get("CHILD_TTL_DAYS", "30"))
PAIRING_TTL_MINUTES: int = int(os.environ.get("PAIRING_TTL_MINUTES", "10"))
# Send the cookie only over HTTPS in production (env COOKIE_SECURE=1). Dev/tests use
# plain HTTP, so default off, otherwise the cookie would never be sent back.
COOKIE_SECURE: bool = os.environ.get("COOKIE_SECURE", "0") == "1"

# Optional bootstrap admin (created on startup if set and absent).
ADMIN_EMAIL: str | None = os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD: str | None = os.environ.get("ADMIN_PASSWORD")

# ---- registration OTP (email verification) ----
# The pending-registration cookie holds the (signed) registration data + OTP until the
# email is verified — no user row is created until then. Short-lived.
PENDING_COOKIE: str = "pyth_pending"
OTP_TTL_MINUTES: int = int(os.environ.get("OTP_TTL_MINUTES", "15"))
OTP_LENGTH: int = int(os.environ.get("OTP_LENGTH", "6"))

# ---- email provider (OTP + password-reset delivery) ----
# Pluggable: if SMTP is configured (SMTP_HOST set) the real sender is used; otherwise a
# DEV console provider PRINTS the message+code to the server log so the flow is testable
# now and a real service is wired later by setting the env vars below. Supported out of the
# box: console (dev) and SMTP (works with Gmail, SendGrid, Mailgun, Amazon SES, etc.).
EMAIL_FROM: str = os.environ.get("EMAIL_FROM", "فيثاغورث <no-reply@pythagorath.local>")
SMTP_HOST: str | None = os.environ.get("SMTP_HOST")          # set this to enable real email
SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER: str | None = os.environ.get("SMTP_USER")
SMTP_PASSWORD: str | None = os.environ.get("SMTP_PASSWORD")
SMTP_STARTTLS: bool = os.environ.get("SMTP_STARTTLS", "1") == "1"
