"""G3 batch 7 — fractions, born live, independently verified.

The equivalence verifier is CROSS-MULTIPLICATION (a/b = c/d ⇔ a·d = b·c); the
take verifier divides (k/d of m = m÷d×k, divisibility forced by construction);
the decimal verifier converts independently (k/10 ⇔ ٠٫k, k/100 ⇔ two places).
Denominator laws: regions ≤ 8, sets ≤ 10 (KW verbatim), line values ≤ 2.
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g3b7, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _frac(s):
    """parse «k/n» (Hindi) → (k, n)"""
    a = _nums(s)
    return a[0], a[1]


def v_frac_name(pr, ans, vis):
    return ans == f"{_h(vis['shaded'])}/{_h(vis['parts'])}" and ans in vis["options"] \
        and vis["parts"] <= 8


def v_frac_shade(pr, ans, vis):
    return ans == f"{_h(vis['target'])}/{_h(vis['parts'])}" and vis["parts"] <= 8


def _h(n):
    return str(n).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


def v_frac_whole(pr, ans, vis):
    ns = _nums(pr)
    k, n = ns[-2], ns[-1]                            # the fraction is the LAST pair
    return _nums(ans)[0] == n and n <= 8


def v_frline(pr, ans, vis):
    k, n = _frac(pr)
    assert vis["den"] == n
    if "أكبر من ١" in pr or k > n:
        return ans == f"{_h(k)}/{_h(n)}" and n < k < 2 * n and vis["maxWhole"] >= 2
    return ans == f"{_h(k)}/{_h(n)}" and 0 < k < n


def v_freq_equiv(pr, ans, vis):
    if vis:                                          # twin models: shaded ratios equal
        a, b = vis["a"], vis["b"]
        return a["shaded"] * b["parts"] == b["shaded"] * a["parts"] \
            and ans == f"{_h(b['shaded'])}/{_h(b['parts'])}"
    # text: «a/b = ؟/d» or «a/b = c/؟» — cross-multiply with the answer slotted in
    ns = _nums(pr)
    a, b = ns[0], ns[1]
    x = _nums(ans)[0]
    if "؟/" in pr:
        d = ns[2]
        return a * d == b * x
    c = ns[2]
    return a * x == b * c


def v_freq_rulecmp(pr, ans, vis):
    a, b = vis["a"], vis["b"]
    va = a["shaded"] / a["parts"]
    vb = b["shaded"] / b["parts"]
    big = a if va > vb else b
    return va != vb and ans == f"{_h(big['shaded'])}/{_h(big['parts'])}"


def v_freq_benchmark(pr, ans, vis):
    k, n = _frac(ans)
    if "أكبر" in pr:
        return 2 * k > n
    return 2 * k < n


def v_frset3_express(pr, ans, vis):
    n, k = _nums(pr)[:2]
    return ans == f"{_h(k)}/{_h(n)}" and n <= 10 and 0 < k < n


def v_frset3_take(pr, ans, vis):
    k, d, total = _nums(pr)[:3]
    return total % d == 0 and total <= 10 and _nums(ans)[0] == total // d * k and k <= d


def v_dec_grid(pr, ans, vis):
    cells = (vis.get("rows", 1)) * vis["cols"]
    k = vis["shaded"]
    digits = _nums(ans)
    val = digits[-1] if len(digits) > 1 or True else digits[0]
    # the decimal's digits, read after «٠٫», must equal k over the grid size
    frac_digits = str(ans).translate(_W).split(".")[-1].split("٫")[-1]
    frac_digits = re.sub(r"\D", "", str(ans).translate(_W))[1:]  # drop the leading 0
    got = int(frac_digits) if frac_digits else -1
    if cells == 10:
        return got == k and 1 <= k <= 9
    return got == k and 1 <= k <= 99 and ans in vis["options"]


def v_dec_convert(pr, ans, vis):
    t = str(pr).translate(_W)
    if "بالصورة العشرية" in pr:
        k, d = _frac(pr)
        digits = re.sub(r"\D", "", str(ans).translate(_W))[1:]
        if d == 10:
            return int(digits) == k and 1 <= k <= 9
        return int(digits) == k and d == 100
    if "كسراً اعتيادياً" in pr:
        k = _nums(pr)[1] if _nums(pr)[0] == 0 else _nums(pr)[0]
        ak, ad = _frac(ans)
        return ak == k and ad == 100
    k, ten, other, hundred = _nums(pr)[:4]
    return ans == ("نعم" if other == 10 * k else "لا")


VERIFIERS = {
    ("g3FRAC", "name"): v_frac_name, ("g3FRAC", "shade"): v_frac_shade,
    ("g3FRAC", "whole"): v_frac_whole,
    ("g3FRLINE", "below"): v_frline, ("g3FRLINE", "above"): v_frline,
    ("g3FREQ", "equiv"): v_freq_equiv, ("g3FREQ", "rulecmp"): v_freq_rulecmp,
    ("g3FREQ", "benchmark"): v_freq_benchmark,
    ("g3FRSET3", "express"): v_frset3_express, ("g3FRSET3", "take"): v_frset3_take,
    ("g3DEC", "grid"): v_dec_grid, ("g3DEC", "convert"): v_dec_convert,
}

CAPS = {"g3FRAC": 8, "g3FRLINE": 16, "g3FREQ": 16, "g3FRSET3": 10, "g3DEC": 100}
FLOORS = {"g3DEC": 30, "g3FRAC": 26, "g3FREQ": 30, "g3FRLINE": 24, "g3FRSET3": 30}   # FRLINE raised (phase-1 enrichment)


def test_batch7_registered():
    # the dynamic whole-inventory pin lives in test_m3 (registry == published
    # skills); here we assert OUR five are present
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


def test_equivalence_cross_multiplication_400():
    # the heart: every generated equivalence satisfies a·d = b·c, INDEPENDENTLY
    rng = random.Random(13)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g3FREQ"]["equiv"](rng, {})
        assert v_freq_equiv(pr, ans, vis)


def test_take_divisibility_by_construction():
    rng = random.Random(17)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g3FRSET3"]["take"](rng, {})
        k, d, total = _nums(pr)[:3]
        assert total % d == 0 and total <= 10


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


def test_variation_guard_batch7():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
