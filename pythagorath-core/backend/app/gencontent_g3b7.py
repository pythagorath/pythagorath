"""G3 batch 7 — the fractions cluster, born live.

Denominator law: regions ≤ 8 (the five owners' common body range); FRSET3 sets
≤ 10 (Kuwait's verbatim «حتى مقام ≤ ١٠»); FRLINE values ≤ 2 (improper above one,
the enVision register); DEC numerators ≤ 100 over 10/100 grids. The equivalence
verifier is the CROSS-MULTIPLICATION check (a/b = c/d ⇔ ad = bc); the take
verifier divides; the decimal verifier converts independently.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

DENS = [2, 3, 4, 6, 8]


def _fr(k, n):
    return f"{_h(k)}/{_h(n)}"


@register("g3FRAC", "name")
def frac_name(rng: random.Random, p: dict):
    n = rng.choice(DENS)
    k = rng.randrange(1, n + 1)
    others = sorted(rng.sample([x for x in range(1, n + 1) if x != k],
                               min(2, n - 1)))
    opts = sorted({k, *others})
    return ("ما الكسر الملوّن؟ انقر الإجابة.", _fr(k, n),
            {"kind": "fraction", "mode": "name", "parts": n, "shaded": k,
             "options": [_fr(x, n) for x in opts]})


@register("g3FRAC", "shade")
def frac_shade(rng: random.Random, p: dict):
    n = rng.choice(DENS)
    k = rng.randrange(1, n)
    return (f"ظلِّل {_h(k)} من {_h(n)} أجزاء متساوية.", _fr(k, n),
            {"kind": "fraction", "mode": "shade", "parts": n, "target": k})


@register("g3FRAC", "whole")
def frac_whole(rng: random.Random, p: dict):
    n = rng.choice(DENS)
    k = rng.randrange(1, max(2, n // 2))
    if k == 1:
        return (f"هذه القطعة تمثِّل ١/{_h(n)} الشكل — فمن كم جزءٍ يتكوَّن الشكل كاملاً؟",
                _h(n), None)
    return (f"{_h(k)} قطعٍ تمثِّل {_fr(k, n)} الشكل — فكم قطعةً يحتاج الشكل كاملاً؟",
            _h(n), None)


@register("g3FRLINE", "below")
def frline_below(rng: random.Random, p: dict):
    n = rng.choice([2, 3, 4, 5, 6, 8])             # widened (+2, +5) — more denominators
    k = rng.randrange(1, n)
    return (f"انقر موضع {_fr(k, n)} على الخطّ.", _fr(k, n),
            {"kind": "number-line", "den": n, "maxWhole": 1})


@register("g3FRLINE", "above")
def frline_above(rng: random.Random, p: dict):
    n = rng.choice([3, 4, 5, 6])                    # widened (+5); den 8 above 1 → too many ticks
    k = rng.randrange(n + 1, 2 * n)
    return (f"انقر موضع {_fr(k, n)} على الخطّ (أكبر من ١).", _fr(k, n),
            {"kind": "number-line", "den": n, "maxWhole": 2})


@register("g3FREQ", "equiv")
def freq_equiv(rng: random.Random, p: dict):
    base = rng.choice([(1, 2), (1, 3), (2, 3), (1, 4), (3, 4)])
    m = rng.choice([2, 3]) if base[1] * 3 <= 8 else 2
    a, b = base
    c, d = a * m, b * m
    if d > 8:
        m = 2
        c, d = a * 2, b * 2
    form = rng.randrange(3)
    if form == 0:                                   # visual twin-models
        return ("انقر الكسرَ المكافئ للكسر الأول نفسِه ظلاً.", _fr(c, d),
                {"kind": "fraction", "mode": "compare",
                 "a": {"parts": b, "shaded": a}, "b": {"parts": d, "shaded": c}})
    if form == 1:
        return (f"أكمل التكافؤ: {_fr(a, b)} = ؟/{_h(d)}", _h(c), None)
    return (f"أكمل التكافؤ: {_fr(a, b)} = {_h(c)}/؟", _h(d), None)


def _distinct_value_fractions(rng: random.Random, k: int):
    """k proper fractions (dens from DENS) with PAIRWISE-DISTINCT VALUES — so ordering by
    value is unambiguous (no ١/٢ vs ٢/٤ ties)."""
    pool, seen = [], set()
    for d in DENS:
        for num in range(1, d):
            v = num / d
            if round(v, 6) not in seen:
                seen.add(round(v, 6))
                pool.append((num, d, v))
    return rng.sample(pool, k)


@register("g3FREQ", "rulecmp")
def freq_rulecmp(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        # NEW interaction: drag-to-order fractions BY VALUE (the skill's «مقارنة» act). Three
        # distinct-valued proper fractions; correct order is by k/n, not by appearance. Answer =
        # the sequence joined by «،» (the drag-order widget renders/keeps fraction strings) —
        # graded as a plain string. No engine/mastery change.
        chosen = _distinct_value_fractions(rng, 3)
        asc = rng.random() < 0.5
        correct = sorted(chosen, key=lambda t: t[2], reverse=not asc)
        shown = chosen[:]
        while [(n, d) for n, d, _ in shown] == [(n, d) for n, d, _ in correct]:
            rng.shuffle(shown)                      # never show it already ordered
        return (f"رتّب الكسور {'تصاعدياً' if asc else 'تنازلياً'} بسحبها إلى أماكنها.",
                "،".join(_fr(n, d) for n, d, _ in correct),
                {"kind": "drag-order", "items": [_fr(n, d) for n, d, _ in shown],
                 "direction": "asc" if asc else "desc"})
    n = rng.choice([3, 4, 6, 8])
    if rng.random() < 0.5:                          # same denominator
        k1, k2 = rng.sample(range(1, n), 2)
        a, b = {"parts": n, "shaded": k1}, {"parts": n, "shaded": k2}
        ans = _fr(max(k1, k2), n)
    else:                                           # same numerator (unit-style)
        d1, d2 = rng.sample(DENS, 2)
        k = 1
        a, b = {"parts": d1, "shaded": k}, {"parts": d2, "shaded": k}
        ans = _fr(k, min(d1, d2))
    return ("انقر الكسر الأكبر.", ans,
            {"kind": "fraction", "mode": "compare", "a": a, "b": b})


@register("g3FREQ", "benchmark")
def freq_benchmark(rng: random.Random, p: dict):
    n = rng.choice([4, 6, 8])
    big = rng.randrange(n // 2 + 1, n)
    small = rng.randrange(1, n // 2)
    above = rng.random() < 0.5
    ans = _fr(big, n) if above else _fr(small, n)
    other = _fr(small, n) if above else _fr(big, n)
    return (f"أيُّ الكسرين {'أكبر' if above else 'أصغر'} من النصف: {_fr(big, n)} أم {_fr(small, n)}؟",
            ans, _pick2(rng, ans, other))


SET_ITEMS = [("كرات", "زرقاء"), ("علب", "حمراء"), ("طيور", "بيضاء"), ("أقلام", "جديدة")]


@register("g3FRSET3", "express")
def frset3_express(rng: random.Random, p: dict):
    n = rng.randrange(4, p.get("cap", 10) + 1)
    k = rng.randrange(1, n)
    items, adj = rng.choice(SET_ITEMS)
    good = _fr(k, n)
    bad = _fr(n - k, n) if n - k != k else _fr(k, n - 1)
    return (f"في المجموعة {_h(n)} {items}، {_h(k)} منها {adj} — ما كسر ال{items} ال{adj}؟",
            good, _pick2(rng, good, bad))


@register("g3FRSET3", "take")
def frset3_take(rng: random.Random, p: dict):
    d = rng.choice([2, 3, 4, 5])
    mult = rng.randrange(1, p.get("cap", 10) // d + 1)
    total = d * mult
    k = rng.randrange(1, d + 1)
    ans = total // d * k
    vis = ({"kind": "groups", "mode": "share", "total": total, "groups": d}
           if rng.random() < 0.6 else None)
    return (f"ما {_fr(k, d)} الـ {_h(total)}؟" + (" (وزِّع وخُذ حصصك)" if vis else ""),
            _h(ans), vis)


@register("g3DEC", "grid")
def dec_grid(rng: random.Random, p: dict):
    if rng.random() < 0.5:                          # tenths strip
        k = rng.randrange(1, 10)
        good = f"٠٫{_h(k)}"
        bad = f"٠٫{_h(10 - k)}" if 10 - k != k else f"٠٫{_h(k - 1 or 1)}"
        return ("اقرأ الشبكة واختر الصورة العشرية.", good,
                {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 1,
                 "shaded": k, "options": [x["v"] for x in _pick2(rng, good, bad)["options"]]})
    k = rng.randrange(5, 96)
    good = f"٠٫{_h(k).zfill(2) if False else _h(k) if k >= 10 else '٠' + _h(k)}"
    swapped = int(str(k).zfill(2)[::-1])
    bad = f"٠٫{_h(swapped) if swapped >= 10 else '٠' + _h(swapped)}"
    if bad == good:
        bad = f"٠٫{_h((k + 10) % 100 or 5)}"
    return ("شبكة المئة: اختر الصورة العشرية للجزء الملوّن.", good,
            {"kind": "fraction", "mode": "grid", "cols": 10, "rows": 10,
             "shaded": k, "options": [x["v"] for x in _pick2(rng, good, bad)["options"]]})


@register("g3DEC", "convert")
def dec_convert(rng: random.Random, p: dict):
    form = rng.randrange(3)
    if form == 0:                                   # fraction → decimal
        if rng.random() < 0.5:
            k = rng.randrange(1, 10)
            good, bad = f"٠٫{_h(k)}", f"{_h(k)}٫٠"
            return (f"اكتب {_fr(k, 10)} بالصورة العشرية.", good, _pick2(rng, good, bad))
        k = rng.randrange(11, 99)
        good = f"٠٫{_h(k)}"
        bad = f"{_h(k // 10)}٫{_h(k % 10)}"
        return (f"اكتب {_fr(k, 100)} بالصورة العشرية.", good, _pick2(rng, good, bad))
    if form == 1:                                   # decimal → fraction
        k = rng.randrange(11, 99)
        good, bad = _fr(k, 100), _fr(k, 10)
        return (f"اكتب ٠٫{_h(k)} كسراً اعتيادياً.", good, _pick2(rng, good, bad))
    k = rng.randrange(1, 10)                        # tenth↔hundredth equivalence (body)
    same = rng.random() < 0.5
    other = k * 10 if same else k * 10 + rng.randrange(1, 9)
    ans = "نعم" if same else "لا"
    return (f"هل يمثِّل {_fr(k, 10)} و{_fr(other, 100)} العددَ نفسه؟", ans,
            _pick2(rng, ans, "لا" if ans == "نعم" else "نعم"))
