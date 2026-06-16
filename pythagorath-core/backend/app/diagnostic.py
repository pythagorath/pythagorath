"""Adaptive start-point diagnostic (§2) — rebuilt correctly via a COMPRESSED
understanding gate, never an exemption.

* Each node's probe = a MINI understanding gate: two transfer items from two
  different families (multi-family node) or two distinct items (single-family).
  A node is "passed" only if it clears that mini-gate — exactly the proven
  understanding rule, compressed. One correct probe is never enough.
* Probes are graded IN MEMORY and NEVER written to ``answers`` — so they cannot
  leak into the fluency window later (placement is understanding, not practice).
* A passed node becomes ``understood`` (NOT mastered — no free fluency).
* Start point = the first node (topological order) the child did NOT pass whose
  prerequisites are all passed — follows the DAG edges, not skill order.
"""
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import gate
from app.models import Question, Skill, SkillMastery


def _probe_questions(db: Session, skill: Skill) -> list[Question]:
    """Two probe items forming the compressed understanding gate for this skill:
    one per family from two distinct families (multi), or two distinct items
    (single-family)."""
    # PUBLISHED only — a child is never probed with admin draft content.
    qs = db.execute(
        select(Question)
        .where(Question.skill_id == skill.id, Question.status == "published")
        .order_by(Question.id)
    ).scalars().all()
    by_family: dict[str | None, list[Question]] = defaultdict(list)
    for q in qs:
        by_family[q.family].append(q)
    families = [f for f in by_family if f is not None]
    if len(families) >= 2:
        # one item from each of the first two families → two distinct families
        return [by_family[families[0]][0], by_family[families[1]][0]]
    # single-family (or untagged): the first two distinct items
    return qs[:2]


def get_probes(db: Session, skills: list[Skill]) -> list[dict]:
    """Probe set for the GIVEN skills (the child's country path — caller scopes it),
    ordered from the TOP of the network downward (ceiling first). Answers are never
    included. Scoping only: the per-node mini understanding gate is unchanged."""
    out: list[dict] = []
    for s in sorted(skills, key=lambda s: (s.order, s.id), reverse=True):
        for q in _probe_questions(db, s):
            out.append({
                "skill_id": s.id, "code": s.code, "skill_name": s.name,
                "question_id": q.id, "family": q.family, "prompt": q.prompt,
                "visual": q.visual,
            })
    return out


def place(db: Session, student_id: int, answers: list[dict], skills: list[Skill]) -> dict:
    """Grade probes in memory, mark passed nodes understood (no answer_log),
    return the understood codes + the start-point placement. ``skills`` is the
    child's country path (caller scopes it) — placement stays WITHIN the path, and
    no out-of-path node is probed or marked. The understanding gate is unchanged."""
    answer_by_q = {a["question_id"]: a["answer"] for a in answers}

    skills = sorted(skills, key=lambda s: (s.order, s.id))   # topo order asc, path-scoped
    code_of = {s.id: s.code for s in skills}

    # Grade each skill's probes IN MEMORY; decide pass by the mini understanding gate.
    passed_ids: set[int] = set()
    for s in skills:
        probes = _probe_questions(db, s)
        correct = [q for q in probes if q.id in answer_by_q and gate.grade(q, answer_by_q[q.id])]
        total_families = gate.families_total(db, s.id)
        if total_families >= 2:
            distinct = {q.family for q in correct if q.family is not None}
            ok = len(distinct) >= gate.FAMILIES_REQUIRED
        else:
            ok = len({q.id for q in correct}) >= gate.GENERALIZATION_REQUIRED
        if ok:
            passed_ids.add(s.id)

    # Mark passed nodes understood (sticky; never downgrade a mastered node).
    # NO answers are written → no fluency leak. understood_answer_id = 0 so all
    # future practice answers count as the fluency phase from scratch.
    for sid in passed_ids:
        sm = db.get(SkillMastery, (student_id, sid))
        if sm is None:
            db.add(SkillMastery(
                student_id=student_id, skill_id=sid,
                status="understood", understood_answer_id=0,
            ))
        elif sm.status == "in_progress":
            sm.status = "understood"
            sm.understood_answer_id = 0

    # Effective passed = diagnostic passes ∪ anything already understood/mastered.
    already = set(
        db.execute(
            select(SkillMastery.skill_id).where(
                SkillMastery.student_id == student_id,
                SkillMastery.status.in_(gate.SATISFYING_STATUSES),
            )
        ).scalars().all()
    )
    effective = passed_ids | already

    # Placement: first node (topological/order asc) not passed whose prereqs all passed.
    placement = None
    for s in skills:  # already ordered by Skill.order asc (a valid topo order)
        if s.id in effective:
            continue
        prereq = gate.prerequisites(db, s.id)
        if all(p in effective for p in prereq):
            placement = s
            break
    if placement is None and skills:
        placement = skills[-1]  # understood everything → ceiling, for fluency

    db.commit()
    return {
        "understood_codes": sorted(code_of[i] for i in passed_ids if code_of[i]),
        "placement": (
            {"skill_id": placement.id, "code": placement.code, "name": placement.name}
            if placement else None
        ),
    }


