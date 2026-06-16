"""The full learning loop wired into one cycle: session entry routes new→diagnostic,
returning→learn, due→review; mastery persists across sessions; the review tick reschedules
so the loop never sticks. Reuses diagnostic/path/lock/recompute — only the glue is new.
The understanding/fluency gates are untouched (review tick is scheduling-only)."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app import consent, diagnostic, gate
from app.main import _path_skills, _next_skill_payload
from app.models import Grade, Skill, SkillMastery


def _g4(db, h):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    return h.student(db, grade_id=g4.id, country="SA")


def _sk(db, c):
    return db.execute(select(Skill).where(Skill.code == c)).scalars().one()


def _master(db, h, sid, skill):
    h.reach_understood_multi(db, sid, skill)
    qq = h.questions(db, skill.id)
    for i in range(6):
        h.answer(db, sid, qq[i % len(qq)], correct=True, elapsed_ms=1000)


# ---- session entry routing ----

def test_new_child_routed_to_diagnostic(guardian_client, db):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    sid = guardian_client.post("/api/students", json={
        "name": "ج", "consent_version": consent.CURRENT_VERSION,
        "grade_id": g4.id, "country": "SA"}).json()["id"]
    r = guardian_client.get(f"/api/students/{sid}/session").json()
    assert r["needs_diagnostic"] is True and r["phase"] == "diagnostic" and r["next"] is None


def test_after_diagnostic_routed_to_learn(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))   # diagnosed → pointer set
    db.refresh(stu)
    assert stu.placement_skill_id is not None                  # the 'diagnosed' flag
    nxt = _next_skill_payload(db, stu)
    assert nxt.reason in ("new", "continue") and nxt.skill is not None


# ---- the loop progresses and persists ----

def test_loop_progresses_after_mastery(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    first = _next_skill_payload(db, stu).skill.code
    _master(db, h, stu.id, _sk(db, first))
    second = _next_skill_payload(db, stu).skill
    assert second is not None and second.code != first         # recomputed → moved up
    assert gate.is_unlocked(db, stu.id, second.skill_id)       # never a locked node


def test_state_persists_across_days(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    _master(db, h, stu.id, _sk(db, "g4PVM"))
    db.expire_all()                                            # "next day" — re-read fresh
    stu2 = db.get(type(stu), stu.id)
    assert stu2.placement_skill_id is not None                # diagnosis persisted
    assert db.get(SkillMastery, (stu2.id, _sk(db, "g4PVM").id)).status == "mastered"


# ---- the review tick: due reviews surface, then clear (loop never sticks) ----

def test_review_surfaces_on_session_and_clears(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    pvm = _sk(db, "g4PVM")
    _master(db, h, stu.id, pvm)
    sm = db.get(SkillMastery, (stu.id, pvm.id))
    sm.next_review_at = datetime.now(timezone.utc) - timedelta(days=1)   # fell due
    db.commit()
    assert pvm.id in gate.due_for_review(db, stu.id)                     # due now
    # review it CORRECTLY → tick reschedules forward, stays mastered (never demoted)
    h.answer(db, stu.id, h.questions(db, pvm.id)[0], correct=True, elapsed_ms=1000)
    sm2 = db.get(SkillMastery, (stu.id, pvm.id))
    assert sm2.status == "mastered"
    assert pvm.id not in gate.due_for_review(db, stu.id)                 # CLEARED — loop won't stick


def test_due_review_routes_session_to_review(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    pvm = _sk(db, "g4PVM")
    _master(db, h, stu.id, pvm)
    db.get(SkillMastery, (stu.id, pvm.id)).next_review_at = (
        datetime.now(timezone.utc) - timedelta(days=1))
    db.commit()
    # session entry surfaces the due review FIRST (even though new nodes exist)
    from app.main import session as session_ep
    state = session_ep(student=stu, db=db)
    assert state.phase == "review" and state.next.skill.code == "g4PVM"


def test_review_tick_does_not_touch_unmastered(db, h):
    """The tick only reschedules MASTERED nodes — it never advances or alters a node still
    being learned (the understanding/fluency ladder is untouched)."""
    stu = _g4(db, h)
    frac = _sk(db, "g4FRAC")
    h.reach_understood_multi(db, stu.id, frac)                 # understood, not mastered
    sm = db.get(SkillMastery, (stu.id, frac.id))
    assert sm.status == "understood" and sm.next_review_at is None   # no review scheduled pre-mastery
