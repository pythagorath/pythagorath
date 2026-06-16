"""Adaptive placement diagnostic — the heart: a SHORT binary-search walk that finds the
child's true start point, climbing on a pass and descending on a fail (over the unified
DAG, including the cross-grade edges). It grants NO mastery — only a START POINTER (the
frontier's foundation marked `placed`, a lock-opener that is not understanding/mastery).
The exhaustive diagnostic (get_probes/place) still coexists.
"""
from sqlalchemy import select

from app import diagnostic, gate
from app.main import _path_skills, _adaptive_path
from app.models import Answer, Grade, Skill, SkillMastery, Unit


def _drive(db, skills, can_do):
    """Run the adaptive walk to completion. `can_do(skill)->bool` decides whether the
    simulated child answers that node's probe correctly. Returns (placement, n_questions)."""
    answers, asked = {}, 0
    while True:
        res = diagnostic.adaptive_next(db, skills, answers)
        if res[0] == "placement":
            return res[1], asked
        _, q, s = res
        answers[q.id] = q.answer if can_do(s) else (q.answer or "") + "X"
        asked += 1
        assert asked <= 40, "adaptive walk did not converge"


# ---------------- adaptive: short, finds the frontier ----------------

def test_adaptive_is_short(db, h):
    stu = h.student(db)
    skills = _adaptive_path(db, stu)
    pos = {s.id: i for i, s in enumerate(skills)}
    cut = skills[len(skills) // 2]
    placement, asked = _drive(db, skills, lambda s: pos[s.id] < pos[cut.id])
    assert placement is not None
    assert asked <= 10, asked                      # binary search → SHORT (~log2 + confirm)


def test_adaptive_climbs_on_pass_descends_on_fail(db, h):
    """A strong child (passes everything) lands at/near the ceiling; a weak child (fails
    everything) lands at/near the floor — the walk genuinely moves both ways."""
    stu = h.student(db)
    skills = _adaptive_path(db, stu)
    pos = {s.id: i for i, s in enumerate(skills)}
    strong, _ = _drive(db, skills, lambda s: True)
    weak, _ = _drive(db, skills, lambda s: False)
    assert pos[strong.id] > pos[weak.id]           # strong placed higher than weak


# ---------------- placement: a start pointer, NEVER mastery ----------------

def test_adaptive_places_without_mastery(db, h):
    stu = h.student(db)
    skills = _adaptive_path(db, stu)
    pos = {s.id: i for i, s in enumerate(skills)}
    cut = skills[len(skills) // 2]
    placement, _ = _drive(db, skills, lambda s: pos[s.id] < pos[cut.id])
    diagnostic.record_placement(db, stu.id, placement)
    rows = db.execute(select(SkillMastery).where(SkillMastery.student_id == stu.id)).scalars().all()
    # any rows written are placement markers ONLY — never understood/mastered (no free إتقان).
    # (rows may be empty when the frontier is a root with no same-grade foundation.)
    assert all(r.status == "placed" for r in rows)
    assert all(r.status not in gate.SATISFYING_STATUSES for r in rows)
    # probes never leak into the answer log (placement is not practice)
    assert db.execute(select(Answer).where(Answer.student_id == stu.id)).first() is None


def test_placement_opens_frontier_but_not_above(db, h):
    """The diagnosed start node opens (its foundation is `placed`); a node ABOVE it stays
    LOCKED — "no progression without mastery" is untouched above the frontier."""
    stu = h.student(db)
    skills = _adaptive_path(db, stu)
    pos = {s.id: i for i, s in enumerate(skills)}
    cut = skills[len(skills) // 2]
    placement, _ = _drive(db, skills, lambda s: pos[s.id] < pos[cut.id])
    diagnostic.record_placement(db, stu.id, placement)
    assert gate.is_unlocked(db, stu.id, placement.id)          # start opens
    deps = [d for d in skills if placement.id in gate.lock_prerequisites(db, d.id)]
    for d in deps:
        assert not gate.is_unlocked(db, stu.id, d.id), d.code  # above stays locked (no free progress)


def test_placement_grants_no_understood_or_mastered_count(db, h):
    stu = h.student(db)
    skills = _adaptive_path(db, stu)
    placement, _ = _drive(db, skills, lambda s: True)          # passes all → ceiling
    diagnostic.record_placement(db, stu.id, placement)
    satisfied = gate.satisfied_among(db, stu.id, [s.id for s in skills])
    assert satisfied == set()                                  # nothing understood/mastered for free


# ---------------- cross-grade descent (uses the edges we built) ----------------

def test_adaptive_descends_cross_grade_for_g4_child(db, h):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    stu = h.student(db, grade_id=g4.id)              # NULL country → all G4 + its cone
    skills = _adaptive_path(db, stu)
    grades = {db.get(Unit, s.unit_id).grade_id for s in skills}
    assert len(grades) > 1                           # the cone spans G4 + lower grades (cross-grade)
    # a child who can do nothing descends to a lower-grade foundation
    placement, asked = _drive(db, skills, lambda s: False)
    assert placement is not None and asked <= 10
    assert db.get(Unit, placement.unit_id).grade_id != g4.id   # placed BELOW grade 4 (descended)


# ---------------- the exhaustive diagnostic still coexists ----------------

def test_exhaustive_diagnostic_still_works(db, h):
    stu = h.student(db)
    skills = _path_skills(db, stu)
    probes = diagnostic.get_probes(db, skills)
    assert probes and all("answer" not in p for p in probes)   # answers never sent
    res = diagnostic.place(db, stu.id, [], skills)              # empty → first open node
    assert res["placement"] is not None


def test_adaptive_base_is_country_scoped(db, h):
    """The base path stays country-scoped; a Qatar child's grade nodes are a strict subset
    of the whole inventory (the cone only adds lower-grade ancestors, never other-country
    same-grade nodes)."""
    qa = h.student(db, country="QA")
    base_ids = {s.id for s in _path_skills(db, qa)}
    all_ids = {s.id for s in db.execute(select(Skill)).scalars().all()}
    assert base_ids < all_ids
