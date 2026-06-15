"""G4 batch 2 (الجمع والطرح والضرب التأسيسي) — born live.

Seven nodes after the body checks (2026-06-14):
- g4ADDSUB (millions fluency, 5 countries) + g4ADD4 (Oman's 4-digit tier — its
  «الجمع(١)/الطرح(١)/التجزئة» read at ≤9999, like g4PV4).
- g4PROPS (SA/BH «الجبر: خصائص الجمع وقواعد الطرح» — a NAMED-property act, 2 owners)
  and g4EST (SA/BH/QA/KW/AE «تقدير المجموع والفرق» + «الدقيق أم التقديري» — standalone
  lessons → its own node, pairing g3EST3). Both ROOTS: SA teaches them BEFORE the add
  algorithm (2-1/2-2/2-3 < 2-4), so an ADDSUB→PROPS/EST edge would reverse the source.
- g4MUL1 (multi-digit×1, 5 countries; Oman OUT — its multiplication is facts-level).
- g4FACT (factors/multiples — SA/BH/KW/QA; ROOT: SA orders factors 5-1 BEFORE the
  multi-digit algorithm 5-5, so MUL1→FACT reverses it) + g4PRIME (prime/composite —
  KW «عدد أولي/غير أولي» 5-5 + QA و٦-٤; a NEW act, depends on g4FACT). AE pending
  (AE-FACT reservation — image-only/edition-mixed, attribute after a clear body read).

Verifiers + thresholds + caps live in tests/test_g4b2_generators.py.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

_PLACE_VALUE = {10: "عشرة", 100: "مئة", 1000: "ألف"}


def _is_prime(n: int) -> bool:
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True


def _factors(n: int):
    return [d for d in range(1, n + 1) if n % d == 0]


# ============================ الجمع والطرح ============================

def _col(rng, lo, cap):
    """«الخوارزمي العمودي» — multi-digit add/sub (zeros = cases). `cap` bounds the RESULT
    so a sum never spills past the tier ceiling (g4ADD4 stays 4-digit)."""
    if rng.random() < 0.5:                              # subtraction
        a = rng.randrange(2 * lo, cap + 1)
        b = rng.randrange(lo, a - lo + 1)
        return (f"اطرح عمودياً (بإعادة التجميع): {_h(a)} − {_h(b)} = ؟", _h(a - b), None)
    a = rng.randrange(lo, cap - lo + 1)                 # addition: a + b ≤ cap
    b = rng.randrange(lo, cap - a + 1)
    return (f"اجمع عمودياً (بإعادة التجميع): {_h(a)} + {_h(b)} = ؟", _h(a + b), None)


@register("g4ADDSUB", "algorithm")
def addsub_algorithm(rng, p):
    return _col(rng, p.get("lo", 10000), p.get("cap", 9999999))


@register("g4ADDSUB", "mental")
def addsub_mental(rng, p):
    """«الذهني/التعويض» — KW patterns + AE compensation («٤٩٩+٧٧=٥٠٠+...»). Two surfaces
    of one mental act: round-place subtraction and make-a-friendly-number addition."""
    if rng.random() < 0.5:                              # place-value pattern (82000−76000)
        unit = rng.choice([1000, 10000])
        a = rng.randrange(3, 90) * unit
        b = rng.randrange(2, a // unit) * unit
        return (f"اطرح ذهنياً (نمط القيمة المنزلية): {_h(a)} − {_h(b)} = ؟", _h(a - b), None)
    near = rng.choice([100, 1000])                      # compensation (499+77 → 500+76)
    a = rng.randrange(2, 10) * near - 1
    b = rng.randrange(near // 2, near * 8)
    return (f"اجمع ذهنياً بالتعويض: {_h(a)} + {_h(b)} (اجعل {_h(a)} ← {_h(a + 1)}) = ؟",
            _h(a + b), None)


@register("g4ADD4", "algorithm")
def add4_algorithm(rng, p):
    return _col(rng, p.get("lo", 1000), p.get("cap", 9999))


@register("g4ADD4", "partition")
def add4_partition(rng, p):
    """«التجزئة» — Oman «التجزئة بهدف الجمع والطرح»: split by place values, then combine.
    `cap` keeps the result inside Oman's 4-digit range."""
    cap = p.get("cap", 9999)
    if rng.random() < 0.5:                              # subtraction
        a = rng.randrange(2000, cap + 1)
        b = rng.randrange(1000, a - 999)
        return (f"حلّل ثم اطرح: {_h(a)} − {_h(b)} = ({_h(a // 1000 * 1000)} − {_h(b // 1000 * 1000)}) + … = ؟",
                _h(a - b), None)
    a = rng.randrange(1000, cap - 999)                  # addition: a + b ≤ cap
    b = rng.randrange(1000, cap - a + 1)
    return (f"حلّل ثم اجمع: {_h(a)} + {_h(b)} = ({_h(a // 1000 * 1000)} + {_h(b // 1000 * 1000)}) + … = ؟",
            _h(a + b), None)


