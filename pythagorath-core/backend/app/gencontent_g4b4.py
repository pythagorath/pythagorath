"""G4 batch 4 (الكسور) — born live: the conceptually richest cluster.

Five nodes after the body checks (2026-06-14):
- g4FRAC (represent / number-line / mixed↔improper) — all six (Oman «استكشاف الكسور»
  + «الأعداد الكسرية» + «كسر من»). Mixed↔improper is a representation FAMILY here, not
  a node (the owner's ruling: a standalone lesson that is representation/conversion,
  not a distinct operation, stays a family).
- g4FREQ (equivalent / compare-by-rule / benchmark) — all six (Oman's fraction wall
  confirms equivalence at ≤12, the SAME range as the others — no Oman tier here).
- g4FRADD (add/sub LIKE denominators, + mixed/whole) — SA/BH/KW/QA/AE.
- g4FRADDX (add/sub UNLIKE denominators — find a common denominator first) — KW ONLY
  (idx60/64 «المقامات المختلفة»); a harder, separate behaviour (would leak as a family
  of the 5-country g4FRADD).
- g4FRMUL (fraction as a multiple of a unit fraction, × whole) — QA ONLY (و٩ «٣/٤=٣×١/٤»;
  AE و٩ is add/sub LIKE only, body-confirmed ص٥٨١; SA/BH/KW stop at add/sub).

DAG from the ACTUAL order: g4FRAC → g4FREQ → g4FRADD → {g4FRADDX, g4FRMUL}. All
denominators ≤ 12. Verifiers (cross-multiplication for equivalence; common-denominator
value + lowest terms for the operations) in tests/test_g4b4_generators.py.
"""
from __future__ import annotations

import random
from math import gcd

from app.generators import register
from app.gencontent import _h, _pick2

DENS = [2, 3, 4, 5, 6, 8, 10, 12]          # ≤12 — the G4 common body range


def _fr(k, n):
    return f"{_h(k)}/{_h(n)}"


def _reduce(num, den):
    g = gcd(num, den)
    return num // g, den // g


def _frac_out(num, den):
    """Lowest-terms fraction string (kept improper — «أبسط صورة» allows it)."""
    num, den = _reduce(num, den)
    return _fr(num, den)


# ============================ التمثيل (g4FRAC) ============================

@register("g4FRAC", "represent")
def frac_represent(rng, p):
    """«التمثيل/التسمية» — name the coloured fraction (the proven G3 fraction widget)."""
    n = rng.choice(DENS)
    k = rng.randrange(1, n)
    others = rng.sample([x for x in range(1, n + 1) if x != k], min(2, n - 1))
    opts = sorted({k, *others})
    return ("ما الكسر الملوّن؟ انقر الإجابة.", _fr(k, n),
            {"kind": "fraction", "mode": "name", "parts": n, "shaded": k,
             "options": [_fr(x, n) for x in opts]})


@register("g4FRAC", "numline")
def frac_numline(rng, p):
    """«الموضعة على خط الأعداد» — locate k/n (below or above 1)."""
    n = rng.choice(DENS)
    above = rng.random() < 0.4
    k = rng.randrange(n + 1, 2 * n) if above else rng.randrange(1, n)
    hint = " (أكبر من ١)" if above else ""
    return (f"انقر موضع {_fr(k, n)} على الخطّ{hint}.", _fr(k, n),
            {"kind": "number-line", "den": n, "maxWhole": 2 if above else 1})


@register("g4FRAC", "mixed")
def frac_mixed(rng, p):
    """«المختلط ↔ غير الفعليّ» — KW «العدد الكسري والكسر المركب» (a representation act)."""
    n = rng.choice([3, 4, 5, 6, 8])
    w = rng.randrange(1, 4)
    a = rng.randrange(1, n)
    improper = w * n + a
    if rng.random() < 0.5:                    # improper → mixed
        return (f"حوّل {_fr(improper, n)} إلى عددٍ كسري.", f"{_h(w)} و{_fr(a, n)}", None)
    return (f"حوّل العدد الكسري {_h(w)} و{_fr(a, n)} إلى كسرٍ غير فعليّ.",
            _fr(improper, n), None)


# ============================ التكافؤ والمقارنة (g4FREQ) ============================

@register("g4FREQ", "equiv")
def freq_equiv(rng, p):
    """«توليد المكافئ» — complete a/b = ?/d by the same multiplier."""
    b = rng.choice([2, 3, 4, 5, 6])
    a = rng.randrange(1, b)
    m = rng.randrange(2, 5)
    c, d = a * m, b * m
    if d > 12:
        return freq_equiv(rng, p)
    if rng.random() < 0.5:
        return (f"أكمل التكافؤ: {_fr(a, b)} = ؟/{_h(d)}", _h(c), None)
    return (f"أكمل التكافؤ: {_fr(a, b)} = {_h(c)}/؟", _h(d), None)


