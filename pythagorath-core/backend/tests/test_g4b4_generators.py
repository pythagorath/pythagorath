"""G4 batch 4 — born-live fraction generators, independently verified from birth.

The maths is re-derived: cross-multiplication for equivalence (a/b = c/d ⇔ ad = bc),
common-denominator VALUE plus lowest-terms (gcd = 1) for every add/sub, and ka/n for
multiplication. All denominators stay ≤ 12. Registry grows 160 → 165.
"""
import json
import re
import random
from math import gcd

from sqlalchemy import select

from app import gencontent_g4b4, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _n1(t):
    return int(re.search(r"\d+", str(t).translate(_W))[0])


def _fracs(pr):
    return [(int(a), int(b)) for a, b in re.findall(r"(\d+)/(\d+)", str(pr).translate(_W))]


def parse_frac(s):
    """'w و a/n' | 'k/n' | 'k'  →  (num, den)."""
    s = str(s)
    whole, rest = 0, s
    if "و" in s:                                # split the mixed whole on the original «و»
        wp, rest = s.split("و", 1)
        whole = int(wp.translate(_W).strip())
    t = rest.translate(_W).strip()
    if "/" in t:
        a, b = t.split("/")
        return whole * int(b) + int(a), int(b)
    return int(t), 1


def _val_eq(p, q):
    return p[0] * q[1] == q[0] * p[1]


def _lowest(s):
    num, den = parse_frac(s)
    return gcd(num, den) == 1


# ---------- represent ----------

def v_represent(pr, ans, vis):
    return parse_frac(ans) == (vis["shaded"], vis["parts"]) \
        and any(o == ans for o in vis["options"])


def v_numline(pr, ans, vis):
    num, den = parse_frac(ans)
    return den == vis["den"] and 1 <= num <= vis["den"] * vis["maxWhole"]


def v_mixed(pr, ans, vis):
    t = pr.translate(_W)
    m = re.search(r"(\d+)\s*و\s*(\d+)/(\d+)", t)
    src = (int(m[1]) * int(m[3]) + int(m[2]), int(m[3])) if m else _fracs(pr)[0]
    return _val_eq(parse_frac(ans), src) and vis is None


# ---------- equivalence / comparison ----------

def v_equiv(pr, ans, vis):
    a, b = _fracs(pr)[0]
    if "؟/" in pr:                              # a/b = ?/d
        d = int(re.search(r"؟/(\d+)", pr.translate(_W))[1])
        c = _n1(ans)
    else:                                       # a/b = c/?
        c = int(re.search(r"=\s*(\d+)/؟", pr.translate(_W))[1])
        d = _n1(ans)
    return a * d == c * b


def v_rulecmp(pr, ans, vis):
    f1, f2 = _fracs(pr)[:2]
    bigger = f1 if f1[0] * f2[1] > f2[0] * f1[1] else f2
    return _val_eq(parse_frac(ans), bigger)


def v_benchmark(pr, ans, vis):
    num, den = parse_frac(ans)
    return (2 * num > den) if "أكبر" in pr else (2 * num < den)


# ---------- operations (value + lowest terms) ----------

def _op_check(pr, ans, num, den):
    return _val_eq(parse_frac(ans), (num, den)) and _lowest(ans)


def v_add_like(pr, ans, vis):
    (a, n), (b, _) = _fracs(pr)[:2]
    return _op_check(pr, ans, a + b, n)


def v_sub_like(pr, ans, vis):
    (a, n), (b, _) = _fracs(pr)[:2]
    return _op_check(pr, ans, a - b, n)


def v_mixedwhole(pr, ans, vis):
    w = int(re.search(r"(\d+)\s*\+", pr.translate(_W))[1])
    a, n = _fracs(pr)[0]
    return _val_eq(parse_frac(ans), (w * n + a, n))


def v_add_unlike(pr, ans, vis):
    (a, m), (b, n) = _fracs(pr)[:2]
    return _op_check(pr, ans, a * n + b * m, m * n)


def v_sub_unlike(pr, ans, vis):
    (a, m), (b, n) = _fracs(pr)[:2]
    return _op_check(pr, ans, a * n - b * m, m * n)


def v_unitmultiple(pr, ans, vis):
    k, n = _fracs(pr)[0]
    return _n1(ans) == k


def v_times(pr, ans, vis):
    k = _n1(pr)
    a, n = _fracs(pr)[0]
    return _op_check(pr, ans, k * a, n)


VERIFIERS = {
    ("g4FRAC", "represent"): v_represent, ("g4FRAC", "numline"): v_numline,
    ("g4FRAC", "mixed"): v_mixed,
    ("g4FREQ", "equiv"): v_equiv, ("g4FREQ", "rulecmp"): v_rulecmp,
    ("g4FREQ", "benchmark"): v_benchmark,
    ("g4FRADD", "add"): v_add_like, ("g4FRADD", "subtract"): v_sub_like,
    ("g4FRADD", "mixedwhole"): v_mixedwhole,
    ("g4FRADDX", "add"): v_add_unlike, ("g4FRADDX", "subtract"): v_sub_unlike,
    ("g4FRMUL", "unitmultiple"): v_unitmultiple, ("g4FRMUL", "times"): v_times,
}

CODES = ("g4FRAC", "g4FREQ", "g4FRADD", "g4FRADDX", "g4FRMUL")
FLOORS = {c: 30 for c in CODES}


def _max_den(blob):
    return max((int(b) for _, b in re.findall(r"(\d+)/(\d+)", blob.translate(_W))), default=1)


def test_batch_registered():
    for code in CODES:
        assert code in generators.REGISTRY


def test_families_match_templates_exactly(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl = set(db.execute(select(Question.family).where(
            Question.skill_id == skill.id, Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl, code


def test_500_samples_verified_and_den_capped():
    rng = random.Random(2026)
    for (code, family), check in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        for _ in range(500):
            pr, ans, vis = gen(rng, {})
            assert check(pr, ans, vis), (code, family, pr, ans, vis)
            blob = pr + " " + ans + (" " + json.dumps(vis, ensure_ascii=False) if vis else "")
            assert _max_den(blob) <= 12, (code, family, pr)        # the ≤12 range law


def test_seeded_templates_pass_verifiers(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_operation_answers_are_lowest_terms():
    rng = random.Random(7)
    for code, fams in (("g4FRADD", ("add", "subtract")),
                       ("g4FRADDX", ("add", "subtract")), ("g4FRMUL", ("times",))):
        for fam in fams:
            for _ in range(300):
                pr, ans, vis = generators.REGISTRY[code][fam](rng, {})
                num, den = parse_frac(ans)
                assert gcd(num, den) == 1, (code, fam, ans)


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
