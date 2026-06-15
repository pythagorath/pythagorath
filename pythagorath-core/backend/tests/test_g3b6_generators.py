"""G3 batch 6 — born-live generators, independently verified from birth.

The Euclidean checker is the heart: every quotrem answer must satisfy
q×d + r = n AND 0 ≤ r < d (the canonical pair — the distractor deliberately
violates r < d, the exact misconception). Registry grows 123 → 127 and the
whole-inventory pin enforces «no node ships without a guarded generator».
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g3b6, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def v_mul10(pr, ans, vis):
    ns = _nums(pr)
    k = ns[0]
    # assoc: «k × d0 = ...» (the multiple is the SECOND numeral);
    # shortcut: «k × d = kd — ... k × d0 = ؟» (the multiple is the LAST)
    tens = ns[1] if ns[1] % 10 == 0 else ns[-1]
    return tens % 10 == 0 and 20 <= tens <= 90 and _n1(ans) == k * tens


def v_mulbig_algorithm(pr, ans, vis):
    n, k = _nums(pr)[:2]
    return _n1(ans) == n * k and (n % 10) * k >= 10        # renaming is REAL


def v_mulbig_decompose(pr, ans, vis):
    ns = _nums(pr)
    k, n = ns[0], ns[1]
    return _n1(ans) == k * n and (n % 10) * k >= 10


def v_mulbig_hundreds(pr, ans, vis):
    k, h = _nums(pr)[:2]
    return h % 100 == 0 and _n1(ans) == k * h


def v_ordops_apply(pr, ans, vis):
    ns = _nums(pr)
    if pr.index("×") < pr.index("+") if "+" in pr else True:
        pass
    t = pr.translate(_W)
    m = re.match(r"(\d+) × (\d+) ([+−]) (\d+)", t)
    if m:
        a, b, op, c = int(m.group(1)), int(m.group(2)), m.group(3), int(m.group(4))
        want = a * b + c if op == "+" else a * b - c
        return _n1(ans) == want
    m = re.match(r"(\d+) \+ (\d+) × (\d+)", t)
    c, a, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return _n1(ans) == c + a * b


def v_ordops_justify(pr, ans, vis):
    if "أيصحُّ" in pr:
        # the claimed add-first value must really be WRONG
        t = pr.translate(_W)
        a, b, c, claimed = [int(x) for x in re.findall(r"\d+", t)][:4]
        return ans == "لا" and claimed != a * b + c
    return ans == "الضرب"


def v_divrem_quotrem(pr, ans, vis):
    n, d = _nums(pr)[:2]
    q, r = _nums(ans)[:2]
    others = [o["v"] for o in vis["options"] if o["v"] != ans]
    def canonical(s):
        qq, rr = _nums(s)[:2]
        return qq * d + rr == n and 0 <= rr < d
    return canonical(ans) and all(not canonical(o) for o in others)


def v_divrem_reason(pr, ans, vis):
    ns = _nums(pr)
    if "أكبرُ باقٍ" in pr:
        return _n1(ans) == ns[0] - 1
    if "أيُّ القسمتين" in pr:
        an, ad = _nums(ans)[:2]
        others = [o["v"] for o in vis["options"] if o["v"] != ans]
        on, od = _nums(others[0])[:2]
        return an % ad != 0 and on % od == 0
    n, d, r = ns[0], ns[1], ns[2]
    return n % d == r and ans.startswith("لأنّ")


def v_divrem_rename(pr, ans, vis):
    n, d = _nums(pr)[:2]
    return n % d == 0 and _n1(ans) == n // d and (n // 10) % d != 0


VERIFIERS = {
    ("g3MUL10", "assoc"): v_mul10, ("g3MUL10", "shortcut"): v_mul10,
    ("g3MULBIG", "algorithm"): v_mulbig_algorithm,
    ("g3MULBIG", "decompose"): v_mulbig_decompose,
    ("g3MULBIG", "hundreds"): v_mulbig_hundreds,
    ("g3ORDOPS", "apply"): v_ordops_apply, ("g3ORDOPS", "justify"): v_ordops_justify,
    ("g3DIVREM", "quotrem"): v_divrem_quotrem, ("g3DIVREM", "reason"): v_divrem_reason,
    ("g3DIVREM", "rename"): v_divrem_rename,
}

CAPS = {"g3MUL10": 900, "g3MULBIG": 9000, "g3ORDOPS": 100, "g3DIVREM": 99}
FLOORS = {"g3MUL10": 40, "g3MULBIG": 40, "g3ORDOPS": 35, "g3DIVREM": 35}


def test_batch6_registered():
    # the dynamic whole-inventory pin lives in test_m3 (registry == published
    # skills); here we assert OUR four are present with their family sets
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
            blob = pr + " " + ans + " " + (json.dumps(vis, ensure_ascii=False) if vis else "")
            over = [n for n in _nums(blob) if n > CAPS[code]]
            assert not over, (code, family, pr, over)


def test_tier_floors_real_work():
    # the tiers genuinely use their scope (>100 products)
    rng = random.Random(3)
    for code in ("g3MUL10", "g3MULBIG"):
        seen = False
        fams = list(generators.REGISTRY[code])
        for i in range(60):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            if _n1(ans) > 100:
                seen = True
        assert seen, code


def test_remainder_canonical_by_construction():
    rng = random.Random(11)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g3DIVREM"]["quotrem"](rng, {})
        n, d = _nums(pr)[:2]
        q, r = _nums(ans)[:2]
        assert q * d + r == n and 0 <= r < d


def test_options_order_is_shuffled():
    rng = random.Random(7)
    for (code, family), _ in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            if vis and vis.get("kind") == "shape-pick":
                positions.add(next(i for i, o in enumerate(vis["options"]) if o["v"] == ans))
        if positions:
            assert len(positions) >= 2, (code, family)


def test_variation_guard_batch6():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
