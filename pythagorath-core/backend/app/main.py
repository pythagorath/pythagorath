"""Pythagorath Core — the live nucleus. One FastAPI app: API under /api, and a
single static page at /. Proves the UNDERSTANDING gate on one skill (B2).
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import access, admin, auth, consent, diagnostic, gate, generators, payments, phrasing, schemas, seed
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
from app.db import SessionLocal, get_db
from app.gate import grade, read_snapshot, recompute
from app.models import (
    AppSetting, GCC_COUNTRIES, Answer, ConsentRecord, Grade, Payment, Plan, Question,
    QuestionInstance, Skill, SkillCountry, SkillMastery, Student, Subscription, Unit,
)


def _path_skills(db: Session, student) -> list[Skill]:
    """The skills VISIBLE to this child = the INTERSECTION of their TARGET grade and their
    country path. Two dimensions:
      * GRADE — only the child's target grade's units (skill→unit.grade_id). Today one
        grade is seeded, so this is a no-op in practice; it's the structural seam for
        multi-grade. (Target grade, NOT a locked level — the diagnostic may later descend
        below it once lower grades + cross-grade edges exist.)
      * COUNTRY — intersect with the country curriculum path (NULL country → whole grade).
    Scoping/display only — the gate and lock are untouched; each path is prerequisite-closed."""
    q = select(Skill).order_by(Skill.order, Skill.id)
    if student.grade_id is not None:
        q = q.join(Unit, Skill.unit_id == Unit.id).where(Unit.grade_id == student.grade_id)
    skills = db.execute(q).scalars().all()
    if not student.country:
        return skills
    allowed = set(db.execute(
        select(SkillCountry.skill_id).where(SkillCountry.country == student.country)
    ).scalars().all())
    return [s for s in skills if s.id in allowed]


# ---- country-path MEMBERSHIP guard (structural, distinct from lock + paywall) ----
# Three never-mixed refusals, distinguished by STRUCTURE not just message text:
#   * PATH    403 detail={"reason":"path",   ...}  → the node isn't in this child's curriculum
#   * LOCK    403 detail={"reason":"locked", ...}  → prerequisites not yet understood
#   * PAYWALL 402 (access.py)                       → no active subscription
# The frontend/tests branch on status + detail.reason, never on message wording.
PATH_REJECTION = "هذه المهارة ليست في منهج طفلك"
LOCK_REJECTION = "هذه المهارة مقفلة — أتقن متطلّباتها أولاً"


def _skill_in_path(db: Session, student, skill_id: int) -> bool:
    """True iff this skill is in the child's path = target GRADE ∩ COUNTRY (NULL country →
    whole grade). Both dimensions enforced here so the seven points stay scoped to the
    child's grade AND country."""
    # GRADE: the skill must belong to the child's target grade.
    if student.grade_id is not None:
        skill = db.get(Skill, skill_id)
        if skill is None:
            return False
        unit = db.get(Unit, skill.unit_id)
        if unit is None or unit.grade_id != student.grade_id:
            return False
    # COUNTRY: …and lie on the country path.
    if not student.country:
        return True
    return db.execute(
        select(SkillCountry.skill_id).where(
            SkillCountry.country == student.country,
            SkillCountry.skill_id == skill_id,
        )
    ).scalars().first() is not None


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


@app.on_event("startup")
def _startup() -> None:
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


@app.get("/api/consent")
def get_consent(user=Depends(auth.current_user)):
    """The current parental-consent text + version, shown before creating a child."""
    return {"version": consent.CURRENT_VERSION, "text": consent.TEXT}


@app.get("/api/grades", response_model=list[schemas.GradeRead])
def list_grades(user=Depends(auth.current_user), db: Session = Depends(get_db)):
    """The seeded grades — to populate the MANDATORY target-grade picker on the
    child-creation form. Only grades that exist (have content) appear; today: الصف الثاني."""
    return db.execute(select(Grade).order_by(Grade.order, Grade.id)).scalars().all()


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
    country = payload.country if payload.country in GCC_COUNTRIES else None
    st = Student(name=name, grade_id=grade.id, country=country, owner_user_id=user.id)
    db.add(st)
    db.flush()                       # assign st.id for the consent record
    db.add(ConsentRecord(user_id=user.id, student_id=st.id, version=consent.CURRENT_VERSION))
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
        prereq_ids = gate.prerequisites(db, s.id)
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


@app.get("/api/subscription", response_model=schemas.SubscriptionRead)
def my_subscription(user=Depends(auth.current_user), db: Session = Depends(get_db)):
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
    sub = Subscription(
        user_id=user.id, plan_id=plan.id,
        status="active" if confirmed else "expired",
        access_until=(datetime.now(timezone.utc) + timedelta(days=30)) if confirmed else None,
    )
    db.add(sub)
    db.flush()
    db.add(Payment(
        subscription_id=sub.id, amount=plan.price, currency=plan.currency,
        status="paid" if confirmed else "pending", provider_ref=co.get("provider_ref"),
    ))
    db.commit()
    return _sub_response(db, user)


# ---- answer → grade → recompute understanding gate ----
@app.post("/api/answers", response_model=schemas.AnswerResult)
def submit_answer(payload: schemas.AnswerRequest,
                  user=Depends(auth.current_user), db: Session = Depends(get_db)):
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
    # Ownership: the answer's student must belong to the caller (isolation boundary).
    student = db.get(Student, payload.student_id)
    if student is None:
        raise HTTPException(404, "student not found")
    if student.owner_user_id != user.id:
        raise HTTPException(403, "ليس من أطفالك")
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

    # PAYWALL (commercial, 402) — checked BEFORE and SEPARATELY from the educational
    # lock. Unpaid → 402 «اشترك»; paid-but-prerequisite-unmet → 403 «مقفل». Never mixed.
    access.require_skill_access(db, user.id, db.get(Skill, question.skill_id))

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
    db.add(
        Answer(
            student_id=payload.student_id,
            question_id=question.id,
            is_correct=is_correct,
            elapsed_ms=payload.elapsed_ms,
        )
    )
    db.flush()
    snap = recompute(db, payload.student_id, question.skill_id)
    db.commit()
    return schemas.AnswerResult(is_correct=is_correct, **snap)


# ---- UI pages ----
@app.get("/")
def index():
    return FileResponse(_STATIC / "index.html")


@app.get("/admin")
def admin_page():
    return FileResponse(_STATIC / "admin.html")


@app.get("/landing")
def landing_page():
    return FileResponse(_STATIC / "landing.html")
