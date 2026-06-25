"""Adaptive placement diagnostic — the heart: a SHORT binary-search walk that finds the
child's true start point, climbing on a pass and descending on a fail (over the unified
DAG, including the cross-grade edges). It grants NO mastery — only a START POINTER (the
frontier's foundation marked `placed`, a lock-opener that is not understanding/mastery).
The exhaustive diagnostic (get_probes/place) still coexists.
"""
import pathlib

from sqlalchemy import select

from app import consent, diagnostic, gate
from app.main import _path_skills, _adaptive_path
from app.models import Answer, Grade, Question, Skill, SkillMastery, Unit

_STATIC = pathlib.Path(__file__).resolve().parents[1] / "app" / "static"


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


# ---------------- UNIFICATION: every surface uses the ONE adaptive flow ----------------

def test_child_device_diagnostic_is_adaptive_and_places(guardian_client, db):
    """The child device (child.html) deep-links ?diagnostic=1 into index.html, which now runs
    the SAME adaptive endpoint as the parent device. Drive that endpoint over HTTP to the end
    and assert it PLACES the child and clears the needs-diagnostic flag — the exact integration
    the child screen depends on (the binary-search/placement internals are tested above)."""
    grade2 = [g["id"] for g in guardian_client.get("/api/grades").json() if g["order"] == 2][0]
    cid = guardian_client.post("/api/students", json={
        "name": "تكيّفي", "consent_version": consent.CURRENT_VERSION, "grade_id": grade2}).json()["id"]
    # never diagnosed → the child screen shows the diagnostic, not the path
    assert guardian_client.get(f"/api/students/{cid}/session").json()["needs_diagnostic"] is True

    # walk the adaptive endpoint one question at a time (a weak child → descends to a floor).
    answers, asked, step = [], 0, None
    while True:
        step = guardian_client.post(f"/api/students/{cid}/diagnostic/adaptive",
                                    json={"answers": answers}).json()
        if step["done"]:
            break
        q = db.get(Question, step["next"]["question_id"])
        answers.append({"question_id": q.id, "answer": (q.answer or "") + "X"})   # always wrong
        asked += 1
        assert asked <= 12, "adaptive walk over HTTP did not converge"
    assert step["placement"] is not None                       # placed at a real start point

    # the diagnosis set the start pointer → the child now sees their path, not the diagnostic
    assert guardian_client.get(f"/api/students/{cid}/session").json()["needs_diagnostic"] is False
    adv = guardian_client.get(f"/api/students/{cid}/adventure").json()
    assert adv["needs_diagnostic"] is False and adv["current"] is not None


def test_index_diagnostic_ui_is_unified_on_adaptive():
    """The solver UI (index.html — the page the child device loads) runs the adaptive flow and
    no longer carries the old batch diagnostic."""
    html = (_STATIC / "index.html").read_text(encoding="utf-8")
    assert "/diagnostic/adaptive" in html              # the UI calls the adaptive endpoint
    assert "submitDiagnostic" not in html              # the old batch submit handler is gone
    assert "/diagnostic/probes" not in html            # the UI no longer calls the batch probes


def test_child_device_routes_into_the_diagnostic():
    """The child adventure screen still deep-links into the diagnostic when undiagnosed — that
    destination (index.html) is now the adaptive flow (see the test above)."""
    child_html = (_STATIC / "child.html").read_text(encoding="utf-8")
    assert "diagnostic=1" in child_html
