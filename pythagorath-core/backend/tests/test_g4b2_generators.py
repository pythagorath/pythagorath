"""G4 batch 2 — born-live generators, independently verified from birth.

The maths is re-derived independently: a±b for fluency, the algebraic identity for
each named property, round-then-operate for estimation, the product (with real
renaming) for ×1, divisibility for factors/multiples, and the two-factors test for
primality. Registry grows 150 → 157 (estimate became its own node) and the
whole-inventory pin (test_m3) enforces «no G4 node ships without a guarded generator».
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g4b2, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_REFS = {"مئة": 100, "ألف": 1000}


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def _half_up(n, ref):
    return (n + ref // 2) // ref * ref


def _is_prime(n):
    return n >= 2 and all(n % i for i in range(2, int(n ** 0.5) + 1))


# ---------- add / subtract ----------

def v_col(pr, ans, vis):
    a, b = _nums(pr)[:2]
    res = a - b if "اطرح" in pr or "−" in pr else a + b
    return _n1(ans) == res and vis is None


def v_mental(pr, ans, vis):
    ns = _nums(pr)
    a, b = ns[0], ns[1]
    res = a - b if "اطرح" in pr or "−" in pr else a + b
    return _n1(ans) == res


def v_partition(pr, ans, vis):
    a, b = _nums(pr)[:2]
    return _n1(ans) == (a - b if "اطرح" in pr else a + b)


# ---------- properties ----------

def v_property(pr, ans, vis):
    ns = _nums(pr)
    if "الإبدال" in pr:          # a + b = b + ? → a
        return _n1(ans) == ns[0] and ns[0] + ns[1] == ns[1] + ns[0]
    if "التجميع" in pr:         # (a+b)+c = a+(b+?) → c
        return _n1(ans) == ns[2]
    return ans == "٠"           # identity a + ? = a → 0


def v_relation(pr, ans, vis):
    ns = _nums(pr)
    if "إذا كان" in pr:         # a + b = c ⇒ c − x = (the other addend); ns=[a,b,c,c,x]
        a, b, c, x = ns[0], ns[1], ns[2], ns[4]
        return a + b == c and _n1(ans) == c - x
    b, a = ns[0], ns[1]          # ? − b = a ⇒ ? = a + b
    return _n1(ans) == a + b


# ---------- estimate / decide ----------

def v_estimate(pr, ans, vis):
    ref = next(r for k, r in _REFS.items() if f"أقرب {k}" in pr)
    a, b = _nums(pr)[:2]
    res = _half_up(a, ref) - _half_up(b, ref) if "−" in pr else _half_up(a, ref) + _half_up(b, ref)
    return _n1(ans) == res


def v_decision(pr, ans, vis):
    want = "يكفي التقدير" if ("يكفي" in pr or "تكفي" in pr) else "جوابٌ دقيق"
    opts = {o["v"] for o in vis["options"]}
    return ans == want and opts == {"يكفي التقدير", "جوابٌ دقيق"}


# ---------- multiplication ----------

def v_mul(pr, ans, vis):
    a, b = _nums(pr)[:2]
    if not (_n1(ans) == a * b):
        return False
    if "بإعادة التسمية" in pr:      # the renaming must be REAL (ones product carries)
        return (a % 10) * b >= 10 or (b % 10) * a >= 10
    return True


# ---------- factors / primes ----------

def v_factors(pr, ans, vis):
    n = _n1(pr)
    good = _n1(ans)
    others = [int(o["v"].translate(_W)) for o in vis["options"] if o["v"] != ans]
    return n % good == 0 and all(n % o != 0 for o in others)


def v_multiples(pr, ans, vis):
    k = _n1(pr)
    good = _n1(ans)
    others = [int(o["v"].translate(_W)) for o in vis["options"] if o["v"] != ans]
    return good % k == 0 and all(o % k != 0 for o in others)


def v_common(pr, ans, vis):
    a, b = _nums(pr)[:2]
    g = _n1(ans)
    others = [int(o["v"].translate(_W)) for o in vis["options"] if o["v"] != ans]
    return a % g == 0 and b % g == 0 and all(a % o or b % o for o in others)


def v_classify(pr, ans, vis):
    n = _n1(pr)
    return ans == ("عدد أولي" if _is_prime(n) else "عدد غير أولي")


def v_definition(pr, ans, vis):
    good = _n1(ans)
    others = [int(o["v"].translate(_W)) for o in vis["options"] if o["v"] != ans]
    return _is_prime(good) and all(not _is_prime(o) for o in others)


VERIFIERS = {
    ("g4ADDSUB", "algorithm"): v_col, ("g4ADDSUB", "mental"): v_mental,
    ("g4ADD4", "algorithm"): v_col, ("g4ADD4", "partition"): v_partition,
    ("g4PROPS", "property"): v_property, ("g4PROPS", "relation"): v_relation,
    ("g4EST", "estimate"): v_estimate, ("g4EST", "decision"): v_decision,
    ("g4MUL1", "multiples10"): v_mul, ("g4MUL1", "distributive"): v_mul,
    ("g4MUL1", "algorithm"): v_mul,
    ("g4FACT", "factors"): v_factors, ("g4FACT", "multiples"): v_multiples,
    ("g4FACT", "common"): v_common,
    ("g4PRIME", "classify"): v_classify, ("g4PRIME", "definition"): v_definition,
}

CAPS = {"g4ADDSUB": 9999999, "g4ADD4": 9999, "g4PROPS": 9999, "g4EST": 99999,
        "g4MUL1": 9999, "g4FACT": 144, "g4PRIME": 100}
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
    # authoring guard: every published G4-b2 template must satisfy its family verifier
    for code in CAPS:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_oman_add4_stays_four_digit():
    rng = random.Random(5)
    for fam in generators.REGISTRY["g4ADD4"]:
        for _ in range(300):
            pr, ans, vis = generators.REGISTRY["g4ADD4"][fam](rng, {})
            assert all(n <= 9999 for n in _nums(pr + " " + ans)), (fam, pr)


def test_primes_are_actually_prime():
    rng = random.Random(7)
    for _ in range(300):
        pr, ans, vis = generators.REGISTRY["g4PRIME"]["definition"](rng, {})
        assert _is_prime(_n1(ans))


def test_options_order_is_shuffled():
    rng = random.Random(11)
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
