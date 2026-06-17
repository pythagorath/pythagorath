"""Coins — a REWARD side-effect of the gate result, written ONLY in /api/answers.
Confirms: +2 on a correct answer, 0 on a wrong one, speed irrelevant, +50 once at the
mastery transition (re-answering a mastered node never re-awards), the balance is PERSISTED
(stored on the student, not derived), the gates/ladder are untouched, and the diagnostic
grants nothing."""
from sqlalchemy import func, select

from app import coins, diagnostic, gate
from app.models import Answer, CoinEvent, Grade, Question, Skill, SkillMastery, Student


def _g4(db, h):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    return h.student(db, grade_id=g4.id, country="SA")


def _sk(db, c):
    return db.execute(select(Skill).where(Skill.code == c)).scalars().one()


def _qs(db, sid):
    return db.execute(select(Question).where(
        Question.skill_id == sid, Question.status == "published").order_by(Question.id)).scalars().all()


def _balance(db, sid):
    return db.get(Student, sid).coins


def _answer(db, h, sid, q, correct=True, elapsed_ms=1000):
    """Mirror the /api/answers award path: grade → log → recompute → coins (the SAME
    transition rule the endpoint uses), so the unit test exercises the real award logic."""
    given = q.answer if correct else (q.answer + "X")
    is_correct = gate.grade(q, given)
    ans = Answer(student_id=sid, question_id=q.id, is_correct=is_correct, elapsed_ms=elapsed_ms)
    db.add(ans); db.flush()
    prev = db.get(SkillMastery, (sid, q.skill_id))
    prior_mastered = prev is not None and prev.status == "mastered"
    snap = gate.recompute(db, sid, q.skill_id)
    stu = db.get(Student, sid)
    if is_correct:
        coins.award_correct(db, stu, q.skill_id, ans.id)
    if snap["mastered"] and not prior_mastered:
        coins.award_mastery(db, stu, q.skill_id)
    db.commit()
    return snap


def test_correct_awards_small_wrong_awards_nothing(db, h):
    stu = _g4(db, h); sk = _sk(db, "g4PVM"); qq = _qs(db, sk.id)
    assert _balance(db, stu.id) == 0
    _answer(db, h, stu.id, qq[0], correct=True)
    assert _balance(db, stu.id) == coins.COINS_PER_CORRECT          # +2
    _answer(db, h, stu.id, qq[1], correct=False)
    assert _balance(db, stu.id) == coins.COINS_PER_CORRECT          # wrong → unchanged


def test_speed_does_not_matter(db, h):
    stu = _g4(db, h); sk = _sk(db, "g4PVM"); qq = _qs(db, sk.id)
    _answer(db, h, stu.id, qq[0], correct=True, elapsed_ms=50)      # very fast
    _answer(db, h, stu.id, qq[1], correct=True, elapsed_ms=99000)   # very slow
    assert _balance(db, stu.id) == 2 * coins.COINS_PER_CORRECT      # same reward


def test_mastery_awards_big_once_idempotent(db, h):
    stu = _g4(db, h); sk = _sk(db, "g4PVM")
    diagnostic.record_placement(db, stu.id, sk)
    qq = _qs(db, sk.id)
    # drive to mastery (two families understood + fluency window of fast-correct answers)
    h.reach_understood_multi(db, stu.id, sk)
    for i in range(8):
        _answer(db, h, stu.id, qq[i % len(qq)], correct=True, elapsed_ms=800)
    sm = db.get(SkillMastery, (stu.id, sk.id))
    assert sm.status == "mastered"                                  # gate intact
    n_mastery = db.execute(select(func.count(CoinEvent.id)).where(
        CoinEvent.student_id == stu.id, CoinEvent.kind == "mastery")).scalar_one()
    assert n_mastery == 1                                           # big award fired ONCE
    bal = _balance(db, stu.id)
    # keep practicing the mastered node → small awards continue, NO second big award
    _answer(db, h, stu.id, qq[0], correct=True, elapsed_ms=800)
    assert _balance(db, stu.id) == bal + coins.COINS_PER_CORRECT
    n_mastery2 = db.execute(select(func.count(CoinEvent.id)).where(
        CoinEvent.student_id == stu.id, CoinEvent.kind == "mastery")).scalar_one()
    assert n_mastery2 == 1                                          # still once


def test_balance_is_persisted_not_derived(db, h):
    stu = _g4(db, h); sk = _sk(db, "g4PVM"); qq = _qs(db, sk.id)
    _answer(db, h, stu.id, qq[0], correct=True)
    db.expire_all()                                                 # force a fresh DB read
    assert db.get(Student, stu.id).coins == coins.COINS_PER_CORRECT
    # ledger is the source of truth: sum(events) == cached balance
    total = db.execute(select(func.coalesce(func.sum(CoinEvent.amount), 0)).where(
        CoinEvent.student_id == stu.id)).scalar_one()
    assert total == db.get(Student, stu.id).coins


def test_correct_then_mastery_example(db, h):
    """The owner's live example: a correct answer (+2) … then mastery (+50)."""
    stu = _g4(db, h); sk = _sk(db, "g4PVM")
    diagnostic.record_placement(db, stu.id, sk)
    qq = _qs(db, sk.id)
    _answer(db, h, stu.id, qq[0], correct=True)
    assert _balance(db, stu.id) == 2                                # first correct → +2
    h.reach_understood_multi(db, stu.id, sk)
    for i in range(8):
        _answer(db, h, stu.id, qq[i % len(qq)], correct=True, elapsed_ms=800)
    assert db.get(SkillMastery, (stu.id, sk.id)).status == "mastered"
    # balance now includes the single +50 mastery prize plus the +2-per-correct trail
    n_correct = db.execute(select(func.count(CoinEvent.id)).where(
        CoinEvent.student_id == stu.id, CoinEvent.kind == "correct")).scalar_one()
    assert _balance(db, stu.id) == n_correct * 2 + 50


def test_diagnostic_grants_no_coins(db, h):
    """The adaptive diagnostic grades in memory (no Answer rows, no /answers) → no coins."""
    stu = _g4(db, h)
    skills = db.execute(select(Skill)).scalars().all()
    # answer a probe 'correctly' via the diagnostic placement path — it must not pay out
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    assert _balance(db, stu.id) == 0
    assert db.execute(select(func.count(CoinEvent.id)).where(
        CoinEvent.student_id == stu.id)).scalar_one() == 0