@register("g4FREQ", "rulecmp")
def freq_rulecmp(rng, p):
    """«المقارنة بقاعدة» — same denominator (bigger numerator) / same numerator (smaller
    denominator)."""
    if rng.random() < 0.5:                    # same denominator
        n = rng.choice(DENS)
        k1, k2 = rng.sample(range(1, n + 1), 2)
        a, b = _fr(k1, n), _fr(k2, n)
        ans = _fr(max(k1, k2), n)
    else:                                     # same numerator
        d1, d2 = rng.sample(DENS, 2)
        k = rng.randrange(1, min(d1, d2))
        a, b = _fr(k, d1), _fr(k, d2)
        ans = _fr(k, min(d1, d2))             # smaller denominator → bigger fraction
    return (f"انقر الكسرَ الأكبر: {a} أم {b}؟", ans, _pick2(rng, a, b))


@register("g4FREQ", "benchmark")
def freq_benchmark(rng, p):
    """«المقارنة بمرجع النصف» — which fraction is larger/smaller than ½."""
    n = rng.choice([4, 6, 8, 10, 12])
    above = rng.random() < 0.5
    big = rng.randrange(n // 2 + 1, n)
    small = rng.randrange(1, n // 2)
    ans = _fr(big, n) if above else _fr(small, n)
    return (f"أيُّ الكسرين {'أكبر' if above else 'أصغر'} من النصف: {_fr(big, n)} أم {_fr(small, n)}؟",
            ans, _pick2(rng, _fr(big, n), _fr(small, n)))


# ============================ جمع/طرح المتشابهة (g4FRADD) ============================

@register("g4FRADD", "add")
def fradd_add(rng, p):
    """«الجمع المتشابه» — a/n + b/n in lowest terms (kept non-whole)."""
    n = rng.choice([d for d in DENS if d >= 3])
    a = rng.randrange(1, n)
    b = rng.randrange(1, n)
    while (a + b) % n == 0:
        b = rng.randrange(1, n)
    return (f"{_fr(a, n)} + {_fr(b, n)} = ؟ (أبسط صورة)", _frac_out(a + b, n), None)


@register("g4FRADD", "subtract")
def fradd_subtract(rng, p):
    """«الطرح المتشابه» — a/n − b/n (a > b), lowest terms."""
    n = rng.choice([d for d in DENS if d >= 3])
    a, b = sorted(rng.sample(range(1, n + 1), 2), reverse=True)
    return (f"{_fr(a, n)} − {_fr(b, n)} = ؟ (أبسط صورة)", _frac_out(a - b, n), None)


@register("g4FRADD", "mixedwhole")
def fradd_mixedwhole(rng, p):
    """«المختلطة/عدد كلّي» — KW «جمع كسر مع عدد كلّي»: whole + proper fraction → mixed."""
    n = rng.choice([3, 4, 5, 6, 8])
    a = rng.randrange(1, n)
    w = rng.randrange(1, 4)
    return (f"{_h(w)} + {_fr(a, n)} = ؟", f"{_h(w)} و{_fr(a, n)}", None)


# ============================ جمع/طرح المختلفة (g4FRADDX) ============================

@register("g4FRADDX", "add")
def fraddx_add(rng, p):
    """«الجمع المختلف» — a/m + b/n via a common denominator (KW «المقامات المختلفة»)."""
    m, n = rng.sample([2, 3, 4, 6], 2)
    a, b = rng.randrange(1, m), rng.randrange(1, n)
    num, den = a * n + b * m, m * n
    while num % den == 0:                      # keep it non-whole
        a, b = rng.randrange(1, m), rng.randrange(1, n)
        num = a * n + b * m
    return (f"{_fr(a, m)} + {_fr(b, n)} = ؟ (أبسط صورة)", _frac_out(num, den), None)


@register("g4FRADDX", "subtract")
def fraddx_subtract(rng, p):
    """«الطرح المختلف» — a/m − b/n (positive) via a common denominator."""
    while True:
        m, n = rng.sample([2, 3, 4, 6], 2)
        a, b = rng.randrange(1, m), rng.randrange(1, n)
        if a * n - b * m > 0:
            break
    return (f"{_fr(a, m)} − {_fr(b, n)} = ؟ (أبسط صورة)", _frac_out(a * n - b * m, m * n), None)


# ============================ ضرب الكسور (g4FRMUL) ============================

@register("g4FRMUL", "unitmultiple")
def frmul_unit(rng, p):
    """«الكسر كمضاعف لكسر الوحدة» — QA و٩-١: write k/n as k × 1/n."""
    n = rng.choice([d for d in DENS if d >= 3])
    k = rng.randrange(2, n)
    return (f"اكتب {_fr(k, n)} في صورة مضاعفٍ لكسر الوحدة (؟ × 1/{_h(n)}).", _h(k), None)


@register("g4FRMUL", "times")
def frmul_times(rng, p):
    """«ضرب كسر × عدد كلّي» — k × a/n = ka/n, lowest terms."""
    n = rng.choice([d for d in DENS if d >= 3])
    k = rng.choice([x for x in range(2, 6) if x % n])   # n∤k ⇒ a non-whole product exists
    a = rng.randrange(1, n)
    while (k * a) % n == 0:                    # keep the product non-whole
        a = rng.randrange(1, n)
    return (f"{_h(k)} × {_fr(a, n)} = ؟ (أبسط صورة)", _frac_out(k * a, n), None)
