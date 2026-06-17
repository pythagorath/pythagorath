"""The admin panel — question editor + multi-country phrasing, with the
constitutional guard. An ADDITIVE layer: it never touches the two gates, the lock
gate, the diagnostic, or the seven widgets. It only authors the content + wording
those systems consume.

The constitution for the admin: FREE in content and wording, CONSTRAINED in
structure.
  * Every question must carry a family (enforced at the schema).
  * A country customisation changes wording only — enforced structurally by the
    QuestionPhrasing table having no family/answer/visual columns.
  * The DRAFT/PUBLISHED guard: a child only ever sees PUBLISHED questions, and no
    transition (publish / unpublish / delete) may leave a node's PUBLISHED set
    unmasterable. Node identity (multi-family vs single-family) is read from the
    node's CURRENT published set; the resulting published set is then checked
    against that identity. So a multi-family node can never collapse to one live
    family, nor a single-family node below two live items — exactly the gate's own
    understanding rule, applied to what the child can actually attempt.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import gate, generators, parent_terms, phrasing, schemas
from app.db import get_db
from app.models import (
    Announcement, AppSetting, GCC_COUNTRIES, Answer, Grade, Plan, Question, QuestionInstance,
    QuestionPhrasing, Skill, SkillMastery, Student, Subscription, User,
)
from app.path import STRUGGLE_THRESHOLD

router = APIRouter(prefix="/api/admin", tags=["admin"])
THEMES = {"ameen", "mutawwar", "mutadarrij"}

MSG_MULTI = "لا يمكن — يترك العقدة بعائلة واحدة فلا يمكن إثبات الفهم"
MSG_SINGLE = "لا يمكن — يترك العقدة بأقل من عنصرين فلا يمكن إثبات التعميم"


# ---------------- the constitutional guard ----------------
def _published(db: Session, skill_id: int) -> list[Question]:
    return db.execute(
        select(Question).where(
            Question.skill_id == skill_id, Question.status == "published"
        ).order_by(Question.id)
    ).scalars().all()


def _guard(current_pub: list[Question], proposed_pub: list[Question]) -> tuple[bool, str]:
    """Node identity from the CURRENT published set; masterability of the PROPOSED
    published set checked against that identity."""
    cur_families = {q.family for q in current_pub if q.family}
    is_multi = len(cur_families) >= 2
    new_families = {q.family for q in proposed_pub if q.family}
    new_items = [q for q in proposed_pub if q.family]
    if is_multi:
        if len(new_families) < 2:
            return False, MSG_MULTI
    else:
        if len(new_items) < 2:
            return False, MSG_SINGLE
    return True, ""


def _node_snapshot(db: Session, skill_id: int) -> dict:
    pub = _published(db, skill_id)
    families = sorted({q.family for q in pub if q.family})
    ok, _ = _guard(pub, pub)
    return {
        "is_multi": len(families) >= 2,
        "published_families": families,
        "published_count": len([q for q in pub if q.family]),
        "masterable": ok,
    }


def _q_dict(db: Session, q: Question) -> dict:
    return {
        "id": q.id,
        "skill_id": q.skill_id,
        "family": q.family,
        "prompt": q.prompt,
        "answer": q.answer,
        "difficulty": q.difficulty,
        "visual": q.visual,
        "status": q.status,
        "draft_of": q.draft_of,
        "phrasings": phrasing.phrasings_of(db, q.id),
    }


def _get_q(db: Session, qid: int) -> Question:
    q = db.get(Question, qid)
    if q is None:
        raise HTTPException(404, "question not found")
    return q


def _existing_clone(db: Session, qid: int) -> Question | None:
    return db.execute(
        select(Question).where(Question.draft_of == qid)
    ).scalars().first()


# ---------------- listing ----------------
@router.get("/meta")
def meta():
    """Countries + watermark hints for the editor (hints are drafting aids only)."""
    return {
        "countries": [
            {"code": c, "name": phrasing.COUNTRY_NAMES_AR[c], "hint": phrasing.COUNTRY_HINT_AR[c]}
            for c in GCC_COUNTRIES
        ],
        "widget_kinds": [
            "number-line", "ten-frame", "decomposition", "base-ten-blocks",
            "subtract-blocks", "sequence", "regroup-blocks",
        ],
        "families": ["aggregative", "magnitude", "decompositional", "sequential"],
    }


@router.get("/nodes")
def nodes(db: Session = Depends(get_db)):
    """The 14 nodes, each with its questions (published + drafts) and a node
    masterability snapshot."""
    skills = db.execute(select(Skill).order_by(Skill.order, Skill.id)).scalars().all()
    out = []
    for s in skills:
        qs = db.execute(
            select(Question).where(Question.skill_id == s.id).order_by(Question.id)
        ).scalars().all()
        out.append({
            "id": s.id, "code": s.code, "name": s.name, "state": s.state, "order": s.order,
            "is_free": s.is_free,
            "snapshot": _node_snapshot(db, s.id),
            "questions": [_q_dict(db, q) for q in qs],
        })
    return out


# ---- commercial admin: plans + the free-sample flag ----
@router.get("/plans", response_model=list[schemas.PlanRead])
def admin_list_plans(db: Session = Depends(get_db)):
    return db.execute(select(Plan).order_by(Plan.id)).scalars().all()


@router.post("/plans", response_model=schemas.PlanRead)
def admin_create_plan(body: schemas.PlanCreate, db: Session = Depends(get_db)):
    p = Plan(name=body.name, price=body.price, currency=body.currency,
             trial_days=body.trial_days, max_children=body.max_children, period=body.period,
             is_active=body.is_active)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/plans/{plan_id}", response_model=schemas.PlanRead)
def admin_patch_plan(plan_id: int, body: schemas.PlanPatch, db: Session = Depends(get_db)):
    p = db.get(Plan, plan_id)
    if p is None:
        raise HTTPException(404, "plan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/skills/{skill_id}/free")
def admin_set_skill_free(skill_id: int, body: schemas.SkillFreeRequest, db: Session = Depends(get_db)):
    s = db.get(Skill, skill_id)
    if s is None:
        raise HTTPException(404, "skill not found")
    s.is_free = body.is_free
    db.commit()
    return {"skill_id": skill_id, "is_free": s.is_free}


@router.get("/theme")
def admin_get_theme(db: Session = Depends(get_db)):
    s = db.get(AppSetting, "theme")
    return {"theme": s.value if s and s.value in THEMES else "mutadarrij", "options": sorted(THEMES)}


@router.put("/theme")
def admin_set_theme(body: schemas.ThemeRequest, db: Session = Depends(get_db)):
    if body.theme not in THEMES:
        raise HTTPException(400, "تصميم غير معروف")
    s = db.get(AppSetting, "theme")
    if s is None:
        db.add(AppSetting(key="theme", value=body.theme))
    else:
        s.value = body.theme
    db.commit()
    return {"theme": body.theme}


@router.get("/subscriptions")
def admin_list_subscriptions(db: Session = Depends(get_db)):
    emails = {u.id: u.email for u in db.execute(select(User)).scalars().all()}
    plans = {p.id: p.name for p in db.execute(select(Plan)).scalars().all()}
    rows = db.execute(select(Subscription).order_by(Subscription.id.desc())).scalars().all()
    return [
        {"id": r.id, "user": emails.get(r.user_id), "plan": plans.get(r.plan_id),
         "status": r.status,
         "access_until": r.access_until.isoformat() if r.access_until else None}
        for r in rows
    ]


# ---------------- create / edit drafts ----------------
@router.post("/skills/{skill_id}/questions")
def create_question(skill_id: int, body: schemas.AdminQuestionCreate, db: Session = Depends(get_db)):
    if db.get(Skill, skill_id) is None:
        raise HTTPException(404, "skill not found")
    q = Question(
        skill_id=skill_id, family=body.family, prompt=body.prompt, answer=body.answer,
        difficulty=body.difficulty, visual=body.visual, status="draft", draft_of=None,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return _q_dict(db, q)


@router.patch("/questions/{qid}")
def patch_question(qid: int, body: schemas.AdminQuestionPatch, db: Session = Depends(get_db)):
    q = _get_q(db, qid)
    if q.status != "draft":
        raise HTTPException(409, "السؤال منشور — افتح نسخة تحرير أولاً")
    data = body.model_dump(exclude_unset=True)
    for field in ("family", "prompt", "answer", "difficulty", "visual"):
        if field in data:
            setattr(q, field, data[field])
    db.commit()
    db.refresh(q)
    return _q_dict(db, q)


@router.post("/questions/{qid}/edit")
def open_for_edit(qid: int, db: Session = Depends(get_db)):
    """Open a PUBLISHED question for editing: create (or return) a draft overlay.
    The published original stays LIVE for children until the overlay is published."""
    q = _get_q(db, qid)
    if q.status != "published":
        raise HTTPException(409, "هذا السؤال مسودة بالفعل — حرّره مباشرة")
    clone = _existing_clone(db, qid)
    if clone is None:
        clone = Question(
            skill_id=q.skill_id, family=q.family, prompt=q.prompt, answer=q.answer,
            difficulty=q.difficulty, visual=q.visual, status="draft", draft_of=qid,
        )
        db.add(clone)
        db.flush()
        for country, text in phrasing.phrasings_of(db, qid).items():
            db.add(QuestionPhrasing(question_id=clone.id, country=country, prompt=text))
        db.commit()
        db.refresh(clone)
    return _q_dict(db, clone)


# ---------------- phrasing (wording-only, drafts only) ----------------
def _draft_only(q: Question):
    if q.status != "draft":
        raise HTTPException(409, "الصياغات تُحرَّر على المسودة — افتح نسخة تحرير أولاً")


@router.put("/questions/{qid}/phrasing/{country}")
def set_phrasing(qid: int, country: str, body: schemas.PhrasingBody, db: Session = Depends(get_db)):
    q = _get_q(db, qid)
    _draft_only(q)
    if country not in GCC_COUNTRIES:
        raise HTTPException(400, "دولة غير معروفة")
    row = db.get(QuestionPhrasing, (qid, country))
    if row is None:
        db.add(QuestionPhrasing(question_id=qid, country=country, prompt=body.prompt))
    else:
        row.prompt = body.prompt
    db.commit()
    return _q_dict(db, q)


@router.delete("/questions/{qid}/phrasing/{country}")
def delete_phrasing(qid: int, country: str, db: Session = Depends(get_db)):
    q = _get_q(db, qid)
    _draft_only(q)
    row = db.get(QuestionPhrasing, (qid, country))
    if row is not None:
        db.delete(row)
        db.commit()
    return _q_dict(db, q)


# ---------------- publish / unpublish / delete (guarded) ----------------
@router.post("/questions/{qid}/publish")
def publish(qid: int, db: Session = Depends(get_db)):
    q = _get_q(db, qid)
    if q.status != "draft":
        raise HTTPException(409, "السؤال منشور بالفعل")
    current = _published(db, q.skill_id)

    if q.draft_of is None:
        # brand-new draft → adds to the published set (never reduces masterability)
        proposed = current + [q]
        ok, reason = _guard(current, proposed)
        if not ok:
            raise HTTPException(409, reason)
        q.status = "published"
        db.commit()
        return _q_dict(db, q)

    # overlay → replace the base's content with the draft's, then merge phrasings.
    base = db.get(Question, q.draft_of)
    if base is None or base.status != "published":
        raise HTTPException(409, "الأصل المنشور غير موجود")
    proposed = [x for x in current if x.id != base.id] + [q]   # q carries the edited family
    ok, reason = _guard(current, proposed)
    if not ok:
        raise HTTPException(409, reason)
    base.family, base.prompt, base.answer = q.family, q.prompt, q.answer
    base.difficulty, base.visual = q.difficulty, q.visual
    # replace base phrasings with the overlay's
    for row in db.execute(
        select(QuestionPhrasing).where(QuestionPhrasing.question_id == base.id)
    ).scalars().all():
        db.delete(row)
    db.flush()
    for country, text in phrasing.phrasings_of(db, q.id).items():
        db.add(QuestionPhrasing(question_id=base.id, country=country, prompt=text))
    db.delete(q)   # cascades the overlay's phrasings
    db.commit()
    db.refresh(base)
    return _q_dict(db, base)


@router.post("/questions/{qid}/unpublish")
def unpublish(qid: int, db: Session = Depends(get_db)):
    q = _get_q(db, qid)
    if q.status != "published":
        raise HTTPException(409, "السؤال ليس منشوراً")
    if _existing_clone(db, qid) is not None:
        raise HTTPException(409, "أغلق نسخة التحرير المفتوحة أولاً")
    current = _published(db, q.skill_id)
    proposed = [x for x in current if x.id != qid]
    ok, reason = _guard(current, proposed)
    if not ok:
        raise HTTPException(409, reason)
    q.status = "draft"
    db.commit()
    return _q_dict(db, q)


@router.delete("/questions/{qid}")
def delete_question(qid: int, db: Session = Depends(get_db)):
    q = _get_q(db, qid)
    if q.status == "published":
        current = _published(db, q.skill_id)
        proposed = [x for x in current if x.id != qid]
        ok, reason = _guard(current, proposed)
        if not ok:
            raise HTTPException(409, reason)
    # drafts (brand-new or overlay) delete freely — they were never live
    db.delete(q)
    db.commit()
    return {"deleted": qid}


# ---------------- preview (as the child sees it) ----------------
@router.get("/questions/{qid}/preview")
def preview(qid: int, country: str | None = None, db: Session = Depends(get_db)):
    """The question exactly as a child of `country` would see it (resolved wording +
    real widget), plus the node's masterability snapshot."""
    q = _get_q(db, qid)
    return {
        "id": q.id,
        "family": q.family,
        "prompt": phrasing.resolve_prompt(db, q, country),
        "default_prompt": q.prompt,
        "answer": q.answer,
        "visual": q.visual,
        "difficulty": q.difficulty,
        "status": q.status,
        "country": country if phrasing.is_country(country) else None,
        "node": _node_snapshot(db, q.skill_id),
    }


