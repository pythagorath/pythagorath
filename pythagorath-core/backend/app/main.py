"""Pythagorath Core — the live nucleus. One FastAPI app: API under /api, and a
single static page at /. Proves the UNDERSTANDING gate on one skill (B2).
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import Body, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import access, admin, auth, config, consent, diagnostic, gate, generators, payments, phrasing, schemas, seed
from app import path as learning_path
from app import dashboard as parent_dashboard
from app import adventure as child_adventure
from app import coins
from app import gencontent  # noqa: F401 — registers the m1 live generators (the 22 critical nodes)
from app import gencontent_m2  # noqa: F401 — registers the m2 live generators (the 27 high-risk nodes)
from app import gencontent_m3  # noqa: F401 — registers the m3 live generators (the remaining 74 nodes)
from app import gencontent_g3b6  # noqa: F401 — G3 batch 6: born live (no fixed-seed serving ever)
from app import gencontent_g3b7  # noqa: F401 — G3 batch 7: the fractions cluster, born live
from app import gencontent_g3b8  # noqa: F401 — G3 batch 8: the measurement cluster, born live
from app import gencontent_g3b9  # noqa: F401 — G3 batch 9: geometry/perimeter/area, born live
from app import gencontent_g3b10  # noqa: F401 — G3 batch 10: data & probability (final), born live
from app import gencontent_g4b1  # noqa: F401 — G4 batch 1: place value & large numbers, born live
from app import gencontent_g4b2  # noqa: F401 — G4 batch 2: operations (add/sub, mult, factors), born live
from app import gencontent_g4b3  # noqa: F401 — G4 batch 3: ×2-digit & long division, born live
from app import gencontent_g4b4  # noqa: F401 — G4 batch 4: fractions (represent/equiv/ops), born live
from app import gencontent_g4b5  # noqa: F401 — G4 batch 5: decimal fractions (represent/line/add-sub), born live
from app import gencontent_g4b6  # noqa: F401 — G4 batch 6: measurement (metric/perimeter/area/time/volume), born live
from app import gencontent_g4b7  # noqa: F401 — G4 batch 7: geometry (lines/angle+protractor/shapes/symmetry/coords/location), born live
from app import gencontent_g4b8  # noqa: F401 — G4 batch 8 (final): patterns/algebra + data/probability, born live
from app.db import SessionLocal, get_db
from app.gate import grade, read_snapshot, recompute
from app.models import (
    Announcement, AppSetting, GCC_COUNTRIES, GCC_COUNTRY_NAMES, Answer, ConsentRecord, Grade,
    Payment, Plan, Question, QuestionInstance, Receipt, Skill, SkillCountry, SkillMastery,
    SkillPrerequisite, Student, Subscription, Unit,
)


def _path_skills(db: Session, student) -> list[Skill]:
    """The skills VISIBLE to this child = the INTERSECTION of their TARGET grade, their
    country path, and (when set) their semester. Three dimensions:
      * GRADE — only the child's target grade's units (skill→unit.grade_id). Today one
        grade is seeded, so this is a no-op in practice; it's the structural seam for
        multi-grade. (Target grade, NOT a locked level — the diagnostic may later descend
        below it once lower grades + cross-grade edges exist.)
      * COUNTRY — intersect with the country curriculum path (NULL country → whole grade).
      * TERM (الفصل الدراسي) — keep a node iff: the child has NO term set, OR the node has
        NO term in this country (unclassified), OR the two match. So a child without a term
        sees their WHOLE grade exactly as before — fully backward-compatible. The term lives
        per-country on SkillCountry; read it alongside the membership.
    Scoping/display only — the gate and lock are untouched; each path is prerequisite-closed."""
    q = select(Skill).order_by(Skill.order, Skill.id)
    if student.grade_id is not None:
        q = q.join(Unit, Skill.unit_id == Unit.id).where(Unit.grade_id == student.grade_id)
    skills = db.execute(q).scalars().all()
    if not student.country:
        return skills
    # skill_id → term (NULL term stored as None) for this country's path
    allowed = {sid: term for sid, term in db.execute(
        select(SkillCountry.skill_id, SkillCountry.term).where(
            SkillCountry.country == student.country)
    ).all()}
    child_term = getattr(student, "term", None)
    out = []
    for s in skills:
        if s.id not in allowed:
            continue
        node_term = allowed[s.id]
        if child_term is None or node_term is None or node_term == child_term:
            out.append(s)
    return out


# ---- country-path MEMBERSHIP guard (structural, distinct from lock + paywall) ----
# Three never-mixed refusals, distinguished by STRUCTURE not just message text:
#   * PATH    403 detail={"reason":"path",   ...}  → the node isn't in this child's curriculum
#   * LOCK    403 detail={"reason":"locked", ...}  → prerequisites not yet understood
#   * PAYWALL 402 (access.py)                       → no active subscription
# The frontend/tests branch on status + detail.reason, never on message wording.
PATH_REJECTION = "هذه المهارة ليست في منهج طفلك"
LOCK_REJECTION = "هذه المهارة مقفلة — أتقن متطلّباتها أولاً"


def _ancestor_closure(db: Session, base_ids: set[int]) -> set[int]:
    """base_ids + ALL their transitive prerequisites (following every edge, within- AND
    cross-grade). Following prereq edges only ever goes DOWNWARD (a prereq is lower), so a
    child reaches lower-grade foundations but never ascends to a higher grade."""
    rows = db.execute(select(SkillPrerequisite.skill_id,
                             SkillPrerequisite.prerequisite_skill_id)).all()
    pmap: dict[int, list[int]] = {}
    for sid, pid in rows:
        pmap.setdefault(sid, []).append(pid)
    seen, stack = set(base_ids), list(base_ids)
    while stack:
        cur = stack.pop()
        for pid in pmap.get(cur, ()):
            if pid not in seen:
                seen.add(pid)
                stack.append(pid)
    return seen


def _skill_in_path(db: Session, student, skill_id: int) -> bool:
    """True iff this skill is REACHABLE by the child: their target GRADE ∩ COUNTRY base,
    PLUS the cross-grade ANCESTORS of that base (lower-grade foundations the child may
    DESCEND to for remediation). Descent is downward only — a child never ascends to a
    higher grade. (The skillmap DISPLAY stays grade-scoped; this access is the seam the
    remediation/diagnostic layer will use. Within-grade + country scoping is unchanged for
    the child's own curriculum; only lower-grade ancestors are additionally reachable.)"""
    base_ids = {s.id for s in _path_skills(db, student)}
    return skill_id in _ancestor_closure(db, base_ids)


def _require_in_path(db: Session, student, skill_id: int) -> None:
    """Refuse a node outside this child's curriculum — BEFORE any commercial/lock check
    or state write. Structurally tagged reason='path' so it's never confused with the lock."""
    if not _skill_in_path(db, student, skill_id):
        raise HTTPException(403, {"reason": "path", "message": PATH_REJECTION})

# valid visual themes — all on the Pythagorath identity (orange/cyan/mascot)
THEMES = {"ameen", "mutawwar", "mutadarrij"}
DEFAULT_THEME = "mutadarrij"


def active_theme(db: Session) -> str:
    s = db.get(AppSetting, "theme")
    return s.value if s and s.value in THEMES else DEFAULT_THEME

app = FastAPI(title="Pythagorath Core")
app.include_router(auth.router)
# The whole admin API is gated behind the 'admin' role (401 if anonymous, 403 if a
# non-admin). The constitutional guard inside admin.py is untouched — protection is
# applied here at composition, not inside it.
app.include_router(admin.router, dependencies=[Depends(auth.require_admin)])

_STATIC = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=_STATIC), name="static")