# ============================ ADAPTIVE placement (the heart) ============================
# A SHORT, interactive binary search for the child's TRUE start point — the frontier
# between what they can and can't do. It starts at the middle of the path, climbs on a
# pass and descends on a fail (over the unified DAG, including the cross-grade edges), and
# converges in ~log2(path) probes. ONE scan probe per node during the search; a SECOND
# (the compressed understanding gate) only at the frontier, where the decision matters.
#
# It grants NO mastery. The result is a START POINTER: the frontier's foundation is marked
# `placed` (a lock-satisfier that is NOT understanding/mastery), so the child begins at the
# frontier without re-grinding below it — but must still MASTER everything from there up
# ("no progression without mastery" is untouched above the frontier). Probes are graded in
# memory and NEVER written to `answers` (no fluency leak), exactly like the exhaustive path.

def adaptive_next(db: Session, skills: list[Skill], answers: dict[int, str]):
    """Pure function of (path, answers-so-far). Returns either
        ("question", question, skill)  → the next single probe to ask, or
        ("placement", skill | None)    → the diagnosed start point (search done).
    `skills` MUST already be in difficulty order (foundation → ceiling) — for a
    cross-grade walk that means lower grade first, so descent lands on a real foundation.
    Deterministic: the same answers always replay the same walk, so the API can be
    stateless (the client just accumulates answers)."""
    ordered = list(skills)
    if not ordered:
        return ("placement", None)
    probes = {s.id: _probe_questions(db, s) for s in ordered}

    def q0(s):
        return probes[s.id][0] if probes[s.id] else None

    def q1(s):
        return probes[s.id][1] if len(probes[s.id]) > 1 else None

    def scan_answered(s):
        q = q0(s)
        return q is not None and q.id in answers

    def scan_pass(s):
        q = q0(s)
        return q is not None and q.id in answers and gate.grade(q, answers[q.id])

    # --- binary search over the topological order (1 scan probe per visited node) ---
    lo, hi, frontier = 0, len(ordered) - 1, len(ordered)
    while lo <= hi:
        mid = (lo + hi) // 2
        s = ordered[mid]
        if not scan_answered(s):
            return ("question", q0(s), s)        # ask the scan probe
        if scan_pass(s):
            lo = mid + 1                          # PASS → climb
        else:
            frontier = mid                        # FAIL → this is a frontier candidate; descend
            hi = mid - 1

    if frontier >= len(ordered):
        return ("placement", ordered[-1])         # passed every scan → ceiling (fluency)

    fnode = ordered[frontier]
    qc = q1(fnode)
    if qc is not None and qc.id not in answers:
        return ("question", qc, fnode)            # the 2nd probe — confirm the frontier

    # compressed understanding gate on the frontier's two probes
    correct = [q for q in probes[fnode.id] if q.id in answers and gate.grade(q, answers[q.id])]
    if gate.families_total(db, fnode.id) >= 2:
        passed = len({q.family for q in correct if q.family is not None}) >= gate.FAMILIES_REQUIRED
    else:
        passed = len({q.id for q in correct}) >= gate.GENERALIZATION_REQUIRED
    if passed and frontier + 1 < len(ordered):
        return ("placement", ordered[frontier + 1])   # frontier actually known → start just above
    return ("placement", fnode)


def record_placement(db: Session, student_id: int, frontier: Skill | None) -> None:
    """Persist the start pointer WITHOUT granting mastery: mark the frontier's lock-
    ancestors (its foundation) `placed`. Never the frontier itself (the child must learn
    it), never downgrade a real understood/mastered node. Re-running the diagnostic clears
    the previous `placed` rows first."""
    for sm in db.execute(
        select(SkillMastery).where(
            SkillMastery.student_id == student_id, SkillMastery.status == "placed"
        )
    ).scalars().all():
        db.delete(sm)
    db.flush()
    if frontier is None:
        db.commit()
        return
    # transitive lock-ancestors (same-grade chain) of the frontier = the assumed foundation
    seen, stack = set(), [frontier.id]
    while stack:
        cur = stack.pop()
        for p in gate.lock_prerequisites(db, cur):
            if p not in seen:
                seen.add(p)
                stack.append(p)
    for sid in seen:
        sm = db.get(SkillMastery, (student_id, sid))
        if sm is None:
            db.add(SkillMastery(student_id=student_id, skill_id=sid,
                                status="placed", understood_answer_id=0))
        elif sm.status == "in_progress":
            sm.status = "placed"                  # never overwrite understood/mastered
    db.commit()
