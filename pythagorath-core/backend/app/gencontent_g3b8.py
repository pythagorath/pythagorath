"""G3 batch 8 — the measurement cluster, born live.

Conversion factors live HERE and are transcribed independently in the test's
verifier (the cross-check). Elapsed time is a minute-difference; change is a
subtraction; estimate picks the order-of-magnitude-correct option. Zero new
widgets — measure(ruler/balance/container), clock (to the minute), money(total).
Caps: LEN ≤1000 (1m=1000mm), CAPMASS ≤3000 (3kg=3000g), TIME minutes ≤60,
MONEY ≤6000 (Oman u19's ٥,٦٠٠).
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

_HD = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")


def _dt(h, m):
    return f"{str(h).translate(_HD)}:{('0'+str(m) if m < 10 else str(m)).translate(_HD)}"


# ============================ g3LEN ============================

@register("g3LEN", "measure")
def len_measure(rng: random.Random, p: dict):
    n = rng.randrange(2, 13)
    return ("كم سنتيمتراً طول هذا الجسم؟ اقرأ المسطرة.", _h(n),
            {"kind": "measure", "mode": "ruler", "length": n, "max": n + rng.randrange(1, 4),
             "unit": "سم"})


# (from, to, factor) — multiply when going to the smaller unit
LEN_CONV = [("أمتار", "سنتيمتراً", 100), ("سنتيمترات", "ملمتراً", 10),
            ("متر", "ملمتراً", 1000)]
LEN_CONV_DOWN = [("سنتيمتر", "متراً", 100), ("ملمتر", "سنتيمتراً", 10)]


@register("g3LEN", "convert")
def len_convert(rng: random.Random, p: dict):
    if rng.random() < 0.6:                          # larger → smaller (multiply)
        u_from, u_to, f = rng.choice(LEN_CONV)
        v = rng.randrange(1, 1000 // f + 1)
        return (f"حوّل: {_h(v)} {u_from} = ؟ {u_to}", _h(v * f), None)
    u_from, u_to, f = rng.choice(LEN_CONV_DOWN)     # smaller → larger (divide, exact)
    q = rng.randrange(1, 10)
    return (f"حوّل: {_h(q * f)} {u_from} = ؟ {u_to}", _h(q), None)


# ============================ g3CAPMASS ============================

EST_BANK = [("كتلة البطيخة", "٣ كغم", "٣٠٠ كغم"), ("سعة الكوب", "٢٠٠ مل", "٢٠ لتراً"),
            ("كتلة التفاحة", "١٠٠ غم", "١٠ كغم"), ("سعة الدلو", "٨ لترات", "٨ مل"),
            ("كتلة القلم", "١٠ غم", "١٠ كغم"), ("سعة الملعقة", "٥ مل", "٥ لترات"),
            ("كتلة الكتاب", "٥٠٠ غم", "٥٠ كغم"), ("سعة زجاجة الماء", "١ لتر", "١ مل")]


@register("g3CAPMASS", "estimate")
def capmass_estimate(rng: random.Random, p: dict):
    obj, good, absurd = rng.choice(EST_BANK)
    return (f"قدِّر {obj} — أيُّ تقديرٍ معقول؟", good, _pick2(rng, good, absurd))


@register("g3CAPMASS", "measure")
def capmass_measure(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        n = rng.randrange(2, 10)
        return ("كم غراماً كتلة الجسم؟ أضِف أثقالاً حتى يتّزن الميزان.", _h(n),
                {"kind": "measure", "mode": "balance", "mass": n, "unit": "غم", "unitOne": "غراماً"})
    n = rng.randrange(2, 7)
    return ("كم كوباً يملأ هذا الإناء؟ اسكب حتى يمتلئ.", _h(n),
            {"kind": "measure", "mode": "container", "cups": n})


CM_CONV = [("كيلوغرام", "غراماً", 1000), ("لتر", "مللتراً", 1000)]
CM_CONV_DOWN = [("غرام", "كيلوغراماً", 1000), ("مللتر", "لتراً", 1000)]


@register("g3CAPMASS", "convert")
def capmass_convert(rng: random.Random, p: dict):
    if rng.random() < 0.5:                          # kg→g, l→ml (×1000)
        u_from, u_to, f = rng.choice(CM_CONV)
        v = rng.randrange(1, 3)                     # ≤ 2 → 2000 ≤ 3000 cap
        return (f"حوّل: {_h(v)} {u_from} = ؟ {u_to}", _h(v * f), None)
    u_from, u_to, f = rng.choice(CM_CONV_DOWN)      # g→kg, ml→l (÷1000, exact)
    q = rng.randrange(1, 4)
    return (f"حوّل: {_h(q * f)} {u_from} = ؟ {u_to}", _h(q), None)


# ============================ g3TIME3 ============================

@register("g3TIME3", "read")
def time_read(rng: random.Random, p: dict):
    h = rng.randrange(1, 13)
    m = rng.choice([5, 10, 15, 20, 25, 35, 40, 45, 50, 55])
    good = _dt(h, m)
    m2 = 60 - m if 60 - m not in (m, 0) else (m + 30) % 60
    bad1 = _dt(h, m2 if m2 else 30)
    bad2 = _dt(h % 12 + 1, m)
    opts = [good, bad1, bad2]
    rng.shuffle(opts)
    return ("كم الساعة؟ اقرأ القرص واختر الوقت الرقمي.", good,
            {"kind": "clock", "hour": h, "minute": m, "options": opts})


@register("g3TIME3", "elapsed")
def time_elapsed(rng: random.Random, p: dict):
    h = rng.randrange(1, 12)
    if rng.random() < 0.6:                          # same-hour duration
        m1 = rng.randrange(0, 40)
        dur = rng.randrange(10, min(60 - m1, 55) + 1)
        m2 = m1 + dur
        return (f"بدأ النشاط الساعة {_dt(h, m1)} وانتهى {_dt(h, m2)} — كم دقيقةً استغرق؟",
                _h(dur), None)
    m1 = rng.randrange(40, 56)                       # cross one hour
    dur = rng.randrange(10, 40)
    total = m1 + dur                                 # end hour carries when total ≥ 60
    end_h, end_m = h + total // 60, total % 60
    return (f"خرجت الحافلة الساعة {_dt(h, m1)} ووصلت {_dt(end_h, end_m)} — كم دقيقةً استغرقت الرحلة؟",
            _h(dur), None)


# ============================ g3MONEY3 ============================

BAISA = [5, 10, 25, 50, 100]


@register("g3MONEY3", "total")
def money_total(rng: random.Random, p: dict):
    if rng.random() < 0.5:                          # coins (بيسة) — the widget
        coins = [rng.choice(BAISA) for _ in range(rng.choice([2, 2, 3]))]
        return ("اجمع قيمة العملات (بالبيسة).", _h(sum(coins)),
                {"kind": "money", "mode": "total", "coins": coins})
    a = rng.randrange(5, 30) * 100                  # ريال amounts to thousands
    b = rng.randrange(5, 30) * 100
    if a + b > p.get("cap", 6000):
        b = p.get("cap", 6000) - a
    return (f"اجمع الثمنين: {_h(a)} ريال و{_h(b)} ريال = ؟ ريالاً", _h(a + b), None)


@register("g3MONEY3", "change")
def money_change(rng: random.Random, p: dict):
    if rng.random() < 0.5:                          # ريال (hundreds)
        paid = rng.randrange(5, 21) * 100
        price = rng.randrange(1, paid // 100) * 100 + rng.choice([0, 20, 50, 80])
        if price >= paid:
            price = paid - 100
        item = rng.choice(["اللعبة", "الكتاب", "الحقيبة", "القميص"])
        return (f"ثمن {item} {_h(price)} ريالاً، دفعتَ {_h(paid)} ريال — كم الباقي؟",
                _h(paid - price), None)
    paid = rng.choice([200, 300, 500])              # بيسة (small)
    price = rng.randrange(1, paid // 25) * 25
    if price >= paid:
        price = paid - 25
    return (f"معك {_h(paid)} بيسة، اشتريتَ بـ{_h(price)} بيسة — كم بقي؟",
            _h(paid - price), None)
