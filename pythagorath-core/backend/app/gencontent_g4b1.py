"""G4 batch 1 (الأعداد) — born live: place value & large numbers, in RANGE TIERS.

Six nodes, generated from day one (the dynamic registry pin forbids a seed-served
G4 node). The body checks (2026-06-14) fixed the tiers from the SOURCE TEXT:
- g4PVM/g4CMPM reach the MILLION (KW «up to 1 000 000» idx17, SA «ضمن الملايين»,
  QA «الأعداد حتى المليون» + ١ ٢٩١ ٨٤٦, BH ٥٤ ٩٢٩ ٥٢٣); Oman is NOT here.
- g4PV4 is Oman's own tier — its «قراءة وكتابة وتجزئة الأعداد» / «الترتيب» are 4-digit
  (٢٣٤٥/٧٧٧٧/٩١٠٩, order ١٠٦٦/١٦٦٠/٩٠٩٠); the footer-sweep reference had missed it.
- THREE rounding tiers (merging any two would leak past an owner's source — the
  ratified N120/ROUND4/CMP10 law): g4ROUNDM any place ≤million (SA/BH/QA: SA
  ٣١٩٠٢٣٦→مليون, QA ٩٠٦٤٢١→مئة ألف), g4ROUND 10/100/1000 (KW idx29 verbatim),
  g4ROUND100 10/100 (Oman ٧٢٢٥→أقرب مئة).

Verifiers + thresholds + caps live in tests/test_g4b1_generators.py.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

# place names by digit index from the right (0 = ones … 6 = millions)
_PLACE_NAMES = ["الآحاد", "العشرات", "المئات", "الآلاف",
                "عشرات الألوف", "مئات الألوف", "الملايين"]
_REF_LABEL = {10: "عشرة", 100: "مئة", 1000: "ألف",
              10000: "عشرة آلاف", 100000: "مئة ألف", 1000000: "مليون"}


def _digit(n: int, i: int) -> int:
    return n // 10 ** i % 10


def _expanded_parts(n: int):
    """[(place_index, place_value), …] for the nonzero digits, high → low."""
    s = len(str(n))
    return [(i, _digit(n, i) * 10 ** i) for i in range(s - 1, -1, -1) if _digit(n, i)]


def _unique_digit_position(rng: random.Random, n: int):
    """A position whose digit is nonzero AND appears once in n (so «قيمة الرقم d»
    is unambiguous). Returns None if the number has no such digit."""
    digs = [int(c) for c in str(n)]
    uniq = [i for i in range(len(str(n)))
            if _digit(n, i) != 0 and digs.count(_digit(n, i)) == 1]
    return rng.choice(uniq) if uniq else None


# ============================ القيمة المنزلية ============================

def _compose(rng: random.Random, lo: int, hi: int, ctx: dict | None = None):
    """«التكوين/التفكيك» — expanded form, with a MASTERY-GATED progression (read-only ctx):

      * in_progress  → COMPLETE: all parts shown, ONE place blanked, the child supplies it
                       (the scaffolded start — unchanged behaviour);
      * understood/mastered → FULL: the child decomposes the WHOLE number, filling EVERY place.

    Both grade through the same text gate (gate.grade on a string); only the task/display change.
    For FULL the answer is the canonical "v + v + …" of the nonzero parts (high→low, the
    `_expanded_parts` order); the widget joins the child's place inputs the same way, so after
    digit-normalisation the two strings match. The analytical form is a REPRESENTATION of
    decomposition, never a separate family. ctx is READ-ONLY — nothing here touches the gate."""
    while True:
        n = rng.randrange(lo, hi + 1)
        parts = _expanded_parts(n)
        if len(parts) >= 2:
            break
    full = bool(ctx and ctx.get("understood"))     # understood OR mastered → full decomposition
    base_parts = [{"value": v, "place_name": _PLACE_NAMES[i]} for i, v in parts]
    if full:
        # FULL: every place is an input. Canonical answer = nonzero place values, high→low,
        # joined by " + " (the widget emits the identical join → byte-match after normalise).
        answer = " + ".join(_h(v) for _, v in parts)
        vis = {"kind": "expanded-form", "number": n, "parts": base_parts, "full": True}
        return (f"فكّك العدد {_h(n)} إلى منازله كاملةً — اكتب قيمة كل منزلة.", answer, vis)
    bi = rng.randrange(len(parts))
    # COMPLETE: the analytical form in the «expanded-form» widget with ONE blank. The ANSWER is
    # byte-identical to the original — only the display changes; the gate grades the typed value.
    vis = {"kind": "expanded-form", "number": n, "parts": base_parts, "blank_index": bi}
    return (f"أكمل تفكيك العدد {_h(n)} — ما قيمة المنزلة الناقصة؟",
            _h(parts[bi][1]), vis)


def _place(rng: random.Random, lo: int, hi: int):
    """«قيمة الرقم بموقعه» — value of a digit, or the name of its place."""
    while True:
        n = rng.randrange(lo, hi + 1)
        i = _unique_digit_position(rng, n)
        if i is not None:
            break
    d = _digit(n, i)
    if rng.random() < 0.6:
        return (f"ما قيمة الرقم {_h(d)} في العدد {_h(n)}؟", _h(d * 10 ** i), None)
    place = _PLACE_NAMES[i]
    wrong = _PLACE_NAMES[i + 1] if i + 1 < len(str(n)) else _PLACE_NAMES[i - 1]
    return (f"في أيِّ منزلةٍ يقع الرقم {_h(d)} في العدد {_h(n)}؟", place,
            _pick2(rng, place, wrong))


@register("g4PVM", "compose")
def pvm_compose(rng, p, ctx=None):
    return _compose(rng, p.get("lo", 100000), p.get("hi", 9999999), ctx)


@register("g4PVM", "place")
def pvm_place(rng, p):
    return _place(rng, p.get("lo", 100000), p.get("hi", 9999999))


@register("g4PVM", "relate")
def pvm_relate(rng, p):
    """«العلاقات بين القيم المنزلية» — QA 1-2: each place is 10× the one to its right."""
    i = rng.randrange(1, 7)
    if rng.random() < 0.5:                       # the value form (10× the unit)
        d = rng.randrange(2, 10)
        return (f"قيمة الرقم {_h(d)} في منزلة {_PLACE_NAMES[i]} تساوي {_h(d)} × ؟",
                _h(10 ** i), None)
    right = _PLACE_NAMES[i - 1]                   # the place-to-the-right form
    wrong = _PLACE_NAMES[i + 1] if i + 1 < len(_PLACE_NAMES) else _PLACE_NAMES[max(0, i - 2)]
    return (f"منزلة {_PLACE_NAMES[i]} قيمتها ١٠ أضعاف منزلة؟", right,
            _pick2(rng, right, wrong))


@register("g4PV4", "compose")
def pv4_compose(rng, p, ctx=None):
    return _compose(rng, p.get("lo", 1000), p.get("hi", 9999), ctx)


@register("g4PV4", "place")
def pv4_place(rng, p):
    return _place(rng, p.get("lo", 1000), p.get("hi", 9999))


@register("g4PV4", "order")
def pv4_order(rng, p):
    """« الترتيب» — Oman p4: order four 4-digit numbers, report the first (the proven
    single-string emit so the gate stays blind to the act's surface)."""
    lo, hi = p.get("lo", 1000), p.get("hi", 9999)
    nums = rng.sample(range(lo, hi + 1), 4)
    asc = rng.random() < 0.5
    ans = min(nums) if asc else max(nums)
    return (f"رتّب {'تصاعدياً' if asc else 'تنازلياً'} واكتب الأوّل: "
            + "، ".join(_h(n) for n in nums), _h(ans), None)


# ============================ المقارنة والترتيب ============================

@register("g4CMPM", "compare")
def cmpm_compare(rng, p):
    """«موازنة عددين» — tap the bigger/smaller, or choose the symbol."""
    lo, hi = p.get("lo", 100000), p.get("hi", 9999999)
    a, b = rng.sample(range(lo, hi + 1), 2)
    if rng.random() < 0.5:
        bigger = rng.random() < 0.5
        ans = (max if bigger else min)(a, b)
        return (f"انقر العدد {'الأكبر' if bigger else 'الأصغر'}.", _h(ans),
                _pick2(rng, _h(ans), _h(b if (max(a, b) if bigger else min(a, b)) == a else a)))
    ans = ">" if a > b else "<"
    return (f"أيُّ علامةٍ تصحّ: {_h(a)} ؟ {_h(b)}", ans, _pick2(rng, ans, "<" if ans == ">" else ">"))


@register("g4CMPM", "order")
def cmpm_order(rng, p):
    """«ترتيب متعدد» — order four million-range numbers, report the first."""
    lo, hi = p.get("lo", 100000), p.get("hi", 9999999)
    nums = rng.sample(range(lo, hi + 1), 4)
    asc = rng.random() < 0.5
    ans = min(nums) if asc else max(nums)
    return (f"رتّب {'تصاعدياً' if asc else 'تنازلياً'} واكتب الأوّل: "
            + "، ".join(_h(n) for n in nums), _h(ans), None)


# ============================ التقريب (ثلاث طبقات) ============================

def _round_half_up(n: int, ref: int) -> int:
    # «٥ فما فوق نقرّب تصاعدياً» (the sources' rule; Python's round() is banker's)
    return (n + ref // 2) // ref * ref


def _round_direct(rng: random.Random, n_lo: int, n_hi: int, refs: list[int]):
    """«التقريب المباشر» — round half-up; number-line is a REPRESENTATION (the widget
    draws a tight window around the target), not a family."""
    while True:
        n = rng.randrange(n_lo, n_hi + 1)
        ok = [r for r in refs if r <= n]          # the place must exist in the number
        if ok:
            break
    ref = rng.choice(ok)
    lower = n // ref * ref
    vis = {"kind": "number-line", "min": lower, "max": lower + ref, "step": ref, "target": n}
    return (f"قرِّب {_h(n)} إلى أقرب {_REF_LABEL[ref]}.", _h(_round_half_up(n, ref)), vis)


def _round_inverse(rng: random.Random, refs: list[int], cap: int, lo: int = 0):
    """«التقريب العكسي» — which number LANDS on the target when rounded? (Oman p57 q3
    «اكتب أمثلة تتطابق» — selecting pre-images). good rounds to target; bad to a neighbour.
    base bounds keep BOTH neighbours' pre-images inside [0, cap] and ≥ the node's floor."""
    while True:
        ref = rng.choice(refs)
        max_base = (cap // ref) - 2          # target+ref pre-images stay ≤ cap
        min_base = max(2, -(-lo // ref))     # target ≥ the node's floor (ceil div)
        if max_base >= min_base:
            break
    base = rng.randrange(min_base, max_base + 1)
    target = base * ref
    # delta in [-ref//2, ref//2 - 1] rounds to target (half-up); avoid 0
    def near(t):
        lo = -(ref // 2)
        hi = ref // 2 - 1 if ref > 2 else 0
        d = rng.randint(lo, hi)
        while d == 0 and ref > 2:
            d = rng.randint(lo, hi)
        return t + d
    good = near(target)
    nbr = target + ref if rng.random() < 0.5 else target - ref
    bad = near(nbr)
    bad2 = near(target + ref) if nbr == target - ref else near(target - ref)
    opts = [{"v": _h(good)}, {"v": _h(bad)}, {"v": _h(bad2)}]
    rng.shuffle(opts)
    return (f"أيُّ الأعداد يؤول إلى {_h(target)} عند تقريبه إلى أقرب {_REF_LABEL[ref]}؟",
            _h(good), {"kind": "shape-pick", "options": opts})


_ROUNDM_REFS = [10, 100, 1000, 10000, 100000, 1000000]


@register("g4ROUNDM", "rounding")
def roundm_direct(rng, p):
    # hi 8 999 999 so rounding to the million place never exceeds the 7-digit cap
    return _round_direct(rng, p.get("lo", 1000), p.get("hi", 8999999),
                         p.get("refs", _ROUNDM_REFS))


@register("g4ROUNDM", "inverse")
def roundm_inverse(rng, p):
    return _round_inverse(rng, p.get("refs", _ROUNDM_REFS), p.get("cap", 9999999),
                          p.get("lo", 1000))


@register("g4ROUND", "rounding")
def round_direct(rng, p):
    return _round_direct(rng, p.get("lo", 100), p.get("hi", 999999),
                         p.get("refs", [10, 100, 1000]))


@register("g4ROUND", "inverse")
def round_inverse(rng, p):
    return _round_inverse(rng, p.get("refs", [10, 100, 1000]), p.get("cap", 1000000),
                          p.get("lo", 100))


@register("g4ROUND100", "rounding")
def round100_direct(rng, p):
    return _round_direct(rng, p.get("lo", 1000), p.get("hi", 9999),
                         p.get("refs", [10, 100]))


@register("g4ROUND100", "inverse")
def round100_inverse(rng, p):
    return _round_inverse(rng, p.get("refs", [10, 100]), p.get("cap", 10000),
                          p.get("lo", 1000))