_BACKEND = Path(__file__).resolve().parent.parent   # .../backend


def _alembic_config() -> Config:
    cfg = Config(str(_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND / "alembic"))
    return cfg


def _security_check() -> list[str]:
    """Startup safety net for the production secrets. Returns the list of warnings (also printed);
    in PRODUCTION it REFUSES to boot with the insecure default SECRET_KEY (which signs sessions +
    OTP/reset cookies — a default key lets anyone forge them). Pure check — touches nothing else.
    Set in production: SECRET_KEY=<strong random>, COOKIE_SECURE=1 (HTTPS), and the SMTP_* vars."""
    warnings: list[str] = []
    if config.SECRET_KEY_IS_DEFAULT:
        warnings.append("SECRET_KEY is the INSECURE DEFAULT — set a strong random SECRET_KEY env var "
                        "(it signs the session, OTP and password-reset cookies).")
    if config.IS_PRODUCTION and not config.COOKIE_SECURE:
        warnings.append("COOKIE_SECURE is OFF in production — set COOKIE_SECURE=1 so auth cookies "
                        "are only sent over HTTPS.")
    for w in warnings:
        print("WARNING: [security] " + w, flush=True)
    if config.IS_PRODUCTION and config.SECRET_KEY_IS_DEFAULT:
        raise RuntimeError("Refusing to start in production with the default SECRET_KEY — "
                           "set a strong random SECRET_KEY environment variable.")
    return warnings


@app.on_event("startup")
def _startup() -> None:
    _security_check()              # warn (dev) / refuse to boot (prod) on unsafe secrets
    # Schema is managed by versioned Alembic migrations (not create_all) — the same
    # path in dev and on Oman Data Park. `upgrade head` is idempotent.
    command.upgrade(_alembic_config(), "head")
    db = SessionLocal()
    try:
        seed.seed(db)
        auth.ensure_admin(db)      # bootstrap admin from env if configured
    finally:
        db.close()


# ---- children (owned by the authenticated guardian) ----
@app.get("/api/students", response_model=list[schemas.StudentRead])
def list_students(user: Student = Depends(auth.current_user), db: Session = Depends(get_db)):
    # ONLY this guardian's children — never anyone else's.
    return db.execute(
        select(Student).where(Student.owner_user_id == user.id).order_by(Student.id)
    ).scalars().all()


@app.get("/api/theme")
def get_theme(db: Session = Depends(get_db)):
    """The active visual theme (public — applied on the login/landing screen too)."""
    return {"theme": active_theme(db)}


@app.get("/api/device/children")
def device_children(guardian=Depends(auth.device_guardian), db: Session = Depends(get_db)):
    """The paired DEVICE's selectable children ("اختر نفسك"). Requires the device cookie
    (NOT the parent session) — so the parent account is never exposed on the child's device."""
    rows = db.execute(select(Student).where(Student.owner_user_id == guardian.id)
                      .order_by(Student.id)).scalars().all()
    return {"children": [{"id": s.id, "name": s.name, "has_secret": bool(s.secret_picture)}
                         for s in rows]}