# ============================ خواص الجمع (g4PROPS) ============================

@register("g4PROPS", "property")
def props_property(rng, p):
    """«تطبيق الخاصية» — SA/BH 2-1: commutative / associative / identity, by name."""
    cap = p.get("cap", 9999)
    form = rng.randrange(3)
    if form == 0:                                       # commutative (الإبدال)
        a, b = rng.randrange(100, cap), rng.randrange(100, cap)
        return (f"بخاصية الإبدال: {_h(a)} + {_h(b)} = {_h(b)} + ؟", _h(a), None)
    if form == 1:                                       # associative (التجميع)
        a, b, c = (rng.randrange(2, 40) for _ in range(3))
        return (f"بخاصية التجميع: ({_h(a)} + {_h(b)}) + {_h(c)} = {_h(a)} + ({_h(b)} + ؟)",
                _h(c), None)
    a = rng.randrange(100, cap)                          # identity (المحايد)
    return (f"العنصر المحايد الجمعي: {_h(a)} + ؟ = {_h(a)}", "٠", None)


@register("g4PROPS", "relation")
def props_relation(rng, p):
    """«العلاقة العكسية» — «قاعدة الطرح عكس الجمع»: the missing term / fact flip."""
    cap = p.get("cap", 9999)
    a = rng.randrange(50, cap - 50)          # a + b ≤ cap (the sum c must fit the tier)
    b = rng.randrange(50, cap - a + 1)
    c = a + b
    if rng.random() < 0.5:
        return (f"إذا كان {_h(a)} + {_h(b)} = {_h(c)} فإنَّ {_h(c)} − {_h(b)} = ؟", _h(a), None)
    return (f"المعادلة الناقصة: ؟ − {_h(b)} = {_h(a)}", _h(c), None)


# ============================ التقدير (g4EST) ============================

