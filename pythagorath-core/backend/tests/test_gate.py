"""Pins the two gates + fluency (accuracy & speed) + lock + durability."""
from datetime import timedelta

from app import gate


def test_grade_normalises_digits(db, h):
    q = h.questions(db, h.skill(db, "B4").id, family="decompositional")[0]
    # stored answer is Arabic-Indic; western digits must still grade correct
    assert gate.grade(q, gate.normalise(q.answer))
    assert gate.grade(q, q.answer)
    assert not gate.grade(q, "999")


def test_understanding_multifamily_needs_two_families(db, h):
    skill = h.skill(db, "B3")            # 3 families, unlocked base node
    stu = h.student(db)
    fams = {}
    for q in h.questions(db, skill.id):
        fams.setdefault(q.family, q)
    fam_list = list(fams.values())
    # one family correct → still in_progress
    snap = h.answer(db, stu.id, fam_list[0], correct=True)
    assert snap["status"] == "in_progress"
    assert not snap["understood"]
    # a SECOND distinct family correct → understood
    snap = h.answer(db, stu.id, fam_list[1], correct=True)
    assert snap["status"] == "understood"
    assert snap["understood"] and not snap["mastered"]


def test_understanding_singlefamily_generalises_over_two_items(db, h):
    skill = h.skill(db, "E1")           # single-family (sequential), 2 items
    stu = h.student(db)
    items = h.questions(db, skill.id)
    snap = h.answer(db, stu.id, items[0], correct=True)
    assert snap["status"] == "in_progress"      # one item is not enough
    snap = h.answer(db, stu.id, items[1], correct=True)
    assert snap["status"] == "understood"       # two distinct items → generalised


def _understand(db, h, skill, stu):
    fams = {}
    for q in h.questions(db, skill.id):
        fams.setdefault(q.family, q)
    fam_list = list(fams.values())
    h.answer(db, stu.id, fam_list[0], correct=True)
    h.answer(db, stu.id, fam_list[1], correct=True)


def test_fluency_fast_and_accurate_masters(db, h):
    skill = h.skill(db, "B3")
    stu = h.student(db)
    _understand(db, h, skill, stu)
    qs = h.questions(db, skill.id)
    snap = None
    for i in range(gate.FLUENCY_WINDOW):
        snap = h.answer(db, stu.id, qs[i % len(qs)], correct=True, elapsed_ms=1200)
    assert snap["status"] == "mastered"
    assert snap["fluency"]["fast_ratio"] >= gate.FLUENCY_THRESHOLD


def test_fluency_slow_but_accurate_stays_understood(db, h):
    skill = h.skill(db, "B3")
    stu = h.student(db)
    _understand(db, h, skill, stu)
    qs = h.questions(db, skill.id)
    snap = None
    for i in range(gate.FLUENCY_WINDOW):
        snap = h.answer(db, stu.id, qs[i % len(qs)], correct=True,
                        elapsed_ms=gate.FLUENCY_MAX_MS + 5000)   # slow
    assert snap["status"] == "understood"          # accurate but NOT fast
    assert snap["fluency"]["accuracy"] == 1.0
    assert snap["fluency"]["fast"] == 0


def test_fluency_low_accuracy_stays_understood(db, h):
    skill = h.skill(db, "B3")
    stu = h.student(db)
    _understand(db, h, skill, stu)
    qs = h.questions(db, skill.id)
    snap = None
    for i in range(gate.FLUENCY_WINDOW):
        # fast, but two of five wrong → accuracy 0.6 < 0.8
        snap = h.answer(db, stu.id, qs[i % len(qs)], correct=(i >= 2), elapsed_ms=1000)
    assert snap["status"] == "understood"


def test_lock_gate_follows_edges(db, h):
    stu = h.student(db)
    assert gate.is_unlocked(db, stu.id, h.skill(db, "B3").id)      # base node, open
    assert not gate.is_unlocked(db, stu.id, h.skill(db, "A1").id)  # needs prerequisites


def test_durability_schedules_review_and_due_query(db, h):
    skill = h.skill(db, "B3")
    stu = h.student(db)
    _understand(db, h, skill, stu)
    qs = h.questions(db, skill.id)
    for i in range(gate.FLUENCY_WINDOW):
        h.answer(db, stu.id, qs[i % len(qs)], correct=True, elapsed_ms=1000)
    sm = db.get(gate.SkillMastery, (stu.id, skill.id))
    assert sm.status == "mastered"
    assert sm.next_review_at is not None                       # scheduled at mastery
    assert gate.due_for_review(db, stu.id, h.now()) == []      # not due yet
    future = h.now() + timedelta(days=999)
    assert skill.id in gate.due_for_review(db, stu.id, future)  # due later