@app.post("/api/device/child-login")
def child_login(payload: dict = Body(...), response: Response = None,
                guardian=Depends(auth.device_guardian), db: Session = Depends(get_db)):
    """The child taps their SECRET PICTURE on a PAIRED device → set the CHILD cookie. The
    child must belong to THIS device's guardian (isolation). First login SETS the picture;
    afterwards it must MATCH. Sets pyth_child scoped to exactly this student."""
    sid = payload.get("student_id")
    pic = (payload.get("secret_picture") or "").strip()
    s = db.get(Student, sid) if sid is not None else None
    if s is None or s.owner_user_id != guardian.id:
        raise HTTPException(403, "ليس من أطفال هذا الجهاز")
    if pic not in auth.SECRET_PICTURES:
        raise HTTPException(400, "صورة غير صالحة")
    if s.secret_picture is None:
        s.secret_picture = pic                         # first-time: the child chooses it
        db.commit()
    elif s.secret_picture != pic:
        raise HTTPException(401, "الصورة السرّية غير صحيحة")
    auth.set_child_cookie(response, auth.create_child_token(s.id))
    return {"id": s.id, "name": s.name}


@app.get("/api/child/me")
def child_me(request: Request, db: Session = Depends(get_db)):
    """The current child (from the CHILD cookie) — for child-mode surfaces. 401 otherwise."""
    cid = auth.child_token_student_id(request)
    s = db.get(Student, cid) if cid is not None else None
    if s is None:
        raise HTTPException(401, "لا جلسة طفل")
    return {"id": s.id, "name": s.name}


# ---- public site config (brand identity / integrations / whatsapp) for site.js ----
_BRAND_DEFAULTS = {"primary": "#155E7D", "secondary": "#F39A1F"}


@app.get("/api/site")
def site_config(db: Session = Depends(get_db)):
    """PUBLIC presentation config the customer surfaces inject (brand / tracking IDs /
    whatsapp). Read-only; never touched by the engine. site.js is defensive: any blank
    value is a no-op."""
    rows = {s.key: s.value for s in db.execute(select(AppSetting)).scalars().all()}
    g = lambda k: rows.get(k, "")
    return {
        "brand": {"name": g("brand_name"), "logo": g("brand_logo"),
                  "primary": g("brand_primary"), "secondary": g("brand_secondary")},
        "integrations": {"ga": g("integration_ga"), "fbpixel": g("integration_fbpixel")},
        "whatsapp": {"enabled": g("whatsapp_enabled") == "1", "number": g("whatsapp_number")},
        "video": g("how_video_url"),   # marketing "how it works" — link/path; blank → animated fallback
        "defaults": _BRAND_DEFAULTS,
    }


@app.get("/api/announcements")
def public_announcements(student_id: int | None = None,
                         user=Depends(auth.optional_user), db: Session = Depends(get_db)):
    """Active announcements TARGETED to the viewer (optional auth: anonymous → 'all' only).
    Targeting is server-side: all / unsubscribed (owner has no active access) / grade /
    country (from the viewer's student). The 'don't nag' frequency is the client's
    (localStorage of dismissed ids). PRESENTATION ONLY — reads, never writes."""
    now = datetime.now(timezone.utc)
    rows = db.execute(select(Announcement).where(Announcement.active.is_(True))
                      .order_by(Announcement.id.desc())).scalars().all()

    # viewer context (only when authenticated + owns the student)
    student = None
    if user is not None and student_id is not None:
        s = db.get(Student, student_id)
        if s is not None and s.owner_user_id == user.id:
            student = s
    unsubscribed = (user is not None) and (not access.has_access(db, user.id))

    def matches(a: Announcement) -> bool:
        if a.starts_at and (a.starts_at if a.starts_at.tzinfo else a.starts_at.replace(tzinfo=timezone.utc)) > now:
            return False
        if a.ends_at and (a.ends_at if a.ends_at.tzinfo else a.ends_at.replace(tzinfo=timezone.utc)) < now:
            return False
        t = a.target_type
        if t == "all":
            return True
        if t == "unsubscribed":
            return unsubscribed
        if t == "grade":
            g = db.get(Grade, student.grade_id) if (student and student.grade_id) else None
            return bool(g and g.name == a.target_value)
        if t == "country":
            return bool(student and student.country == a.target_value)
        return False

    out = [{"id": a.id, "title": a.title, "body": a.body, "code": a.code, "link": a.link,
            "format": a.format} for a in rows if matches(a)]
    return out


@app.get("/api/consent")
def get_consent(user=Depends(auth.current_user)):
    """The current parental-consent text + version, shown before creating a child."""
    return {"version": consent.CURRENT_VERSION, "text": consent.TEXT}