# ============================================================================
#  MANAGER DASHBOARD — READ-ONLY aggregations over the heart (owner panel).
#  Every route here is already guarded by require_admin (router dependency).
#  Pure reads: they touch no gate / engine / content. Plain skill names via
#  parent_terms; Hindi numerals handled in the UI.
# ============================================================================
def _q_skill_map(db: Session) -> dict:
    return dict(db.execute(select(Question.id, Question.skill_id)).all())


def _struggled(db: Session, limit: int) -> list[dict]:
    """Where children actually stumble — per skill: error rate (wrong/total) and the
    number of children STUCK (status in_progress with >= STRUGGLE_THRESHOLD attempts).
    Read-only over answers + skill_mastery; ranked stuck → error_rate → attempts."""
    qskill = _q_skill_map(db)
    total, wrong, per_stu = defaultdict(int), defaultdict(int), defaultdict(int)
    for qid, correct, stu in db.execute(
            select(Answer.question_id, Answer.is_correct, Answer.student_id)).all():
        sk = qskill.get(qid)
        if sk is None:
            continue
        total[sk] += 1
        if not correct:
            wrong[sk] += 1
        per_stu[(sk, stu)] += 1
    stuck = defaultdict(int)
    for stu, sk, status in db.execute(
            select(SkillMastery.student_id, SkillMastery.skill_id, SkillMastery.status)).all():
        if status == "in_progress" and per_stu.get((sk, stu), 0) >= STRUGGLE_THRESHOLD:
            stuck[sk] += 1
    skills = {s.id: s for s in db.execute(select(Skill)).scalars().all()}
    rows = []
    for sk, t in total.items():
        s = skills.get(sk)
        if s is None or t == 0:
            continue
        rows.append({
            "code": s.code,
            "name": parent_terms.describe(s.code, s.name),
            "attempts": t,
            "error_rate": round(100 * wrong[sk] / t),
            "stuck": stuck.get(sk, 0),
        })
    rows.sort(key=lambda r: (r["stuck"], r["error_rate"], r["attempts"]), reverse=True)
    return rows[:limit]


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    parents = db.execute(select(func.count(User.id)).where(User.role == "guardian")).scalar_one()
    children = db.execute(select(func.count(Student.id))).scalar_one()
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=7)

    days = [(now - timedelta(days=i)).date() for i in range(6, -1, -1)]
    by_day = {d.isoformat(): {"answers": 0, "students": set()} for d in days}
    active = set()
    for stu, ts in db.execute(select(Answer.student_id, Answer.created_at)).all():
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts >= since:
            active.add(stu)
            key = ts.date().isoformat()
            if key in by_day:
                by_day[key]["answers"] += 1
                by_day[key]["students"].add(stu)
    activity = [{"date": k, "answers": v["answers"], "sessions": len(v["students"])}
                for k, v in by_day.items()]

    skills_total = db.execute(select(func.count(Skill.id))).scalar_one()
    published_q = db.execute(select(func.count(Question.id)).where(
        Question.status == "published")).scalar_one()
    needs_review = db.execute(select(func.count(Question.id)).where(
        Question.status != "published")).scalar_one()
    # HONEST count: published_q is the STORED template/published rows; the engine LIVE-
    # GENERATES per child from generators on `live_nodes` skills (effectively unlimited
    # unique questions). `generated_instances` = live copies issued so far.
    live_nodes = len(generators.REGISTRY)
    generated_instances = db.execute(select(func.count(QuestionInstance.id))).scalar_one()

    return {
        "cards": {"parents": parents, "children": children, "active_week": len(active)},
        "activity_7d": activity,
        "content_health": {
            "skills": skills_total, "published_questions": published_q,
            "curricula": len(GCC_COUNTRIES), "needs_review": needs_review,
            "live_nodes": live_nodes, "generated_instances": generated_instances,
        },
        "struggled": _struggled(db, limit=8),
    }


