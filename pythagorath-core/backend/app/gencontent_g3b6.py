"""G3 batch 6 — the FIRST nodes born live (no fixed-seed serving ever existed).

g3MUL10 / g3MULBIG / g3ORDOPS / g3DIVREM, generated from day one with the full
ratified kit: sampled context, shuffled options, source-verbatim wording (the
Kuwaiti child's own book phrase «٥ والباقي ٢»), range guards in the param space,
and transcribed independent verifiers + thresholds in tests/test_g3b6_generators.py.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2


@register("g3MUL10", "assoc")
def mul10_assoc(rng: random.Random, p: dict):
    k = rng.randrange(2, 10)
    d = rng.randrange(2, 10)
    while k * d * 10 > p.get("cap", 900):
        d -= 1
    return (f"{_h(k)} × {_h(d * 10)} = {_h(k)} × ({_h(d)} × ١٠) = ({_h(k)} × {_h(d)}) × ١٠ = ؟",
            _h(k * d * 10), None)


@register("g3MUL10", "shortcut")
def mul10_shortcut(rng: random.Random, p: dict):
    k = rng.randrange(2, 10)
    d = rng.randrange(2, 10)
    while k * d * 10 > p.get("cap", 900):
        d -= 1
    return (f"{_h(k)} × {_h(d)} = {_h(k * d)} — أكتب صفراً واحداً بعد الناتج: {_h(k)} × {_h(d * 10)} = ؟",
            _h(k * d * 10), None)


def _rename_factor_pair(rng):
    """2-digit × 1-digit with REAL renaming (the ones product carries)."""
    while True:
        n = rng.randrange(13, 90)
        k = rng.randrange(2, 10)
        if (n % 10) * k >= 10 and n * k <= 900:
            return n, k


@register("g3MULBIG", "algorithm")
def mulbig_algorithm(rng: random.Random, p: dict):
    if rng.random() < 0.7:
        n, k = _rename_factor_pair(rng)
    else:                                          # the 3-digit case
        while True:
            n = rng.randrange(112, 990)
            k = rng.randrange(2, 9)
            if (n % 10) * k >= 10 and n * k <= p.get("cap", 9000):
                break
    return (f"اضرب عمودياً (بإعادة التسمية): {_h(n)} × {_h(k)} = ؟", _h(n * k), None)


@register("g3MULBIG", "decompose")
def mulbig_decompose(rng: random.Random, p: dict):
    n, k = _rename_factor_pair(rng)
    tens, ones = n // 10 * 10, n % 10
    return (f"فكِّك: {_h(k)} × {_h(n)} = {_h(k)} × ({_h(tens)} + {_h(ones)}) = "
            f"{_h(k * tens)} + {_h(k * ones)} = ؟", _h(k * n), None)


@register("g3MULBIG", "hundreds")
def mulbig_hundreds(rng: random.Random, p: dict):
    k = rng.randrange(2, 10)
    h = rng.randrange(2, 10) * 100
    while k * h > p.get("cap", 9000):
        h -= 100
    return (f"{_h(k)} × {_h(h)} = ؟", _h(k * h), None)


@register("g3ORDOPS", "apply")
def ordops_apply(rng: random.Random, p: dict):
    a, b = rng.randrange(2, 10), rng.randrange(2, 10)
    prod = a * b
    form = rng.randrange(3)
    if form == 0:
        c = rng.randrange(2, min(40, p.get("cap", 100) - prod))
        return (f"{_h(a)} × {_h(b)} + {_h(c)} = ؟ (الضرب أولاً)", _h(prod + c), None)
    if form == 1:
        c = rng.randrange(1, prod)
        return (f"{_h(a)} × {_h(b)} − {_h(c)} = ؟", _h(prod - c), None)
    c = rng.randrange(2, min(40, p.get("cap", 100) - prod))
    return (f"{_h(c)} + {_h(a)} × {_h(b)} = ؟", _h(c + prod), None)


@register("g3ORDOPS", "justify")
def ordops_justify(rng: random.Random, p: dict):
    a, b = rng.randrange(2, 10), rng.randrange(2, 10)
    c = rng.randrange(2, 20)
    form = rng.randrange(3)
    if form == 0:
        op = rng.choice(["+", "−"])
        expr = f"{_h(a)} × {_h(b)} {op} {_h(c)}" if op == "+" or a * b > c else f"{_h(a)} × {_h(b)} + {_h(c)}"
        other = "الجمع" if "+" in expr else "الطرح"
        return (f"في {expr}: أيُّ عمليةٍ تُنفَّذ أولاً؟", "الضرب", _pick2(rng, "الضرب", other))
    if form == 1:
        expr = f"{_h(c)} + {_h(a)} × {_h(b)}"
        return (f"في {expr}: أيُّ عمليةٍ تُنفَّذ أولاً؟", "الضرب", _pick2(rng, "الضرب", "الجمع"))
    while True:                                    # the false add-first claim ≤ the cap
        a, b = rng.randrange(2, 7), rng.randrange(2, 7)
        c = rng.randrange(2, 10)
        wrong = (a + c) * b if rng.random() < 0.5 else a * (b + c)
        right = a * b + c
        if wrong != right and wrong <= p.get("cap", 100):
            break
    return (f"لو جمعتَ أولاً في {_h(a)} × {_h(b)} + {_h(c)} لحصلتَ على {_h(wrong)} — أيصحُّ ذلك؟",
            "لا", _pick2(rng, "لا", "نعم"))


@register("g3DIVREM", "quotrem")
def divrem_quotrem(rng: random.Random, p: dict):
    d = rng.randrange(2, 10)
    q = rng.randrange(2, 10)
    r = rng.randrange(1, d)
    n = q * d + r
    if n > p.get("cap", 99):
        return divrem_quotrem(rng, p)
    good = f"{_h(q)} والباقي {_h(r)}"
    # a WRONG pair that still looks plausible (book-format distractor)
    wq, wr = q - 1, r + d
    bad = f"{_h(wq)} والباقي {_h(wr)}"
    return (f"{_h(n)} ÷ {_h(d)} = ؟ — انقر الإجابة بصيغة الكتاب.", good,
            _pick2(rng, good, bad))


@register("g3DIVREM", "reason")
def divrem_reason(rng: random.Random, p: dict):
    form = rng.randrange(3)
    d = rng.randrange(3, 10)
    if form == 0:
        return (f"عند القسمة على {_h(d)}: ما أكبرُ باقٍ ممكن؟", _h(d - 1), None)
    if form == 1:
        q = rng.randrange(2, 9)
        n = q * d
        good = f"{_h(n + rng.randrange(1, d))} ÷ {_h(d)}"   # built ONCE (rng twice = bug)
        return ("أيُّ القسمتين لها باقٍ؟", good, _pick2(rng, good, f"{_h(n)} ÷ {_h(d)}"))
    q = rng.randrange(3, 9)
    r = rng.randrange(1, d)
    n = q * d + r
    if n > 99:
        return divrem_reason(rng, p)
    good = f"لأنّ {_h(d)} تصنع مجموعةً أخرى"
    bad = f"لأنّ {_h(r)} عددٌ زوجي" if r % 2 == 0 else f"لأنّ {_h(r)} عددٌ فردي"
    return (f"في {_h(n)} ÷ {_h(d)} الباقي {_h(r)} — لماذا لا يكون الباقي {_h(d)}؟",
            good, _pick2(rng, good, bad))


@register("g3DIVREM", "rename")
def divrem_rename(rng: random.Random, p: dict):
    while True:
        d = rng.randrange(2, 6)
        q = rng.randrange(11, 25)
        n = q * d
        # renaming is REAL only when the tens digit doesn't divide cleanly
        if n <= p.get("cap", 99) and (n // 10) % d != 0:
            break
    return (f"{_h(n)} ÷ {_h(d)} = ؟ (فُكَّ عشرةً لتقسم)", _h(q), None)