@register("g4EST", "estimate")
def est_estimate(rng, p):
    """«تقدير الناتج» — round both to the place, then operate (the g3EST3 act, G4 range)."""
    ref = rng.choice([100, 1000])
    a = rng.randrange(ref, p.get("hi", 9999) + 1)
    b = rng.randrange(ref, p.get("hi", 9999) + 1)
    r = lambda n: (n + ref // 2) // ref * ref
    sub = rng.random() < 0.5 and a > b
    res = r(a) - r(b) if sub else r(a) + r(b)
    op = "−" if sub else "+"
    return (f"قدِّر بالتقريب لأقرب {_PLACE_VALUE[ref]}: {_h(a)} {op} {_h(b)} ≈ ؟", _h(res), None)


@register("g4EST", "decision")
def est_decision(rng, p):
    """«الدقيق أم التقديري» — SA 2-3 / BH 2-3: decide what the SITUATION needs."""
    budget = rng.choice([100, 500, 1000])
    a, b = rng.randrange(20, budget), rng.randrange(20, budget)
    if rng.random() < 0.5:
        return (f"هل يكفي {_h(budget)} ريالٍ لشراء غرضين بـ {_h(a)} و{_h(b)}؟ — ماذا يلزمك؟",
                "يكفي التقدير", _pick2(rng, "يكفي التقدير", "جوابٌ دقيق"))
    return (f"كم يتبقّى بالضبط من {_h(budget)} بعد شراءٍ بـ {_h(a)}؟ — ماذا يلزمك؟",
            "جوابٌ دقيق", _pick2(rng, "جوابٌ دقيق", "يكفي التقدير"))


# ============================ الضرب في رقم واحد (g4MUL1) ============================

@register("g4MUL1", "multiples10")
def mul1_multiples10(rng, p):
    """«الضرب في مضاعفات ١٠/١٠٠/١٠٠٠» — SA 5-2 (product capped to keep the tier ≤9999)."""
    k = rng.randrange(2, 10)
    base = rng.choice([10, 100, 1000])
    d = rng.randrange(2, 10)
    while k * d * base > p.get("cap", 9999):
        d -= 1
    return (f"{_h(k)} × {_h(d * base)} = ؟", _h(k * d * base), None)


@register("g4MUL1", "distributive")
def mul1_distributive(rng, p):
    """«التوزيع/النواتج الجزئية» — 4 × 123 = 4×(100+20+3)."""
    k = rng.randrange(3, 9)
    while True:
        n = rng.randrange(112, 999)
        if k * n <= p.get("cap", 9999):
            break
    h, t, o = n // 100 * 100, n // 10 % 10 * 10, n % 10
    return (f"فكِّك: {_h(k)} × {_h(n)} = {_h(k)} × ({_h(h)} + {_h(t)} + {_h(o)}) = ؟",
            _h(k * n), None)


@register("g4MUL1", "algorithm")
def mul1_algorithm(rng, p):
    """«الخوارزمي العمودي» — multi-digit × 1 with REAL renaming (the ones product carries)."""
    cap = p.get("cap", 9999)
    while True:
        n = rng.randrange(13, 999)
        k = rng.randrange(2, 10)
        if (n % 10) * k >= 10 and n * k <= cap:
            return (f"اضرب عمودياً (بإعادة التسمية): {_h(n)} × {_h(k)} = ؟", _h(n * k), None)


# ============================ العوامل والمضاعفات (g4FACT) ============================

@register("g4FACT", "factors")
def fact_factors(rng, p):
    """«إيجاد العوامل» — pick a factor of n (the non-factor distractor is the misconception)."""
    n = rng.randrange(12, p.get("cap", 144) + 1)
    facs = [d for d in _factors(n) if 1 < d < n]
    if not facs:
        return fact_factors(rng, p)
    good = rng.choice(facs)
    bad = rng.choice([x for x in range(2, n) if n % x != 0])
    return (f"أيُّ عددٍ من عوامل {_h(n)}؟", _h(good), _pick2(rng, _h(good), _h(bad)))


@register("g4FACT", "multiples")
def fact_multiples(rng, p):
    """«إيجاد المضاعفات» — pick a multiple of k."""
    k = rng.randrange(3, 12)
    m = k * rng.randrange(2, max(3, p.get("cap", 144) // k))
    bad = m + rng.choice([1, -1, 2, -2])
    while bad % k == 0:
        bad += 1
    return (f"أيُّ عددٍ من مضاعفات {_h(k)}؟", _h(m), _pick2(rng, _h(m), _h(bad)))


@register("g4FACT", "common")
def fact_common(rng, p):
    """«العوامل المشتركة» — KW 5-5 «عوامل مشتركة»: a factor of BOTH."""
    g = rng.randrange(2, 9)
    a, b = g * rng.randrange(2, 7), g * rng.randrange(2, 7)
    while a == b:
        b = g * rng.randrange(2, 7)
    bad = rng.choice([x for x in range(2, min(a, b)) if a % x != 0 or b % x != 0] or [a + 1])
    return (f"ما أحد العوامل المشتركة للعددين {_h(a)} و{_h(b)}؟", _h(g),
            _pick2(rng, _h(g), _h(bad)))


# ============================ الأعداد الأولية (g4PRIME) ============================

@register("g4PRIME", "classify")
def prime_classify(rng, p):
    """«تصنيف أولي/غير أولي» — KW «عدد أولي/غير أولي» 5-5 + QA و٦-٤."""
    n = rng.randrange(2, p.get("cap", 100) + 1)
    ans = "عدد أولي" if _is_prime(n) else "عدد غير أولي"
    return (f"العدد {_h(n)}: أوليٌّ أم غير أوليّ؟", ans,
            {"kind": "shape-pick", "options": [{"v": "عدد أولي"}, {"v": "عدد غير أولي"}]})


@register("g4PRIME", "definition")
def prime_definition(rng, p):
    """«العدد الأولي له عاملان فقط» — pick the prime by the two-factors definition."""
    cap = p.get("cap", 100)
    primes = [x for x in range(2, cap + 1) if _is_prime(x)]
    comps = [x for x in range(4, cap + 1) if not _is_prime(x)]
    good, bad = rng.choice(primes), rng.choice(comps)
    return ("العدد الأوليّ له عاملان فقط (١ ونفسه). أيُّ الأعداد أوليّ؟", _h(good),
            _pick2(rng, _h(good), _h(bad)))