@router.get("/students")
def students(db: Session = Depends(get_db)):
    emails = {u.id: u.email for u in db.execute(select(User)).scalars().all()}
    grades = {g.id: g.name for g in db.execute(select(Grade)).scalars().all()}
    a_count, last = defaultdict(int), {}
    for stu, ts in db.execute(select(Answer.student_id, Answer.created_at)).all():
        a_count[stu] += 1
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if stu not in last or ts > last[stu]:
            last[stu] = ts
    mastered = defaultdict(int)
    for stu, status in db.execute(select(SkillMastery.student_id, SkillMastery.status)).all():
        if status == "mastered":
            mastered[stu] += 1
    out = []
    for s in db.execute(select(Student).order_by(Student.id)).scalars().all():
        out.append({
            "id": s.id, "name": s.name, "grade": grades.get(s.grade_id),
            "country": s.country, "parent": emails.get(s.owner_user_id),
            "answers": a_count.get(s.id, 0), "mastered": mastered.get(s.id, 0),
            "coins": s.coins or 0,
            "last_active": last[s.id].isoformat() if s.id in last else None,
            "diagnosed": s.placement_skill_id is not None,
        })
    return out


@router.get("/parents")
def parents(db: Session = Depends(get_db)):
    n_child = defaultdict(int)
    for owner in db.execute(select(Student.owner_user_id)).scalars().all():
        if owner:
            n_child[owner] += 1
    out = []
    for u in db.execute(select(User).where(User.role == "guardian").order_by(User.id)).scalars().all():
        out.append({
            "id": u.id, "email": u.email, "children": n_child.get(u.id, 0),
            "joined": u.created_at.isoformat() if u.created_at else None,
        })
    return out


