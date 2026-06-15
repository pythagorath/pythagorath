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
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import gate, phrasing, schemas
from app.db import get_db
from app.models import AppSetting, GCC_COUNTRIES, Plan, Question, QuestionPhrasing, Skill, Subscription

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
             trial_days=body.trial_days, is_active=body.is_active)
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
    rows = db.execute(select(Subscription).order_by(Subscription.id.desc())).scalars().all()
    return [
        {"id": r.id, "user_id": r.user_id, "plan_id": r.plan_id, "status": r.status,
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