@app.get("/api/grades", response_model=list[schemas.GradeRead])
def list_grades(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """The seeded grades — to populate the MANDATORY target-grade picker on the
    child-creation form. Only grades that exist (have content) appear; today: الصف الثاني."""
    return db.execute(select(Grade).order_by(Grade.order, Grade.id)).scalars().all()


@app.get("/api/countries")
def list_countries(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """The ENABLED curriculum countries for the add-child picker (owner-controlled in admin).
    Disabling a country only HIDES it here — its content/SkillCountry data is untouched.
    Default (no setting) = all six enabled."""
    row = db.get(AppSetting, "countries_disabled")
    disabled = {c for c in (row.value.split(",") if row and row.value else []) if c}
    return [{"code": c, "name": GCC_COUNTRY_NAMES[c]} for c in GCC_COUNTRIES if c not in disabled]


@app.post("/api/students", response_model=schemas.StudentRead)
def create_student(payload: schemas.StudentCreate,
                   user=Depends(auth.current_user), db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "name required")
    # NO child data is collected without registered parental consent. The child row
    # and its consent record are written atomically (one transaction).
    if payload.consent_version != consent.CURRENT_VERSION:
        raise HTTPException(400, "موافقة ولي الأمر مطلوبة قبل إنشاء ملف الطفل")
    # TARGET grade is MANDATORY (a child without a learning grade is meaningless).
    if payload.grade_id is None:
        raise HTTPException(400, "الصف المستهدف مطلوب")
    grade = db.get(Grade, payload.grade_id)
    if grade is None:
        raise HTTPException(400, "الصف المستهدف غير صالح")
    # FAMILY-PLAN child limit (step 7): if the guardian has an ACTIVE/TRIAL plan, they can't
    # add more children than it covers. With no active plan (onboarding) there's no cap here —
    # the paywall still gates the actual learning content.
    now = datetime.now(timezone.utc)
    sub = db.execute(select(Subscription).where(
        Subscription.user_id == user.id,
        Subscription.status.in_(("trial", "active")),
        Subscription.access_until.is_not(None), Subscription.access_until > now,
    ).order_by(Subscription.id.desc())).scalars().first()
    if sub is not None and sub.plan_id is not None:
        plan = db.get(Plan, sub.plan_id)
        if plan is not None:
            n = db.execute(select(func.count(Student.id)).where(
                Student.owner_user_id == user.id)).scalar_one()
            if n >= plan.max_children:
                count_ar = str(plan.max_children).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))
                raise HTTPException(403, f"خطّتك تسمح بـ{count_ar} "
                                    f"{'طفل' if plan.max_children == 1 else 'أطفال'} — رقِّ خطّتك لإضافة المزيد.")
    country = payload.country if payload.country in GCC_COUNTRIES else None
    st = Student(name=name, grade_id=grade.id, country=country,
                 term=payload.term, owner_user_id=user.id)   # term: 1|2|None (whole grade)
    db.add(st)
    db.flush()                       # assign st.id for the consent record
    db.add(ConsentRecord(user_id=user.id, student_id=st.id, version=consent.CURRENT_VERSION))
    db.commit()
    db.refresh(st)
    return st