@router.get("/students/{student_id}")
def student_detail(student_id: int, db: Session = Depends(get_db)):
    s = db.get(Student, student_id)
    if s is None:
        raise HTTPException(404, "student not found")
    grade = db.get(Grade, s.grade_id).name if s.grade_id else None
    parent = db.get(User, s.owner_user_id).email if s.owner_user_id else None
    skills = {sk.id: sk for sk in db.execute(select(Skill)).scalars().all()}
    mast = db.execute(select(SkillMastery).where(SkillMastery.student_id == student_id)).scalars().all()
    totals = {"mastered": 0, "understood": 0, "in_progress": 0, "placed": 0}
    mastered_list = []
    for sm in mast:
        totals[sm.status] = totals.get(sm.status, 0) + 1
        if sm.status == "mastered" and sm.skill_id in skills:
            sk = skills[sm.skill_id]
            mastered_list.append(parent_terms.describe(sk.code, sk.name))
    answers = db.execute(select(func.count(Answer.id)).where(
        Answer.student_id == student_id)).scalar_one()
    qskill = _q_skill_map(db)
    recent = []
    for qid, correct, ts in db.execute(
            select(Answer.question_id, Answer.is_correct, Answer.created_at)
            .where(Answer.student_id == student_id)
            .order_by(Answer.id.desc()).limit(10)).all():
        sk = skills.get(qskill.get(qid))
        recent.append({
            "skill": parent_terms.describe(sk.code, sk.name) if sk else "—",
            "correct": bool(correct),
            "at": ts.isoformat() if ts else None,
        })
    return {
        "child": {"id": s.id, "name": s.name, "grade": grade, "country": s.country,
                  "parent": parent, "coins": s.coins or 0,
                  "diagnosed": s.placement_skill_id is not None},
        "totals": {**totals, "answers": answers},
        "mastered": mastered_list[:12],
        "recent": recent,
    }


