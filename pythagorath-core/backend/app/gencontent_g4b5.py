"""G4 batch 5 — decimal fractions, born live.

Decimals live in HUNDREDTHS integer space (×100) end-to-end — no float ever:
every value is an int number of hundredths, formatted by `_dec`, and every verifier
(test_g4b5_generators.py) re-derives independently in the same space — grid by
conversion, compare by ×100, convert by cross-multiplication, round/add/subtract by
integer arithmetic.

Range law: tenths/hundredths only (denominators ∈ {10, 100}, ≤ 2 places — NO
thousandths). g4DEC is sub-unit (< 1); g4DECLINE places on a 0–2 line; g4DECADD's
operands are to hundredths with a sum/difference < 100.

Nodes (the body checks of 2026-06-15 — decimals widen from ONE G3 node to SIX):
  • g4DEC  (grid / compare / convert) — ALL SIX (KW/SA/QA/AE/OM/BH). Tenths+hundredths,
    represent + order + link-to-common-fraction (incl. ٠٫٥ = ١/٢). Pair ↔ g3DEC.
  • g4DECLINE (place / read) — SA + QA ONLY («تمثيل العشرية على خط الأعداد» is an
    explicit, country-scoped act → its OWN node, not a six-wide family; produce↔
    recognise, like Fr1). Reuses the number-line widget (decimal-label extension).
  • g4DECADD (round / add / subtract) — SA + AE + BH (BH by edition parity: AE-t2 =
    Obeikan/McGraw-Hill 2008/2009, decimal add at ف٢ ص٦٨٨ «٤٫٣١+١٩٫٦» → BH ف١٢ owns it
    by the same book). Decimal-point alignment. NEW act. Pair ↔ g4FRADD / g4ADDSUB.

DAG (each edge holds in EVERY owner's order: fractions → decimals → decimal add):
  g4FRAC → g4DEC → {g4DECLINE, g4DECADD}.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

SEP = "٫"   # U+066B Arabic decimal separator


def _two(frac):                       # 0..99 → exactly two Hindi digits ("٥" → "٠٥")
    return _h(frac // 10) + _h(frac % 10)


def _dec(h):
    """Integer hundredths → Arabic decimal string (tenths form when divisible by 10)."""
    neg, h = h < 0, abs(h)
    whole, frac = divmod(h, 100)
    if frac == 0:
        s = _h(whole)
    elif frac % 10 == 0:
        s = f"{_h(whole)}{SEP}{_h(frac // 10)}"
    else:
        s = f"{_h(whole)}{SEP}{_two(frac)}"
    return ("-" + s) if neg else s


# ============================ التمثيل (g4DEC) ============================

@register("g4DEC", "grid")
def dec_grid(rng, p):
    if rng.random() < 0.5:                              # tenths strip (1×10)
        k = rng.randrange(1, 10)
        good = _dec(k * 10)
        bad = _dec((10 - k) * 10) if 10 - k != k else _dec(((k - 1) or 1) * 10)
        opts = [o["v"] for o in _pick2(rng, good, bad)["options"]]
        return ("اقرأ الشبكة واختر الصورة العشرية.", good,
                {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 1,
                 "shaded": k, "options": opts})
    k = rng.randrange(1, 100)                           # hundredths grid (10×10)
    good = _dec(k)
    swap = (k % 10) * 10 + (k // 10)                    # tenths↔hundredths digit-swap trap
    bad = _dec(swap) if swap != k else _dec((k + 1) if k + 1 < 100 else (k - 1))
    opts = [o["v"] for o in _pick2(rng, good, bad)["options"]]
    return ("شبكة المئة: اختر الصورة العشرية للجزء الملوّن.", good,
            {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 10,
             "shaded": k, "options": opts})


# ============================ المقارنة والترتيب (g4DEC) ============================

@register("g4DEC", "compare")
def dec_compare(rng, p):
    a = rng.randrange(1, 100)
    b = rng.randrange(1, 100)
    while b == a:
        b = rng.randrange(1, 100)
    da, dbb = _dec(a), _dec(b)
    good, bad = (da, dbb) if a > b else (dbb, da)       # the larger is the answer
    return (f"انقر العدد العشري الأكبر: {da} أم {dbb}؟", good, _pick2(rng, good, bad))


# ============================ الربط بالكسر الاعتيادي (g4DEC) ============================

@register("g4DEC", "convert")
def dec_convert(rng, p):
    form = rng.randrange(3)
    if form == 0:                                       # common fraction → decimal
        if rng.random() < 0.5:
            k = rng.randrange(1, 10)
            good = _dec(k * 10)
            bad = _dec((10 - k) * 10) if 10 - k != k else _dec(((k - 1) or 1) * 10)
            return (f"اكتب {_h(k)}/١٠ بالصورة العشرية.", good, _pick2(rng, good, bad))
        k = rng.randrange(11, 100)
        good = _dec(k)
        bad = _dec(k + 1) if k + 1 < 100 else _dec(k - 1)
        return (f"اكتب {_h(k)}/١٠٠ بالصورة العشرية.", good, _pick2(rng, good, bad))
    if form == 1:                                       # decimal → common fraction (/100)
        k = rng.randrange(11, 100)
        good, bad = f"{_h(k)}/١٠٠", f"{_h(k)}/١٠"
        return (f"اكتب {_dec(k)} كسراً اعتيادياً (من مئة).", good, _pick2(rng, good, bad))
    # form 2 — equivalence common ↔ decimal (incl. ٠٫٥ = ١/٢)
    (a, b), hh = rng.choice([((1, 2), 50), ((1, 4), 25), ((3, 4), 75),
                             ((1, 5), 20), ((2, 5), 40), ((1, 10), 10), ((3, 10), 30)])
    good = _dec(hh)
    bad = _dec(rng.choice([v for v in (10, 20, 25, 30, 40, 50, 75) if v != hh]))
    return (f"ما العدد العشري المساوي لـ {_h(a)}/{_h(b)}؟", good, _pick2(rng, good, bad))


# ============================ خط الأعداد العشري (g4DECLINE — SA/QA) ============================

@register("g4DECLINE", "place")
def decline_place(rng, p):
    if rng.random() < 0.5:                              # 0.1 .. 0.9 on a 0–1 line
        k = rng.randrange(1, 10)
        return (f"انقر موضع {_dec(k * 10)} على الخطّ.", _dec(k * 10),
                {"kind": "number-line", "den": 10, "maxWhole": 1, "dec": True})
    k = rng.randrange(11, 20)                           # 1.1 .. 1.9 on a 0–2 line
    return (f"انقر موضع {_dec(k * 10)} على الخطّ (أكبر من ١).", _dec(k * 10),
            {"kind": "number-line", "den": 10, "maxWhole": 2, "dec": True})


@register("g4DECLINE", "read")
def decline_read(rng, p):
    maxW = rng.choice([1, 2])
    k = rng.randrange(1, 10 * maxW)
    while k % 10 == 0:                                  # never land on a whole mark
        k = rng.randrange(1, 10 * maxW)
    good = _dec(k * 10)
    near = _dec((k + 1) * 10) if rng.random() < 0.5 else _dec(((k - 1) or 1) * 10)
    opts = [o["v"] for o in _pick2(rng, good, near)["options"]]
    return ("ما العدد العشري عند العلامة ◆ على الخطّ؟", good,
            {"kind": "number-line", "den": 10, "maxWhole": maxW, "dec": True,
             "mark": k, "options": opts})


# ============================ التقريب (g4DECADD — SA/AE/BH) ============================

@register("g4DECADD", "round")
def decadd_round(rng, p):
    if rng.random() < 0.5:                              # nearest whole — needs a fractional part
        h = rng.randrange(11, 1000)
        while h % 100 == 0:                             # never a bare integer input
            h = rng.randrange(11, 1000)
        r = ((h + 50) // 100) * 100                     # round half up
        return (f"قرّب {_dec(h)} إلى أقرب عددٍ صحيح.", _dec(r), None)
    h = rng.randrange(11, 1000)                         # nearest tenth — needs a hundredths part
    while h % 10 == 0:                                  # non-trivial (input not already a tenth)
        h = rng.randrange(11, 1000)
    r = ((h + 5) // 10) * 10
    return (f"قرّب {_dec(h)} إلى أقرب جزءٍ من عشرة.", _dec(r), None)


# ============================ الجمع/الطرح بمحاذاة الفاصلة (g4DECADD) ============================

@register("g4DECADD", "add")
def decadd_add(rng, p):
    a = rng.randrange(1, 5000)
    while a % 100 == 0:                                 # keep a fractional part (alignment)
        a = rng.randrange(1, 5000)
    b = rng.randrange(1, 5000)
    while b % 100 == 0 or a + b >= 10000:              # b fractional; sum < 100
        b = rng.randrange(1, 5000)
    return (f"{_dec(a)} + {_dec(b)} = ؟", _dec(a + b), None)


@register("g4DECADD", "subtract")
def decadd_subtract(rng, p):
    a = rng.randrange(2, 10000)
    while a % 100 == 0:
        a = rng.randrange(2, 10000)
    b = rng.randrange(1, a)                             # 0 < b < a → positive difference
    while b % 100 == 0:
        b = rng.randrange(1, a)
    return (f"{_dec(a)} − {_dec(b)} = ؟", _dec(a - b), None)
