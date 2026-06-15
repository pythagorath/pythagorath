"""G4 batch 6 — the measurement cluster, born live.

All arithmetic is integer — no floats. Conversion factors live HERE and are
transcribed INDEPENDENTLY in the test verifier (the cross-check). Perimeter is
2(l+w)/4s and its inverse; area is l×w and the composite sum; elapsed time is a
minute difference; volume is l×w×h. ZERO new widgets — measure (ruler) and clock
are reused from G3; everything else is text.

Nodes (body checks 2026-06-15):
  • g4METRIC (convert / choose / measure) — FIVE (SA/QA/KW/AE/BH). Metric units +
    CONVERSIONS (the G4 advance, unifying G3's g3LEN + g3CAPMASS). **Oman OUT**: its
    G4 metric is «قياس» (measure-only, review-level) and it already did mass/capacity
    CONVERSION in G3 (g3CAPMASS) → no distinct G4 metric act. (convert must not leak
    to a non-owner — the node-level engine rule, cf. g4DECLINE.)
  • g4PERIM (compute / inverse) — SIX. Perimeter + the new unknown-side inverse.
    Oman ENTERS perimeter in G4 (was out in G3 by absence). Pair ↔ g3PERI.
  • g4AREA  (multiply / composite) — SIX. Area=L×W + composite. Oman ENTERS area.
    ROOT (NOT g4MUL1-dependent like g3AREA3): Oman owns G4 area but has NO G4
    multiplication node → the cross-domain edge can't carry; area uses assumed
    mult-facts. The g1AREA→Q4→g3AREA3→g4AREA ladder. Pair ↔ g3AREA3.
  • g4TIME  (read / elapsed) — OM + SA only (body-confirmed). TIME-BH/KW/AE RESERVED
    (their measurement chapters likely hold elapsed time but no direct citation —
    held like AE-FACT, no inclusion by guess). Pair ↔ g3TIME3.
  • g4VOL   (estimate / prism) — SA + AE. Volume V=l×w×h. **NEW act, no G3 analog.**
    Depends g4AREA (volume extends area to 3-D).

DAG: g4AREA → g4VOL is the ONLY edge; METRIC/PERIM/AREA/TIME are roots.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

_HD = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")


def _dt(h, m):
    return f"{str(h).translate(_HD)}:{('0' + str(m) if m < 10 else str(m)).translate(_HD)}"


# ============================ g4METRIC (five) ============================
# canonical scale to the smallest base of each dimension (mm / g / mL)
SCALE = {"mm": 1, "cm": 10, "m": 1000, "km": 1_000_000, "g": 1, "kg": 1000, "mL": 1, "L": 1000}
WORD = {"mm": "ملمتراً", "cm": "سنتيمتراً", "m": "متراً", "km": "كيلومتراً",
        "g": "غراماً", "kg": "كيلوغراماً", "mL": "مللتراً", "L": "لتراً"}
WORD_PL = {"mm": "ملمترات", "cm": "سنتيمترات", "m": "أمتار", "km": "كيلومترات",
           "g": "غرامات", "kg": "كيلوغرامات", "mL": "مللترات", "L": "لترات"}
PAIRS = [("m", "cm"), ("m", "mm"), ("cm", "mm"), ("km", "m"), ("kg", "g"), ("L", "mL")]


@register("g4METRIC", "convert")
def metric_convert(rng, p):
    big, small = rng.choice(PAIRS)
    f = SCALE[big] // SCALE[small]
    if rng.random() < 0.6:                              # larger → smaller (×factor)
        v = rng.randrange(1, 10)
        return (f"حوّل: {_h(v)} {WORD_PL[big]} = ؟ {WORD[small]}", _h(v * f), None)
    q = rng.randrange(1, 10)                            # smaller → larger (exact ÷)
    return (f"حوّل: {_h(q * f)} {WORD_PL[small]} = ؟ {WORD[big]}", _h(q), None)


CHOOSE = [("طول الملعب", "متر", "سنتيمتر"), ("طول القلم", "سنتيمتر", "متر"),
          ("كتلة التفاحة", "غرام", "كيلوغرام"), ("كتلة الطالب", "كيلوغرام", "غرام"),
          ("سعة كوب الماء", "مللتر", "لتر"), ("سعة الخزّان", "لتر", "مللتر"),
          ("المسافة بين مدينتين", "كيلومتر", "متر")]


@register("g4METRIC", "choose")
def metric_choose(rng, p):
    obj, good, bad = rng.choice(CHOOSE)
    return (f"أيُّ وحدةٍ أنسب لقياس {obj}؟", good, _pick2(rng, good, bad))


@register("g4METRIC", "measure")
def metric_measure(rng, p):
    n = rng.randrange(2, 13)
    return ("كم سنتيمتراً طول هذا الجسم؟ اقرأ المسطرة.", _h(n),
            {"kind": "measure", "mode": "ruler", "length": n,
             "max": n + rng.randrange(1, 4), "unit": "سم"})


# ============================ g4PERIM (six) ============================

@register("g4PERIM", "compute")
def perim_compute(rng, p):
    if rng.random() < 0.5:
        l, w = rng.randrange(2, 30), rng.randrange(2, 30)
        return (f"مستطيل طوله {_h(l)} وعرضه {_h(w)} — ما محيطه؟", _h(2 * (l + w)), None)
    s = rng.randrange(2, 30)
    return (f"مربّع طول ضلعه {_h(s)} — ما محيطه؟", _h(4 * s), None)


@register("g4PERIM", "inverse")
def perim_inverse(rng, p):
    l, w = rng.randrange(2, 30), rng.randrange(2, 20)
    P = 2 * (l + w)
    return (f"مستطيل محيطه {_h(P)} وطوله {_h(l)} — ما عرضه؟", _h(w), None)


# ============================ g4AREA (six, ROOT) ============================

@register("g4AREA", "multiply")
def area_multiply(rng, p):
    if rng.random() < 0.5:
        l, w = rng.randrange(2, 16), rng.randrange(2, 16)
        return (f"مستطيل طوله {_h(l)} وعرضه {_h(w)} — ما مساحته؟", _h(l * w), None)
    s = rng.randrange(2, 16)
    return (f"مربّع طول ضلعه {_h(s)} — ما مساحته؟", _h(s * s), None)


@register("g4AREA", "composite")
def area_composite(rng, p):
    l1, w1 = rng.randrange(2, 10), rng.randrange(2, 10)
    l2, w2 = rng.randrange(2, 10), rng.randrange(2, 10)
    return (f"شكلٌ مركّب من مستطيلين: الأول {_h(l1)}×{_h(w1)} والثاني {_h(l2)}×{_h(w2)} — ما المساحة الكلّية؟",
            _h(l1 * w1 + l2 * w2), None)


# ============================ g4TIME (OM + SA) ============================

@register("g4TIME", "read")
def time_read(rng, p):
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


@register("g4TIME", "elapsed")
def time_elapsed(rng, p):
    h = rng.randrange(1, 12)
    if rng.random() < 0.6:                              # same-hour duration
        m1 = rng.randrange(0, 40)
        dur = rng.randrange(10, min(60 - m1, 55) + 1)
        m2 = m1 + dur
        return (f"بدأ النشاط الساعة {_dt(h, m1)} وانتهى {_dt(h, m2)} — كم دقيقةً استغرق؟",
                _h(dur), None)
    m1 = rng.randrange(40, 56)                          # cross one hour
    dur = rng.randrange(10, 40)
    total = m1 + dur
    end_h, end_m = h + total // 60, total % 60
    return (f"خرجت الحافلة الساعة {_dt(h, m1)} ووصلت {_dt(end_h, end_m)} — كم دقيقةً استغرقت الرحلة؟",
            _h(dur), None)


# ============================ g4VOL (SA + AE — NEW) ============================

@register("g4VOL", "estimate")
def vol_estimate(rng, p):
    a, b, c = rng.randrange(2, 8), rng.randrange(2, 6), rng.randrange(2, 5)
    return (f"صندوقٌ مملوءٌ بمكعّبات الوحدة: {_h(a)} في الطول و{_h(b)} في العرض و{_h(c)} طبقات — كم مكعّباً يملؤه؟",
            _h(a * b * c), None)


@register("g4VOL", "prism")
def vol_prism(rng, p):
    a, b, c = rng.randrange(2, 11), rng.randrange(2, 11), rng.randrange(2, 11)
    return (f"متوازي مستطيلاتٍ أبعاده {_h(a)} و{_h(b)} و{_h(c)} — ما حجمه؟ (الطول×العرض×الارتفاع)",
            _h(a * b * c), None)