@router.get("/skills/{skill_id}/stats")
def skill_stats(skill_id: int, db: Session = Depends(get_db)):
    s = db.get(Skill, skill_id)
    if s is None:
        raise HTTPException(404, "skill not found")
    total, wrong = defaultdict(int), defaultdict(int)
    for qid, correct in db.execute(select(Answer.question_id, Answer.is_correct)).all():
        total[qid] += 1
        if not correct:
            wrong[qid] += 1
    qs = db.execute(select(Question).where(Question.skill_id == skill_id)
                    .order_by(Question.id)).scalars().all()
    out = []
    for q in qs:
        t = total.get(q.id, 0)
        out.append({
            "id": q.id, "family": q.family, "status": q.status, "prompt": q.prompt,
            "attempts": t, "error_rate": round(100 * wrong.get(q.id, 0) / t) if t else None,
        })
    return {"skill": {"id": s.id, "code": s.code, "name": s.name,
                      "plain": parent_terms.describe(s.code, s.name)}, "questions": out}


@router.get("/reports")
def reports(db: Session = Depends(get_db)):
    """Where children stumble (full list) — the manager's quality lens."""
    return {"struggled": _struggled(db, limit=40)}


# ============================================================================
#  PLATFORM CONTROL — settings (integrations / brand identity / whatsapp) + ads.
#  This is the SETTINGS layer the owner manages: writes are allowed HERE (config/
#  presentation only). The engine / gates / content are never touched.
# ============================================================================
SETTINGS_KEYS = {
    "integration_ga", "integration_fbpixel",
    "brand_name", "brand_logo", "brand_primary", "brand_secondary",
    "whatsapp_number", "whatsapp_enabled",
}
ANN_FORMATS = {"popup", "banner"}
ANN_TARGETS = {"all", "unsubscribed", "grade", "country"}


