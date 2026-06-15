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

import random
from typing import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Question, QuestionInstance, Skill

# (prompt, answer, visual) produced from a seeded rng and the template's params
GenFn = Callable[[random.Random, dict], tuple[str, str, dict | None]]

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


def _recent_signatures(db: Session, student_id: int, skill_id: int, n: int = 10) -> set[str]:
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
    # one representative published template per family — the Answer-log anchor
    templates: dict[str, Question] = {}
    for fam in gens:
        t = db.execute(
            select(Question)
            .where(Question.skill_id == skill.id, Question.status == "published",
                   Question.family == fam)
            .order_by(Question.id).limit(1)
        ).scalars().first()
        if t is not None:
            templates[fam] = t
    families = [f for f in gens if f in templates]
    if not families:
        return []
    params = _params_by_family(db, skill.id)
    avoid = _recent_signatures(db, student_id, skill.id)
    out: list[QuestionInstance] = []
    fam_cycle = (families * ((total // len(families)) + 1))[:total]
    for fam in fam_cycle:
        fn = gens[fam]
        p = params.get(fam, {})
        prompt, answer, visual = fn(rng, p)
        for _ in range(8):                       # resample away from recent repeats
            sig = prompt + "" + answer
            if sig not in avoid:
                break
            prompt, answer, visual = fn(rng, p)
        avoid.add(prompt + "" + answer)
        inst = QuestionInstance(
            question_id=templates[fam].id, student_id=student_id,
            family=fam, prompt=prompt, answer=answer, visual=visual,
        )
        db.add(inst)
        out.append(inst)
    db.flush()                                   # ids assigned; caller commits
    return out