@app.patch("/api/students/{student_id}", response_model=schemas.StudentRead)
def update_student(student_id: int, payload: schemas.StudentUpdate,
                   user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """Guardian-only edit of a child's settings (currently the semester). PARENT session only
    (not a child token): a child can't change its own scope. Display/scoping only — the gate,
    the engine, mastery are untouched; the new term just re-filters `_path_skills`."""
    st = db.get(Student, student_id)
    if st is None:
        raise HTTPException(404, "الطفل غير موجود")
    if st.owner_user_id != user.id:
        raise HTTPException(403, "ليس من أطفالك")
    st.term = payload.term                       # authoritative: 1 | 2 | None (whole grade)
    db.commit()
    db.refresh(st)
    return st


# ---- skills + questions ----
@app.get("/api/students/{student_id}/skillmap", response_model=list[schemas.SkillMapEntry])
def skillmap(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """The whole network for this student: each skill's lock state + status +
    prerequisites. Status follows the edges (DAG), never skill order."""
    student_id = student.id
    skills = _path_skills(db, student)   # only this child's country path (NULL → all)
    # prereq names resolved from the FULL set (paths are prereq-closed, so they're visible)
    names = {s.id: s.name for s in db.execute(select(Skill)).scalars().all()}
    out = []
    for s in skills:
        prereq_ids = gate.lock_prerequisites(db, s.id)   # same-grade locks (cross-grade = descent, not a lock)
        satisfied = gate.satisfied_among(db, student_id, prereq_ids)
        sm = db.get(SkillMastery, (student_id, s.id))
        out.append(
            schemas.SkillMapEntry(
                id=s.id, code=s.code, name=s.name, state=s.state, order=s.order,
                status=sm.status if sm else "in_progress",
                unlocked=gate.is_unlocked(db, student_id, s.id),
                prerequisites=[
                    schemas.PrereqRef(id=p, name=names.get(p, ""), satisfied=p in satisfied)
                    for p in prereq_ids
                ],
            )
        )
    return out


# ---- parent dashboard (READ-ONLY summary of a child's progress) ----
@app.get("/api/students/{student_id}/report")
def child_report(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """A guardian-facing, non-technical summary of one child's progress. Ownership is
    enforced by `owned_student`. Reuses the SAME reads as the skill map (status +
    is_unlocked) — it touches no gate logic and changes nothing."""
    sid = student.id
    skills = _path_skills(db, student)   # the child's country path (NULL → whole inventory)
    totals = {"nodes": len(skills), "mastered": 0, "understood": 0, "available": 0, "locked": 0}
    out = []
    for s in skills:
        sm = db.get(SkillMastery, (sid, s.id))
        status = sm.status if sm else "in_progress"
        unlocked = gate.is_unlocked(db, sid, s.id)
        if status == "mastered":
            label = "أتقن 🏆"; totals["mastered"] += 1
        elif status == "understood":
            label = "فهم ✓"; totals["understood"] += 1
        elif status == "placed":
            label = "نقطة البداية ➡"; totals["placed"] = totals.get("placed", 0) + 1
        elif unlocked:
            label = "متاح الآن ▶"; totals["available"] += 1
        else:
            label = "مقفل 🔒"; totals["locked"] += 1
        out.append({"code": s.code, "name": s.name, "status": status,
                    "unlocked": unlocked, "label": label})
    return {
        "child": {"id": student.id, "name": student.name, "country": student.country},
        "totals": totals,
        "skills": out,
    }


@app.get("/api/students/{student_id}/dashboard")
def dashboard(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """The guardian dashboard — a READ-ONLY, parent-language aggregation over the heart
    (path/lock/mastery/answers). Plain descriptions (term in parentheses), Hindi numerals
    handled in the UI; computes streak/weekly-time in the child's local Gulf day and a
    DISPLAY-ONLY coins number. Touches no engine state. owned_student → 401/403/404."""
    return parent_dashboard.build(db, student, learning_path.next_skill, _path_skills(db, student))


@app.get("/api/students/{student_id}/adventure")
def adventure(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """The child adventure screen — a READ-ONLY, child-language aggregation over the heart
    (path/lock/mastery/personal-path): the station map in journey order with each node's
    visual state, the current target (next_skill), coins/streak, and needs_diagnostic.
    Plain skill names (parent_terms); Hindi numerals handled in the UI. Touches no engine
    state and grants no mastery. owned_student → 401/403/404."""
    return child_adventure.build(db, student, learning_path.next_skill, _path_skills(db, student))


@app.get("/api/students/{student_id}/diagnostic/probes", response_model=list[schemas.ProbeItem])
def diagnostic_probes(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """Compressed understanding probes for THIS child's country path, ceiling-first.
    Country-scoped exactly like skillmap/report (NULL country → whole inventory) — a
    child is never probed on a node outside their curriculum. owned_student → 401/403/404."""
    skills = _path_skills(db, student)
    return [schemas.ProbeItem(**p) for p in diagnostic.get_probes(db, skills)]


@app.post("/api/students/{student_id}/diagnostic", response_model=schemas.DiagnosticResult)
def run_diagnostic(payload: schemas.DiagnosticSubmit,
                   student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """Grade probes in memory (no answer_log), mark passed nodes understood, and
    return the start-point placement — WITHIN this child's country path (placement
    never lands outside their curriculum). The understanding gate is unchanged."""
    skills = _path_skills(db, student)
    res = diagnostic.place(db, student.id, [a.model_dump() for a in payload.answers], skills)
    return schemas.DiagnosticResult(**res)


def _adaptive_path(db: Session, student) -> list[Skill]:
    """The skills the adaptive diagnostic may probe = the child's base path PLUS its
    cross-grade ANCESTORS (so a struggling child can be placed at a lower-grade
    foundation), sorted FOUNDATION → CEILING (grade order, then in-grade order)."""
    base = _path_skills(db, student)
    cone_ids = _ancestor_closure(db, {s.id for s in base})
    skills = db.execute(select(Skill).where(Skill.id.in_(cone_ids))).scalars().all()
    grade_order = {g.id: g.order for g in db.execute(select(Grade)).scalars().all()}
    unit_grade = {u.id: u.grade_id for u in db.execute(select(Unit)).scalars().all()}
    return sorted(skills, key=lambda s: (grade_order.get(unit_grade.get(s.unit_id), 0), s.order, s.id))


@app.post("/api/students/{student_id}/diagnostic/adaptive", response_model=schemas.AdaptiveStep)
def diagnostic_adaptive(payload: schemas.DiagnosticSubmit,
                        student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """ADAPTIVE placement — interactive & SHORT. The client accumulates answers and POSTs
    them each step; the server replays the binary-search walk and returns either the NEXT
    single probe or the final start-point PLACEMENT. On placement it records the start
    pointer (the frontier's foundation marked `placed` — a lock-opener, NOT mastery: no
    free إتقان). Probes are graded in memory, never logged (no fluency leak)."""
    skills = _adaptive_path(db, student)
    answers = {a.question_id: a.answer for a in payload.answers}
    result = diagnostic.adaptive_next(db, skills, answers)
    if result[0] == "question":
        _, q, s = result
        return schemas.AdaptiveStep(
            done=False, questions_asked=len(answers),
            next=schemas.ProbeItem(
                skill_id=s.id, code=s.code, skill_name=s.name, question_id=q.id,
                family=q.family, prompt=q.prompt, visual=q.visual),
        )
    frontier = result[1]                               # the diagnosed start skill | None
    diagnostic.record_placement(db, student.id, frontier)
    return schemas.AdaptiveStep(
        done=True, questions_asked=len(answers),
        placement=(schemas.PlacementRef(skill_id=frontier.id, code=frontier.code, name=frontier.name)
                   if frontier else None),
    )


def _next_skill_payload(db: Session, student) -> schemas.NextSkill:
    res = learning_path.next_skill(db, student, _path_skills(db, student))

    def ref(skill_id):
        if skill_id is None:
            return None
        s = db.get(Skill, skill_id)
        return schemas.PlacementRef(skill_id=s.id, code=s.code, name=s.name)

    return schemas.NextSkill(reason=res["reason"], skill=ref(res["skill_id"]),
                             remediating_for=ref(res["remediating_for"]))


@app.get("/api/students/{student_id}/session", response_model=schemas.SessionState)
def session(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """The learning-loop ENTRY — 'what should this child do right now?'. A NEVER-diagnosed
    child (placement_skill_id is NULL) is routed to the adaptive diagnostic; otherwise the
    personal path decides (learn / review / done) — review enters automatically when a
    mastered node falls due. A pure read; ties the existing pieces into one cycle.
    owned_student → 401/403/404."""
    if student.placement_skill_id is None:
        return schemas.SessionState(needs_diagnostic=True, phase="diagnostic", next=None)
    # daily rule: a DUE review is cleared before new learning (spaced repetition on
    # return). This session-level ordering is separate from next_skill's learn-priority
    # (which keeps the ratified remediation>continue>new>review order for direct use).
    path_ids = {s.id for s in _path_skills(db, student)}
    due = [sid for sid in gate.due_for_review(db, student.id) if sid in path_ids]
    if due:
        s = db.get(Skill, due[0])
        return schemas.SessionState(
            needs_diagnostic=False, phase="review",
            next=schemas.NextSkill(reason="review", remediating_for=None,
                                   skill=schemas.PlacementRef(skill_id=s.id, code=s.code, name=s.name)))
    nxt = _next_skill_payload(db, student)
    phase = {"remediation": "learn", "continue": "learn", "new": "learn",
             "review": "review", "done": "done"}[nxt.reason]
    return schemas.SessionState(needs_diagnostic=False, phase=phase, next=nxt)


@app.get("/api/students/{student_id}/next", response_model=schemas.NextSkill)
def next_skill(student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    """The child's ONE next study target + WHY — the personal learning path. A pure read
    (lock + mastery + the unified DAG): remediation (descend to a foundation gap) >
    continue > new frontier > review > done. Only UNLOCKED, in-curriculum nodes are
    offered (no progression before mastery; all-owners). owned_student → 401/403/404."""
    return _next_skill_payload(db, student)


@app.get("/api/students/{student_id}/skills/{skill_id}/questions",
         response_model=list[schemas.QuestionRead])
def skill_questions(skill_id: int, student=Depends(auth.owned_student),
                    db: Session = Depends(get_db)):
    """Questions for ONE child's node. Country-scoped STRUCTURALLY (not just in the UI):
    existence (404) → path membership (403 reason=path) → paywall (402). Wording follows
    the child's own country (no spoofable query param). owned_student → 401/403/404."""
    skill = db.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(404, "skill not found")
    _require_in_path(db, student, skill_id)                       # PATH (403, reason=path)
    access.require_skill_access(db, student.owner_user_id, skill)  # PAYWALL (402)
    # LIVE GENERATION (phase 0): a node with registered generators serves freshly
    # generated, family-balanced, one-child instances — drawn ONLY AFTER the path
    # and paywall checks above (the two dimensions precede generation). Nodes with
    # no generators keep their fixed published rows exactly as before (DUAL MODE).
    if generators.has_generators(skill.code):
        batch = generators.draw_batch(db, skill, student.id)
        if batch:
            db.commit()                      # the issued instances are the record
            return [
                schemas.QuestionRead(
                    id=i.question_id,        # the template anchor (report/family home)
                    family=i.family,
                    prompt=i.prompt,
                    visual=i.visual,
                    instance_id=i.id,
                )
                for i in batch
            ]
    # The child sees PUBLISHED questions only, worded for their country. Structure
    # (family/answer/visual) is the question's, unchanged.
    qs = db.execute(
        select(Question)
        .where(Question.skill_id == skill_id, Question.status == "published")
        .order_by(Question.id)
    ).scalars().all()
    return [
        schemas.QuestionRead(
            id=q.id,
            family=q.family,
            prompt=phrasing.resolve_prompt(db, q, student.country),
            visual=q.visual,
        )
        for q in qs
    ]


@app.get(
    "/api/students/{student_id}/skills/{skill_id}/progress",
    response_model=schemas.Progress,
)
def get_progress(skill_id: int, student=Depends(auth.owned_student), db: Session = Depends(get_db)):
    _require_in_path(db, student, skill_id)   # a snapshot of an out-of-path node is meaningless
    return schemas.Progress(**read_snapshot(db, student.id, skill_id))


# ---- durability inspection (READ-ONLY; the review cycle is NOT activated) ----
@app.get("/api/students/{student_id}/reviews")
def reviews_due(at: str | None = None, student=Depends(auth.owned_student),
                db: Session = Depends(get_db)):
    student_id = student.id
    """Mastered nodes and their scheduled review times; `due` is computed against
    `at` (ISO time, default now) so durability can be inspected without waiting real
    days. This only READS — it changes no status and runs no review cycle."""
    now = None
    if at:
        now = datetime.fromisoformat(at)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
    path_ids = {s.id for s in _path_skills(db, student)}   # in-curriculum nodes only
    due = {sid for sid in gate.due_for_review(db, student_id, now) if sid in path_ids}
    rows = db.execute(
        select(SkillMastery).where(
            SkillMastery.student_id == student_id, SkillMastery.status == "mastered"
        )
    ).scalars().all()
    return {
        "mastered": [
            {
                "skill_id": r.skill_id,
                "next_review_at": r.next_review_at.isoformat() if r.next_review_at else None,
                "due": r.skill_id in due,
            }
            for r in rows if r.skill_id in path_ids   # never list an out-of-path node
        ],
        "due_skill_ids": sorted(due),
    }


# ---- subscriptions (commercial) — the guardian subscribes; this gates access to PAID
# content for their children, entirely separate from the educational lock ----
def _sub_response(db: Session, user) -> schemas.SubscriptionRead:
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
        .order_by(Subscription.id.desc())
    ).scalars().first()
    return schemas.SubscriptionRead(
        status=sub.status if sub else None,
        access_until=sub.access_until.isoformat() if sub and sub.access_until else None,
        has_access=access.has_access(db, user.id),
        plan_id=sub.plan_id if sub else None,
    )


@app.get("/api/plans", response_model=list[schemas.PlanRead])
def list_plans(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    return db.execute(select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.id)).scalars().all()


@app.get("/api/public/plans", response_model=list[schemas.PlanRead])
def public_plans(db: Session = Depends(get_db)):
    """Active plans for the PUBLIC pricing page (no auth) — so a visitor sees the real,
    owner-managed prices before signing up. Read-only; identical to the authed list."""
    return db.execute(select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.id)).scalars().all()


@app.get("/api/subscription", response_model=schemas.SubscriptionRead)
def my_subscription(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    return _sub_response(db, user)


@app.post("/api/subscription/cancel", response_model=schemas.SubscriptionRead)
def cancel_subscription(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """Stop the RENEWAL of the current subscription. We do NOT revoke access: the guardian
    keeps what they already paid for until access_until passes (then it expires naturally) —
    this is the "الوصول يبقى حتى نهاية المدة المدفوعة ثم يتوقّف التجديد" policy. Only a live
    trial/active subscription can be cancelled; an already-canceled/expired one 404s."""
    now = datetime.now(timezone.utc)
    sub = db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status.in_(("trial", "active")),
            Subscription.access_until.is_not(None),
            Subscription.access_until > now,
        ).order_by(Subscription.access_until.desc())
    ).scalars().first()
    if sub is None:
        raise HTTPException(404, "لا يوجد اشتراك فعّال لإلغائه")
    sub.status = "canceled"
    db.commit()
    return _sub_response(db, user)


@app.post("/api/subscription/trial", response_model=schemas.SubscriptionRead)
def start_trial(body: schemas.SubscribeRequest, user=Depends(auth.current_user), db: Session = Depends(get_db)):
    plan = db.get(Plan, body.plan_id)
    if plan is None or not plan.is_active:
        raise HTTPException(404, "الخطة غير موجودة")
    if plan.trial_days <= 0:
        raise HTTPException(400, "لا تجربة لهذه الخطة")
    if db.execute(select(Subscription).where(Subscription.user_id == user.id)).scalars().first():
        raise HTTPException(409, "لديك اشتراك بالفعل")
    db.add(Subscription(
        user_id=user.id, plan_id=plan.id, status="trial",
        access_until=datetime.now(timezone.utc) + timedelta(days=plan.trial_days),
    ))
    db.commit()
    return _sub_response(db, user)


@app.post("/api/subscription/checkout", response_model=schemas.SubscriptionRead)
def checkout(body: schemas.SubscribeRequest, user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """Pay via the isolated provider (mock auto-confirms now; a real Omani gateway —
    e.g. Thawani via ODP — plugs in behind the same interface)."""
    plan = db.get(Plan, body.plan_id)
    if plan is None or not plan.is_active:
        raise HTTPException(404, "الخطة غير موجودة")
    co = payments.provider.create_checkout(user, plan)
    confirmed = bool(co.get("auto_confirmed")) and payments.provider.verify(co["provider_ref"])
    days = 365 if plan.period == "yearly" else 30        # the owner-set period
    sub = Subscription(
        user_id=user.id, plan_id=plan.id,
        status="active" if confirmed else "expired",
        access_until=(datetime.now(timezone.utc) + timedelta(days=days)) if confirmed else None,
    )
    db.add(sub)
    db.flush()
    db.add(Payment(
        subscription_id=sub.id, amount=plan.price, currency=plan.currency,
        status="paid" if confirmed else "pending", provider_ref=co.get("provider_ref"),
    ))
    db.commit()
    return _sub_response(db, user)


# ---- manual payments (part B): owner-set methods + bank/phone, customer uploads a receipt ----
def _payment_methods(db: Session) -> dict:
    """The OWNER-controlled payment config the customer surface reads. Visa defaults ON
    (the mock/real card path); bank & phone are opt-in (shown only once the owner enables
    them AND fills the details). Bank/phone details are surfaced only when that method is on."""
    rows = {s.key: s.value for s in db.execute(select(AppSetting)).scalars().all()}
    g = lambda k, d="": rows.get(k, d)
    return {
        "visa": g("pay_visa_on", "1") == "1",
        "bank": {"on": g("pay_bank_on") == "1", "details": g("pay_bank")},
        "phone": {"on": g("pay_phone_on") == "1", "number": g("pay_phone")},
    }


@app.get("/api/payment-info")
def payment_info(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """The visible payment methods + transfer details for the customer (owner-controlled)."""
    return _payment_methods(db)


@app.post("/api/receipts")
def upload_receipt(body: schemas.ReceiptCreate, user=Depends(auth.current_user),
                   db: Session = Depends(get_db)):
    """Submit a manual-payment proof → status 'pending' (awaits owner review). The amount is
    taken from the PLAN (server-trusted, not the client). The method must be enabled by the
    owner. Opens NO access on its own — only an approval does."""
    plan = db.get(Plan, body.plan_id)
    if plan is None or not plan.is_active:
        raise HTTPException(404, "الخطة غير موجودة")
    methods = _payment_methods(db)
    if not methods.get(body.method, {}).get("on"):
        raise HTTPException(400, "طريقة الدفع هذه غير متاحة")
    r = Receipt(user_id=user.id, plan_id=plan.id, method=body.method,
                amount=plan.price, currency=plan.currency,
                file=body.file, filename=body.filename, status="pending")
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None}


@app.get("/api/receipts")
def my_receipts(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """The guardian's own receipts (status + any rejection reason). No file blob — the
    customer already has their copy; this is the review status."""
    rows = db.execute(select(Receipt).where(Receipt.user_id == user.id)
                      .order_by(Receipt.id.desc())).scalars().all()
    plans = {p.id: p.name for p in db.execute(select(Plan)).scalars().all()}
    method_ar = {"bank": "تحويل بنكي", "phone": "تحويل لرقم هاتف"}
    return [{"id": r.id, "plan": plans.get(r.plan_id), "method": method_ar.get(r.method, r.method),
             "amount": r.amount, "currency": r.currency, "status": r.status, "note": r.note,
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]


# ---- answer → grade → recompute understanding gate ----
@app.post("/api/answers", response_model=schemas.AnswerResult)
def submit_answer(payload: schemas.AnswerRequest, request: Request,
                  db: Session = Depends(get_db)):
    # exactly ONE reference: a fixed question (dual mode) or a live instance
    if (payload.question_id is None) == (payload.instance_id is None):
        raise HTTPException(422, "أرسل question_id أو instance_id — واحداً فقط")
    instance = None
    if payload.instance_id is not None:
        instance = db.get(QuestionInstance, payload.instance_id)
        if instance is None:
            raise HTTPException(404, "instance not found")
        question = db.get(Question, instance.question_id)   # the template anchor
    else:
        question = db.get(Question, payload.question_id)
    if question is None:
        raise HTTPException(404, "question not found")
    # Ownership (THE isolation boundary): the answer's student must belong to EITHER the
    # caller-guardian (session) OR the child themselves (a CHILD cookie for EXACTLY this
    # student). Never another child/guardian. (Extended for accounts step 6 — gates intact.)
    student = db.get(Student, payload.student_id)
    if student is None:
        raise HTTPException(404, "student not found")
    _u = auth.optional_user(request, db)
    _child = auth.child_token_student_id(request)
    _is_owner = _u is not None and student.owner_user_id == _u.id
    _is_child = _child is not None and _child == student.id
    if not (_is_owner or _is_child):
        raise HTTPException(401 if (_u is None and _child is None) else 403, "ليس من أطفالك")
    # A live instance is issued to ONE child, answered ONCE (server-held truth).
    if instance is not None:
        if instance.student_id != student.id:
            raise HTTPException(403, "ليست نسخته")
        if instance.answered:
            raise HTTPException(409, "أُجيبت هذه النسخة")

    # PATH membership (403, reason=path) — BEFORE any commercial/lock check or state write,
    # so an out-of-curriculum node can never be answered (no progress pollution in the
    # report/reviews). Distinct, structurally, from the lock below.
    _require_in_path(db, student, question.skill_id)

    # PAYWALL (commercial, 402) — gated on the OWNER's subscription (the child inherits the
    # guardian's access). Checked BEFORE and SEPARATELY from the educational lock.
    access.require_skill_access(db, student.owner_user_id, db.get(Skill, question.skill_id))

    # LOCK gate (educational, 403, reason=locked): prerequisites not all understood.
    if not gate.is_unlocked(db, payload.student_id, question.skill_id):
        raise HTTPException(403, {"reason": "locked", "message": LOCK_REJECTION})

    # Grading: the SAME gate.grade, fed the server-held truth — the instance's own
    # answer for live items (duck-typed: grade reads `.answer`), the question's
    # otherwise. The Answer log keys to the TEMPLATE either way, so the family
    # count, distinct-items count, fluency window and reports read what they
    # always read. The learning layer is untouched.
    is_correct = grade(instance if instance is not None else question, payload.answer)
    if instance is not None:
        instance.answered = True
    ans = Answer(
        student_id=payload.student_id,
        question_id=question.id,
        is_correct=is_correct,
        elapsed_ms=payload.elapsed_ms,
    )
    db.add(ans)
    db.flush()

    # mastery TRANSITION is read by comparing status before/after recompute (recompute is
    # the engine — read BEFORE it mutates the row). The gates are byte-identical below.
    prev_sm = db.get(SkillMastery, (payload.student_id, question.skill_id))
    prior_mastered = prev_sm is not None and prev_sm.status == "mastered"

    snap = recompute(db, payload.student_id, question.skill_id)

    # COINS — a reward SIDE-EFFECT of the gate result (never an input to it): a small award
    # per correct answer, a big one at the mastery transition. Quality only — no coins for a
    # wrong answer or for speed. recompute/the gates are untouched.
    coins_before = student.coins or 0
    if is_correct:
        coins.award_correct(db, student, question.skill_id, ans.id)
    before_mastery = student.coins or 0
    if snap["mastered"] and not prior_mastered:
        coins.award_mastery(db, student, question.skill_id)
    mastery_bonus = (student.coins or 0) - before_mastery   # read-back: the big prize portion
    coins_awarded = (student.coins or 0) - coins_before     # read-back: total for this answer

    db.commit()
    return schemas.AnswerResult(
        is_correct=is_correct, coins_awarded=coins_awarded, mastery_bonus=mastery_bonus,
        coin_balance=student.coins or 0, **snap,
    )


# ---- UI pages ----
@app.get("/")
def index():
    return FileResponse(_STATIC / "index.html")


@app.get("/admin")
def admin_page():
    return FileResponse(_STATIC / "admin.html")


@app.get("/admin/editor")
def admin_editor_page():
    """The detailed question editor (preserved) — linked from the dashboard's Questions section."""
    return FileResponse(_STATIC / "admin_editor.html")


@app.get("/landing")
def landing_page():
    return FileResponse(_STATIC / "landing.html")


@app.get("/about")
def about_page():
    return FileResponse(_STATIC / "about.html")


@app.get("/pricing")
def pricing_page():
    return FileResponse(_STATIC / "pricing.html")


@app.get("/contact")
def contact_page():
    return FileResponse(_STATIC / "contact.html")


@app.get("/account")
def account_page():
    """The guardian onboarding journey: sign up → add child (with consent) → prepare device."""
    return FileResponse(_STATIC / "account.html")


@app.get("/device")
def device_page():
    """The child's device: enter the pairing code → «اختر نفسك» (child selection)."""
    return FileResponse(_STATIC / "device.html")


@app.get("/parent")
def parent_page():
    return FileResponse(_STATIC / "parent.html")


@app.get("/child")
def child_page():
    return FileResponse(_STATIC / "child.html")
