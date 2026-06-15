"""G4 batch 1 — born-live generators, independently verified from birth.

Six nodes in RANGE TIERS. The verifiers transcribe the maths INDEPENDENTLY of the
generators (place value = digit×10^i; comparison = arithmetic; rounding = half-up
with a STRICT tier-ceiling guard so g4ROUND100 never rounds past a hundred, g4ROUND
past a thousand, g4ROUNDM stays ≤ million). Registry grows 144 → 150 and the
whole-inventory pin (test_m3) enforces «no G4 node ships without a guarded generator».
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g4b1, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_PLACES = ["الآحاد", "العشرات", "المئات", "الآلاف", "عشرات الألوف",
           "مئات الألوف", "الملايين"]
# longest-first so «أقرب عشرة آلاف» / «أقرب مئة ألف» win over their prefixes
_LABELS = [("عشرة آلاف", 10000), ("مئة ألف", 100000), ("مليون", 1000000),
           ("ألف", 1000), ("مئة", 100), ("عشرة", 10)]


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def _ref(pr):
    for label, ref in _LABELS:
        if f"أقرب {label}" in pr:
            return ref
    raise AssertionError("no ref label in: " + pr)


def _half_up(n, ref):
    return (n + ref // 2) // ref * ref


# ---------------- place value (g4PVM / g4PV4 share these acts) ----------------

def v_compose(pr, ans, vis):
    ns = _nums(pr)
    n = ns[0]
    if ns[-1] != n:                         # «العدد n … = n —» bookends the parts
        return False
    shown = ns[1:-1]
    return _n1(ans) == n - sum(shown) and vis is None


def v_place(pr, ans, vis):
    if "قيمةُ" in pr or "قيمة الرقم" in pr:
        d, n = _nums(pr)[:2]
        # the digit is UNIQUE (generator guarantees it) — find its place
        s = str(n)
        idx = [i for i, c in enumerate(reversed(s)) if int(c) == d]
        return len(idx) == 1 and _n1(ans) == d * 10 ** idx[0]
    # place-NAME form
    d, n = _nums(pr)[:2]
    s = str(n)
    idx = [i for i, c in enumerate(reversed(s)) if int(c) == d]
    return len(idx) == 1 and ans == _PLACES[idx[0]] and vis["kind"] == "shape-pick"


def v_relate(pr, ans, vis):
    if "تساوي" in pr and "×" in pr:         # value form: «… في منزلة P تساوي d × ؟» → 10^i
        i = next(k for k, name in enumerate(_PLACES) if f"منزلة {name} " in pr)
        return _n1(ans) == 10 ** i and vis is None
    # place-to-the-right form: «منزلة P قيمتها ١٠ أضعاف منزلة؟» → P-1
    i = next(k for k, name in enumerate(_PLACES) if f"منزلة {name} قيمتها" in pr)
    return ans == _PLACES[i - 1] and vis["kind"] == "shape-pick"


def v_order(pr, ans, vis):
    ns = _nums(pr)
    asc = "تصاعدياً" in pr
    return _n1(ans) == (min(ns) if asc else max(ns)) and len(ns) == 4


# ---------------- comparison ----------------

def v_compare(pr, ans, vis):
    if "علامة" in pr:                       # «a ؟ b» → < or >
        a, b = _nums(pr)[:2]
        return ans == (">" if a > b else "<")
    opts = [int(o["v"].translate(_W)) for o in vis["options"]]
    want = max(opts) if "الأكبر" in pr else min(opts)
    return _n1(ans) == want


# ---------------- rounding (three tiers) ----------------

def v_rounding(pr, ans, vis):
    n = _n1(pr)
    ref = _ref(pr)
    if _n1(ans) != _half_up(n, ref):
        return False
    return (vis["kind"] == "number-line" and vis["step"] == ref
            and vis["target"] == n and vis["min"] <= n <= vis["max"])


def v_inverse(pr, ans, vis):
    target = _n1(pr)
    ref = _ref(pr)
    good = _n1(ans)
    if _half_up(good, ref) != target:
        return False
    others = [int(o["v"].translate(_W)) for o in vis["options"] if o["v"] != ans]
    return len(others) == 2 and all(_half_up(o, ref) != target for o in others)


VERIFIERS = {
    ("g4PVM", "compose"): v_compose, ("g4PVM", "place"): v_place,
    ("g4PVM", "relate"): v_relate,
    ("g4PV4", "compose"): v_compose, ("g4PV4", "place"): v_place,
    ("g4PV4", "order"): v_order,
    ("g4CMPM", "compare"): v_compare, ("g4CMPM", "order"): v_order,
    ("g4ROUNDM", "rounding"): v_rounding, ("g4ROUNDM", "inverse"): v_inverse,
    ("g4ROUND", "rounding"): v_rounding, ("g4ROUND", "inverse"): v_inverse,
    ("g4ROUND100", "rounding"): v_rounding, ("g4ROUND100", "inverse"): v_inverse,
}

# the tier ceilings (the N120 law: every numeral in a served item stays here)
CAPS = {"g4PVM": 9999999, "g4PV4": 9999, "g4CMPM": 9999999,
        "g4ROUNDM": 9999999, "g4ROUND": 1000000, "g4ROUND100": 10000}
FLOORS = {code: 35 for code in CAPS}       # variation: ≥35 distinct draws / node

# the highest ROUNDING place each tier may ever use (the body-fixed tier law)
MAX_REF = {"g4ROUNDM": 1000000, "g4ROUND": 1000, "g4ROUND100": 100}


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
            # the cap scan: prompt + answer (+ shape-pick options); the number-line's
            # own endpoints are the localized aid, scanned separately below
            blob = pr + " " + ans
            if vis and vis.get("kind") == "shape-pick":
                blob += " " + json.dumps(vis, ensure_ascii=False)
            over = [n for n in _nums(blob) if n > CAPS[code]]
            assert not over, (code, family, pr, over)


def test_rounding_tier_ceiling_never_leaks():
    # the heart of the three-tier split: g4ROUND100 never rounds past a hundred,
    # g4ROUND past a thousand, g4ROUNDM past a million (merging would break this)
    rng = random.Random(7)
    for code, ceil in MAX_REF.items():
        for family in ("rounding", "inverse"):
            gen = generators.REGISTRY[code][family]
            for _ in range(400):
                pr, ans, vis = gen(rng, {})
                assert _ref(pr) <= ceil, (code, family, pr)
                # and the number-line window stays inside the tier cap
                if vis and vis.get("kind") == "number-line":
                    assert vis["max"] <= CAPS[code], (code, pr, vis)


def test_pvm_is_millions_pv4_is_thousands():
    # the tiers genuinely use their scope: g4PVM/g4CMPM reach ≥ 6 digits; g4PV4 stays
    # 4-digit (Oman's body range — the corrected, body-confirmed tier)
    rng = random.Random(3)
    big = False
    for _ in range(200):
        pr, _, _ = generators.REGISTRY["g4PVM"]["place"](rng, {})
        if any(n >= 100000 for n in _nums(pr)):
            big = True
    assert big
    for fam in generators.REGISTRY["g4PV4"]:
        for _ in range(200):
            pr, ans, vis = generators.REGISTRY["g4PV4"][fam](rng, {})
            blob = pr + " " + ans + (json.dumps(vis, ensure_ascii=False) if vis else "")
            assert all(n <= 9999 for n in _nums(blob)), (fam, pr)


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