def _set(db: Session, key: str, value: str):
    s = db.get(AppSetting, key)
    if s is None:
        db.add(AppSetting(key=key, value=value))
    else:
        s.value = value


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    rows = {s.key: s.value for s in db.execute(select(AppSetting)).scalars().all()}
    return {k: rows.get(k, "") for k in SETTINGS_KEYS}


@router.put("/settings")
def put_settings(body: dict = Body(...), db: Session = Depends(get_db)):
    """Whitelisted key→value writes (presentation/config). Unknown keys are ignored."""
    for k, v in body.items():
        if k in SETTINGS_KEYS:
            _set(db, k, "" if v is None else str(v))
    db.commit()
    return get_settings(db)


def _ann_dict(a: Announcement) -> dict:
    return {
        "id": a.id, "title": a.title, "body": a.body, "code": a.code, "link": a.link,
        "format": a.format, "target_type": a.target_type, "target_value": a.target_value,
        "active": a.active,
        "starts_at": a.starts_at.isoformat() if a.starts_at else None,
        "ends_at": a.ends_at.isoformat() if a.ends_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _parse_dt(v):
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(str(v))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db)):
    rows = db.execute(select(Announcement).order_by(Announcement.id.desc())).scalars().all()
    return [_ann_dict(a) for a in rows]


@router.post("/announcements")
def create_announcement(body: dict = Body(...), db: Session = Depends(get_db)):
    title = (body.get("title") or "").strip()
    text_body = (body.get("body") or "").strip()
    if not title or not text_body:
        raise HTTPException(400, "العنوان والنص مطلوبان")
    fmt = body.get("format", "popup")
    tt = body.get("target_type", "all")
    if fmt not in ANN_FORMATS or tt not in ANN_TARGETS:
        raise HTTPException(400, "شكل أو استهداف غير معروف")
    a = Announcement(
        title=title[:160], body=text_body[:600],
        code=(body.get("code") or None), link=(body.get("link") or None),
        format=fmt, target_type=tt,
        target_value=(body.get("target_value") or None),
        active=bool(body.get("active", True)),
        starts_at=_parse_dt(body.get("starts_at")), ends_at=_parse_dt(body.get("ends_at")),
    )
    db.add(a); db.commit(); db.refresh(a)
    return _ann_dict(a)


@router.patch("/announcements/{ann_id}")
def update_announcement(ann_id: int, body: dict = Body(...), db: Session = Depends(get_db)):
    a = db.get(Announcement, ann_id)
    if a is None:
        raise HTTPException(404, "الإعلان غير موجود")
    if "active" in body:
        a.active = bool(body["active"])
    for f in ("title", "body", "code", "link", "target_value"):
        if f in body:
            setattr(a, f, body[f] or None if f in ("code", "link", "target_value") else body[f])
    if body.get("format") in ANN_FORMATS:
        a.format = body["format"]
    if body.get("target_type") in ANN_TARGETS:
        a.target_type = body["target_type"]
    if "starts_at" in body:
        a.starts_at = _parse_dt(body["starts_at"])
    if "ends_at" in body:
        a.ends_at = _parse_dt(body["ends_at"])
    db.commit(); db.refresh(a)
    return _ann_dict(a)


@router.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    a = db.get(Announcement, ann_id)
    if a is None:
        raise HTTPException(404, "الإعلان غير موجود")
    db.delete(a); db.commit()
    return {"ok": True}
