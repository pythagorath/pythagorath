"""The LIVE-GENERATION layer (phase 0 of the live-variation conversion).

Architecture (owner-ratified): a GENERATION layer on top of an untouched LEARNING
layer. Generators are runtime functions registered per (skill_code, family); the
serving endpoint draws a family-balanced batch, persists each draw as a
``QuestionInstance`` (server-held answer → guaranteed grading, auditable trail),
and the child answers by instance id. Nodes with NO registered generator keep
serving their fixed template rows exactly as before — the DUAL MODE that lets the
conversion proceed node-by-node while the platform stays live.

Guarantees carried by THIS layer (each enforced in tests):
- answer correctness: the generator computes the answer from its own sampled
  params (one arithmetic path), and every registered generator has an INDEPENDENT
  verifier run over hundreds of samples in the test suite;
- range guards: caps/floors live in the PARAM SPACE (``Question.generator`` JSON —
  admin-tunable via PATCH, no code release), and stay externally asserted in tests;
- family balance: the batch is drawn round-robin across the node's families, so
  the understanding gate's two-family requirement keeps its feed;
- the two dimensions: path/paywall checks run BEFORE any generation (in main.py);
- no memorisable sequence: the draw avoids the student's recently-issued
  signatures, and option lists are shuffled by the generators themselves.
"""
from __future__ import annotations

import inspect
import random
from typing import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Question, QuestionInstance, Skill

# A generator: (rng, params) -> (prompt, answer, visual). It MAY declare an optional THIRD
# parameter — a READ-ONLY mastery context {status, understood, mastered} — to ramp difficulty
# by the child's progress. draw_batch passes that context ONLY to 3-arg generators; the many
# 2-arg generators are called exactly as before (full backward compatibility).
GenFn = Callable[..., tuple[str, str, dict | None]]


def _invoke(fn, rng, p, ctx):
    """Call a generator, handing it the read-only mastery `ctx` only if it OPTS IN by declaring a
    parameter literally named ``ctx``. Arity alone is unsafe — many generators curry via a
    defaulted third param (e.g. ``def gen(rng, p, make=make)``), so matching the NAME avoids
    clobbering those. Pure dispatch — NO student state is ever written here."""
    try:
        wants_ctx = "ctx" in inspect.signature(fn).parameters
    except (TypeError, ValueError):
        wants_ctx = False
    return fn(rng, p, ctx=ctx) if wants_ctx else fn(rng, p)

# skill_code -> family -> generator
REGISTRY: dict[str, dict[str, GenFn]] = {}


def register(skill_code: str, family: str):
    """Decorator: register a runtime generator for one (node, family)."""
    def deco(fn: GenFn) -> GenFn:
        REGISTRY.setdefault(skill_code, {})[family] = fn
        return fn
    return deco


def has_generators(skill_code: str) -> bool:
    return bool(REGISTRY.get(skill_code))


def _params_by_family(db: Session, skill_id: int) -> dict[str, dict]:
    """The param space comes from the node's PUBLISHED template rows (the
    ``generator`` JSON column) — one merged dict per family, admin-tunable."""
    rows = db.execute(
        select(Question.family, Question.generator)
        .where(Question.skill_id == skill_id, Question.status == "published",
               Question.generator.is_not(None))
    ).all()
    out: dict[str, dict] = {}
    for family, gen in rows:
        if gen and isinstance(gen, dict):
            out.setdefault(family or "", {}).update(gen.get("params", {}))
    return out


# ---- recent-repeat avoidance (tracking only — never touches grading/mastery) ----
# How many of the child's most-recent draws to steer away from. 28 ≈ three-and-a-half
# 8-question runs, so a sitting of a few short practices stays fresh — clearly better than
# the old 10 (~1.25 runs). Going higher gives little: the medium nodes' own space (~25–40)
# becomes the binding limit, not the window, and the lookback query grows.
_AVOID_WINDOW = 28
# Hard cap on resamples per draw — THE infinite-loop guard. Work stays bounded at
# ≤ _MAX_RESAMPLE generator calls per draw regardless of the window or a node's space.
_MAX_RESAMPLE = 8


