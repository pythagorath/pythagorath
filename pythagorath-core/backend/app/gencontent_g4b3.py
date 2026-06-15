"""G4 batch 3 (الضرب رقمين والقسمة المطوّلة) — born live.

Three nodes after the body checks (2026-06-14):
- g4MUL2 (2-digit×2-digit and 3-digit×2-digit — the NEW act above g3MULBIG: both
  factors multi-digit → cross partial products; SA «١٢×١٨» area model, KW idx60-62
  «Exploring Multiplication of 2-Digit Numbers»).
- g4DIV1 (LONG division ÷1-digit: multi-digit dividend, remainder, ÷10/100/1000,
  estimate — a procedural extension of g3DIVREM; the remainder itself is familiar).
- g4DIV2 (OMAN's lower tier — 2-digit ÷ 1-digit WITH remainder, ٢٨÷١٤=٢ والباقي ٤,
  halving ٧٢÷٤; the remainder is NEW for Oman, so it pairs g3DIVREM, like g4PV4/g4ADD4).

Edges from the ACTUAL country order: g4MUL1 → g4MUL2 (all teach ×1 before ×2) and
g4MUL1 → g4DIV1 (all teach ×1 before ÷, which inverts ×1) — so MUL2 and DIV1 are
SIBLINGS under g4MUL1, NOT a chain. g4DIV2 is Oman's own root.

The Euclidean checker (q×b + r = n ∧ 0 ≤ r < b) is the heart of both division nodes;
the distractor deliberately violates r < b. Verifiers in tests/test_g4b3_generators.py.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2


# ============================ الضرب في رقمين (g4MUL2) ============================

@register("g4MUL2", "multiples10")
def mul2_multiples10(rng, p):
    """«الضرب في مضاعفات العشرة» — SA 6-1: tens × tens (60 × 40)."""
    cap = p.get("cap", 99999)
    a = rng.randrange(2, 10) * 10
    b = rng.randrange(2, 10) * 10
    while a * b > cap:
        b -= 10
    return (f"{_h(a)} × {_h(b)} = ؟", _h(a * b), None)


@register("g4MUL2", "partial")
def mul2_partial(rng, p):
    """«النواتج الجزئية/نموذج المساحة» — 2-digit × 2-digit via the distributive cross
    (the genuinely NEW act: BOTH factors split)."""
    a = rng.randrange(11, 100)
    b = rng.randrange(11, 100)
    bt, bo = b // 10 * 10, b % 10
    return (f"بالنواتج الجزئية: {_h(a)} × {_h(b)} = ({_h(a)} × {_h(bt)}) + ({_h(a)} × {_h(bo)}) = ؟",
            _h(a * b), None)


@register("g4MUL2", "algorithm")
def mul2_algorithm(rng, p):
    """«الخوارزمي العمودي الكامل» — 2-digit×2-digit or 3-digit×2-digit (SA «ثلاثة×رقمين»)."""
    cap = p.get("cap", 99999)
    if rng.random() < 0.5:
        a, b = rng.randrange(11, 100), rng.randrange(11, 100)
    else:
        while True:
            a, b = rng.randrange(101, 999), rng.randrange(11, 100)
            if a * b <= cap:
                break
    return (f"اضرب عمودياً: {_h(a)} × {_h(b)} = ؟", _h(a * b), None)


# ============================ القسمة المطوّلة (g4DIV1) ============================

def _euclid_pick(rng, n, b):
    """A book-format «q والباقي r» shape-pick: the WRONG option violates r < b."""
    q, r = divmod(n, b)
    good = f"{_h(q)} والباقي {_h(r)}"
    bad = f"{_h(q - 1)} والباقي {_h(r + b)}"           # the exact misconception
    return good, _pick2(rng, good, bad)


@register("g4DIV1", "longdiv")
def div1_longdiv(rng, p):
    """«القسمة المطوّلة» — multi-digit ÷ 1-digit, quotient + remainder (zeros = cases)."""
    cap = p.get("cap", 9999)
    b = rng.randrange(2, 10)
    n = rng.randrange(100, cap + 1)                    # 3–4 digit dividend
    good, vis = _euclid_pick(rng, n, b)
    return (f"{_h(n)} ÷ {_h(b)} = ؟ — انقر الناتج والباقي.", good, vis)


@register("g4DIV1", "multiples10")
def div1_multiples10(rng, p):
    """«قسمة المضاعفات ١٠/١٠٠/١٠٠٠» — KW «أنماط القسمة على ١٠/١٠٠/١٠٠٠»."""
    base = rng.choice([10, 100, 1000])
    q = rng.randrange(2, 10)
    n = q * base
    if n > p.get("cap", 9999):
        return div1_multiples10(rng, p)
    return (f"{_h(n)} ÷ {_h(base)} = ؟", _h(q), None)


@register("g4DIV1", "estimate")
def div1_estimate(rng, p):
    """«تقدير ناتج القسمة» — SA 7-4: round to a compatible quotient (|q·b − n| ≤ b/2)."""
    b = rng.randrange(3, 10)
    q = rng.randrange(10, min(90, p.get("cap", 9999) // b))
    n = q * b + rng.randint(-(b // 2), b // 2)         # n rounds to the q·b multiple
    return (f"قدِّر ناتج {_h(n)} ÷ {_h(b)} (إلى أقرب ناتجٍ مناسب).", _h(q), None)


# ============================ قسمة عُمان (g4DIV2) ============================

@register("g4DIV2", "remainder")
def div2_remainder(rng, p):
    """«الناتج والباقي» — Oman p56: 2-digit ÷ 1-digit with a remainder (٢٨÷١٤ pattern)."""
    cap = p.get("cap", 99)
    b = rng.randrange(2, 10)
    n = rng.randrange(b + 1, cap + 1)
    good, vis = _euclid_pick(rng, n, b)
    return (f"{_h(n)} ÷ {_h(b)} = ؟ — انقر الناتج والباقي.", good, vis)


@register("g4DIV2", "halving")
def div2_halving(rng, p):
    """«التنصيف» — Oman ٧٢÷٤: halve (÷2) or halve-twice (÷4)."""
    if rng.random() < 0.5:
        b, half = 2, 1
        q = rng.randrange(10, 50)
        n = q * 2
        return (f"أوجد {_h(n)} ÷ ٢ بالتنصيف: نصف {_h(n)} = ؟", _h(q), None)
    q = rng.randrange(6, 25)                            # ÷4 = halve twice
    n = q * 4
    return (f"أوجد {_h(n)} ÷ ٤ بالتنصيف: نصف {_h(n)} = {_h(n // 2)}، ونصف {_h(n // 2)} = ؟",
            _h(q), None)
