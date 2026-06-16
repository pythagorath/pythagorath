"""The personal learning path: given a child's current mastery state, pick the ONE next
skill to study — and WHY. A pure read of the engine (lock + mastery + the unified DAG);
it writes nothing and never touches recompute.

Priority (owner-ratified):
  1. REMEDIATION — if the child is STRUGGLING at a started node and a cross-grade (or
     within-grade) FOUNDATION below it is not solid, descend to the NEAREST workable gap.
  2. CONTINUE — finish a node already started (understanding or fluency in progress).
  3. NEW — the next frontier: the lowest unlocked, not-started, not-placed, not-mastered node.
  4. REVIEW — a mastered node whose spaced-review is due.
  5. DONE — everything mastered, nothing due.

Invariants honored: only UNLOCKED nodes are ever offered (no progression before the
same-grade prerequisites are mastered/placed); the main path is grade ∩ country
(all-owners); remediation descends the documented cross-grade edges. `placed` (the
diagnostic start marker) is NOT "solid" (it's an estimate) — so it can be a remediation
target, and it is excluded from CONTINUE/NEW (the child starts AT the frontier, never sent
back to assumed foundation)."""
from collections import deque

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import gate
from app.models import Answer, Question, SkillMastery

# Tunable — how many attempts on a not-yet-understood node count as "struggling" and
# trigger a remedial descent. Deliberately a plain module constant so it is trivial to
# re-tune with real children (NOT sacred; calibrate by experiment).
STRUGGLE_THRESHOLD = 5

_SOLID = ("understood", "mastered")


def _status(db: Session, student_id: int, skill_id: int) -> str:
    sm = db.get(SkillMastery, (student_id, skill_id))
    return sm.status if sm else "in_progress"


def _attempts(db: Session, student_id: int, skill_id: int) -> int:
    return db.execute(
        select(func.count(Answer.id))
        .join(Question, Answer.question_id == Question.id)
        .where(Answer.student_id == student_id, Question.skill_id == skill_id)
    ).scalar_one()


def _remediation_target(db: Session, student_id: int, skill_id: int):
    """The NEAREST not-solid, UNLOCKED ancestor (cross-grade or within-grade) of a struggling
    node — the foundation gap the child can actually work on now. BFS up the full prereq DAG:
    a SOLID ancestor is pruned (its foundation is fine); a not-solid but LOCKED ancestor is
    expanded (descend deeper to the workable root); the first not-solid UNLOCKED ancestor
    (nearest, the doctor's 'treat the closest first') is returned. None → no foundation gap."""
    seen, dq = {skill_id}, deque([skill_id])
    while dq:
        cur = dq.popleft()
        for p in gate.prerequisites(db, cur):
            if p in seen:
                continue
            seen.add(p)
            if _status(db, student_id, p) in _SOLID:
                continue                                   # solid foundation — prune
            if gate.is_unlocked(db, student_id, p):
                return p                                    # nearest workable gap (BFS order)
            dq.append(p)                                    # locked → look below it
    return None


def next_skill(db: Session, student, path_skills: list) -> dict:
    """Return {reason, skill_id, remediating_for} for the child's next study target.
    `path_skills` is the child's grade ∩ country path (caller scopes it)."""
    ordered = sorted(path_skills, key=lambda s: (s.order, s.id))
    sid = student.id
    st = {s.id: _status(db, sid, s.id) for s in ordered}
    unlocked = {s.id: gate.is_unlocked(db, sid, s.id) for s in ordered}

    def started(s):           # has real work begun on it (not a placement assumption)
        return st[s.id] == "understood" or (st[s.id] == "in_progress" and _attempts(db, sid, s.id) > 0)

    # 1 — REMEDIATION: a struggling started node with a workable foundation gap below it
    for s in ordered:
        if (unlocked[s.id] and st[s.id] == "in_progress"
                and _attempts(db, sid, s.id) >= STRUGGLE_THRESHOLD):
            target = _remediation_target(db, sid, s.id)
            if target is not None:
                return {"reason": "remediation", "skill_id": target, "remediating_for": s.id}

    # 2 — CONTINUE: finish a node already started (understanding/fluency in progress)
    for s in ordered:
        if unlocked[s.id] and st[s.id] != "mastered" and started(s):
            return {"reason": "continue", "skill_id": s.id, "remediating_for": None}

    # 3 — NEW: the next frontier (unlocked, not started, not placed, not mastered)
    for s in ordered:
        if unlocked[s.id] and st[s.id] not in ("mastered", "placed") and not started(s):
            return {"reason": "new", "skill_id": s.id, "remediating_for": None}

    # 4 — REVIEW: a mastered node whose spaced review is due
    due = set(gate.due_for_review(db, sid, None))
    due_in_path = [s.id for s in ordered if s.id in due]
    if due_in_path:
        return {"reason": "review", "skill_id": due_in_path[0], "remediating_for": None}

    # 5 — DONE
    return {"reason": "done", "skill_id": None, "remediating_for": None}
