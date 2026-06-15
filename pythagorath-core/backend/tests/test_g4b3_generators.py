"""G4 batch 3 — born-live generators, independently verified from birth.

The Euclidean checker is the heart of both division nodes: every «q والباقي r» must
satisfy q×b + r = n AND 0 ≤ r < b, and the distractor deliberately violates r < b
(the exact misconception). Multiplication is re-derived as a×b; estimation as a
compatible quotient (|q·b − n| ≤ b/2). Registry grows 157 → 160.
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g4b3, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def v_mul(pr, ans, vis):
    a, b = _nums(pr)[:2]
    return _n1(ans) == a * b and vis is None


def _euclid(pr, ans, vis):
    n, b = _nums(pr)[:2]
    q, r = _nums(ans)[:2]
    others = [o["v"] for o in vis["options"] if o["v"] != ans]

    def canonical(s):
        qq, rr = _nums(s)[:2]
        return qq * b + rr == n and 0 <= rr < b
    return canonical(ans) and all(not canonical(o) for o in others)


def v_div_multiples10(pr, ans, vis):
    n, b = _nums(pr)[:2]
    return n % b == 0 and _n1(ans) == n // b and vis is None


def v_div_estimate(pr, ans, vis):
    n, b = _nums(pr)[:2]
    return 2 * abs(_n1(ans) * b - n) <= b and vis is None


def v_halving(pr, ans, vis):
    n, b = _nums(pr)[:2]
    return n % b == 0 and _n1(ans) == n // b and vis is None


VERIFIERS = {
    ("g4MUL2", "multiples10"): v_mul, ("g4MUL2", "partial"): v_mul,
    ("g4MUL2", "algorithm"): v_mul,
    ("g4DIV1", "longdiv"): _euclid, ("g4DIV1", "multiples10"): v_div_multiples10,
    ("g4DIV1", "estimate"): v_div_estimate,
    ("g4DIV2", "remainder"): _euclid, ("g4DIV2", "halving"): v_halving,
}

CAPS = {"g4MUL2": 99999, "g4DIV1": 9999, "g4DIV2": 99}
FLOORS = {code: 35 for code in CAPS}


def test_batch_registered():
    for code in CAPS:
        assert code in generators.REGISTRY


def test_families_match_templates_exactly(db):
    for code in CAPS:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl = set(db.execute(select(Question.family).where(
            Question.skill_id == skill.id, Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl, code


def test_500_samples_verified_and_capped():
    rng = random.Random(2026)
    for (code, family), check in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        for _ in range(500):
            pr, ans, vis = gen(rng, {})
            assert check(pr, ans, vis), (code, family, pr, ans, vis)
            blob = pr + " " + ans + (" " + json.dumps(vis, ensure_ascii=False) if vis else "")
            over = [n for n in _nums(blob) if n > CAPS[code]]
            assert not over, (code, family, pr, over)


def test_seeded_templates_pass_verifiers(db):
    for code in CAPS:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_euclid_canonical_by_construction():
    # both division nodes: every served pair is the canonical (q, r); the distractor isn't
    rng = random.Random(11)
    for code in ("g4DIV1", "g4DIV2"):
        fam = "longdiv" if code == "g4DIV1" else "remainder"
        for _ in range(400):
            pr, ans, vis = generators.REGISTRY[code][fam](rng, {})
            n, b = _nums(pr)[:2]
            q, r = _nums(ans)[:2]
            assert q * b + r == n and 0 <= r < b, (code, pr, ans)


def test_oman_div2_stays_two_digit():
    rng = random.Random(5)
    for fam in generators.REGISTRY["g4DIV2"]:
        for _ in range(300):
            pr, ans, vis = generators.REGISTRY["g4DIV2"][fam](rng, {})
            blob = pr + " " + ans + (json.dumps(vis, ensure_ascii=False) if vis else "")
            assert all(n <= 99 for n in _nums(blob)), (fam, pr)


def test_mul2_reaches_two_by_two_digit():
    # the tier genuinely uses 2-digit × 2-digit (products well over the g3MULBIG ceiling)
    rng = random.Random(3)
    seen = False
    for _ in range(200):
        pr, ans, vis = generators.REGISTRY["g4MUL2"]["algorithm"](rng, {})
        a, b = _nums(pr)[:2]
        if a >= 10 and b >= 10:
            seen = True
    assert seen


def test_options_order_is_shuffled():
    rng = random.Random(7)
    for (code, family) in VERIFIERS:
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            if vis and vis.get("kind") == "shape-pick":
                positions.add(next(i for i, o in enumerate(vis["options"]) if o["v"] == ans))
        if positions:
            assert len(positions) >= 2, (code, family)


def test_variation_guard():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(60):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