def _recent_signatures(db: Session, student_id: int, skill_id: int,
                       n: int = _AVOID_WINDOW) -> set[str]:
    rows = db.execute(
        select(QuestionInstance.prompt, QuestionInstance.answer)
        .join(Question, QuestionInstance.question_id == Question.id)
        .where(QuestionInstance.student_id == student_id, Question.skill_id == skill_id)
        .order_by(QuestionInstance.id.desc()).limit(n)
    ).all()
    return {p + "" + a for p, a in rows}


def draw_batch(db: Session, skill: Skill, student_id: int,
               total: int = 8, rng: random.Random | None = None) -> list[QuestionInstance]:
    """Generate a family-balanced batch of live instances for one child.

    Round-robin across the node's registered families (the understanding gate's
    feed), template chosen per family (the Answer log keys instances to it), and
    the child's recent signatures are avoided so a short practice run never sees
    a repeat it could memorise. Instances are flushed (ids assigned), not committed
    — the caller's transaction owns the commit."""
    rng = rng or random.Random()
    gens = REGISTRY.get(skill.code, {})
    if not gens:
        return []
    # ALL published templates per family — the Answer-log anchors. Instances ROTATE across
    # them (round-robin) so a family's draws don't all key to ONE template: the understanding
    # gate counts DISTINCT answered question_ids, so single-family nodes can now reach the
    # 2-distinct threshold (they were stuck at 1, never understood/mastered). Multi-family is
    # unaffected — its gate counts distinct FAMILIES, and `family` below is unchanged.
    templates_by_fam: dict[str, list[Question]] = {}
    for fam in gens:
        ts = db.execute(
            select(Question)
            .where(Question.skill_id == skill.id, Question.status == "published",
                   Question.family == fam)
            .order_by(Question.id)
        ).scalars().all()
        if ts:
            templates_by_fam[fam] = ts
    families = [f for f in gens if f in templates_by_fam]
    if not families:
        return []
    params = _params_by_family(db, skill.id)
    avoid = _recent_signatures(db, student_id, skill.id, _AVOID_WINDOW)
    # READ-ONLY mastery snapshot for this (child, skill) — handed to generators that opt in
    # (3-arg) so they can ramp difficulty by the child's progress. read_snapshot NEVER writes
    # (no recompute, no status change): the gate/heart is untouched; generation only READS the
    # ladder. New/never-seen child → status "in_progress" (the scaffolded start).
    from app import gate                            # local import — no module-load cycle
    _snap = gate.read_snapshot(db, student_id, skill.id)
    ctx = {"status": _snap.get("status", "in_progress"),
           "understood": bool(_snap.get("understood")),
           "mastered": bool(_snap.get("mastered"))}
    out: list[QuestionInstance] = []
    rot: dict[str, int] = {}                      # per-family round-robin over its templates
    fam_cycle = (families * ((total // len(families)) + 1))[:total]
    for fam in fam_cycle:
        fn = gens[fam]
        p = params.get(fam, {})
        prompt, answer, visual = _invoke(fn, rng, p, ctx)
        sig = prompt + "" + answer
        if sig in avoid:
            # Resample for a fresh draw, bounded TWO ways so a node whose space is smaller
            # than the window can never spin: (1) the hard _MAX_RESAMPLE cap, and (2) a
            # self-collision exit — once the generator re-emits a draw already seen THIS
            # turn its space is exhausted, so we stop and ACCEPT the inevitable repeat
            # (least harm). Effective window is thus min(_AVOID_WINDOW, node space), free.
            tried = {sig}
            for _ in range(_MAX_RESAMPLE):
                prompt, answer, visual = _invoke(fn, rng, p, ctx)
                sig = prompt + "" + answer
                if sig not in avoid:
                    break                        # fresh draw found
                if sig in tried:
                    break                        # space exhausted → accept the repeat
                tried.add(sig)
        avoid.add(sig)
        tmpls = templates_by_fam[fam]
        anchor = tmpls[rot.get(fam, 0) % len(tmpls)]   # rotate the anchor within THIS family
        rot[fam] = rot.get(fam, 0) + 1
        inst = QuestionInstance(
            question_id=anchor.id, student_id=student_id,
            family=fam, prompt=prompt, answer=answer, visual=visual,
        )
        db.add(inst)
        out.append(inst)
    db.flush()                                   # ids assigned; caller commits
    return out
