"""In-process fixed-window rate limiter for the email-sending auth routes (OTP start/resend,
email-change, password-reset).

A module-level dict of recent hit timestamps per key — ZERO new dependency or table, right-sized
for launch. Why in-memory (not the DB): the load is tiny, the goal is an abuse/cost brake (not
billing-grade accounting), and a DB round-trip per attempt is overkill. The trade-off is honest:
state is PER-PROCESS, so with N workers the effective cap is ~N×limit — acceptable as a brake for
launch; swap this backend for Redis (shared) the day a hard GLOBAL cap is needed. The OTP VERIFY
brute-force cap is enforced SEPARATELY and statelessly (an attempt counter inside the signed
pending cookie), so it needs no shared store and is exact regardless of worker count.

Pure utility — never imports or touches the engine/gate/content.
"""
from __future__ import annotations

import time

# key -> list of monotonic timestamps (seconds) of the allowed hits still inside the window
_hits: dict[str, list[float]] = {}


def allow(key: str, limit: int, window_seconds: int) -> bool:
    """Record an attempt for ``key`` and return whether it is ALLOWED. True while fewer than
    ``limit`` hits fall inside the trailing ``window_seconds``; once at the cap, returns False
    and does NOT count the rejected hit (so the window genuinely recovers after it elapses)."""
    now = time.monotonic()
    cutoff = now - window_seconds
    bucket = [t for t in _hits.get(key, ()) if t > cutoff]
    if len(bucket) >= limit:
        _hits[key] = bucket
        return False
    bucket.append(now)
    _hits[key] = bucket
    return True


def reset() -> None:
    """Clear every counter — used by tests to isolate the in-process window between cases."""
    _hits.clear()
