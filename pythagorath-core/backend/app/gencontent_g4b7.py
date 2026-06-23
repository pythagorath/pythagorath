"""G4 batch 7 — the geometry cluster, born live.

ONE new widget (the protractor, g4ANGLE — for QA+SA only); everything else reuses
G3/G1 widgets (shape-pick, element-count, coord-grid, position-scene). Classification
is bank-driven (the test transcribes the banks independently); angles are integer
degrees (0–180, multiples of 10); coordinates are exact ordered pairs.

Nodes (body checks 2026-06-15):
  • g4LINES (lines / angletype) — SA/QA/AE/KW/BH. Parallel/perpendicular/intersecting +
    acute/right/obtuse CLASSIFICATION. Oman OUT (no lines/angles). Pair ↔ g3GEO.
  • g4ANGLE (measure / draw) — QA + SA ONLY. Protractor MEASUREMENT/construction — a
    distinct act from classification; the NEW widget is built for its owners alone
    (cf. g4DECLINE). ANGLE-KW/AE reserved. NEW (no G3 analog).
  • g4SHAPES (classify / describe) — SIX. Triangles/quadrilaterals by sides/angles +
    element counts. Pair ↔ g3GEO (extension).
  • g4SYMM (line / rotational) — SA/OM/AE. Line symmetry + ROTATIONAL (new, SA). Pair ↔
    g3SYMM. SYMM-BH/KW reserved.
  • g4COORD (plot / read) — SA. Coordinate plane / ordered pair (coord-grid, range ≤10 —
    above G3's ≤6). Pair ↔ g3COORD (Bahrain-single → Saudi; no cross-country sym). COORD-BH reserved.
  • g4LOC (position / between) — OM. Relative position/direction (position-scene from G1) —
    a DISTINCT act from the coordinate plane (relative ≠ ordered pairs), so its OWN node
    (cf. g4DECLINE/g4METRIC). Pair ↔ G1 position.
DAG: g4LINES → g4ANGLE (classify before measure); the rest are roots.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2


# ============================ g4LINES (five) ============================

LINES_BANK = [
    ("خطّان لا يتقاطعان مهما امتدّا — ماذا يُسمّيان؟", "متوازيان", "متعامدان"),
    ("خطّان يتقاطعان مكوّنين زاويةً قائمة — ماذا يُسمّيان؟", "متعامدان", "متوازيان"),
    ("خطّان يلتقيان في نقطةٍ بزاويةٍ غيرِ قائمة — ماذا يُسمّيان؟", "متقاطعان", "متوازيان"),
    ("خطّان في مستوًى واحدٍ على بُعدٍ ثابتٍ بينهما — ماذا يُسمّيان؟", "متوازيان", "متقاطعان"),
]
ANGLETYPE_BANK = [
    ("زاويةٌ أصغرُ من الزاوية القائمة — ما نوعها؟", "حادّة", "منفرجة"),
    ("زاويةٌ أكبرُ من القائمة وأصغرُ من المستقيمة — ما نوعها؟", "منفرجة", "حادّة"),
    ("زاويةٌ قياسها ٩٠° — ما نوعها؟", "قائمة", "حادّة"),
    ("زاويةٌ قياسها ١٨٠° (خطٌّ مستقيم) — ما نوعها؟", "مستقيمة", "منفرجة"),
]


@register("g4LINES", "lines")
def lines_classify(rng, p):
    q, good, bad = rng.choice(LINES_BANK)
    return (q, good, _pick2(rng, good, bad))


@register("g4LINES", "angletype")
def angletype_classify(rng, p):
    q, good, bad = rng.choice(ANGLETYPE_BANK)
    return (q, good, _pick2(rng, good, bad))


# ============================ g4ANGLE (QA+SA — protractor) ============================

# widened from 14 to all 17 multiples of 10 in (0,180) — adds 10°, 90°, 170° (the source
# keeps angles to the nearest 10°, enforced by test_angle_degrees_in_range).
_ANGLES = list(range(10, 171, 10))


@register("g4ANGLE", "measure")
def angle_measure(rng, p):
    a = rng.choice(_ANGLES)
    good = f"{_h(a)}°"
    sup = 180 - a                                       # supplement = the wrong-scale misread
    bad = f"{_h(sup)}°" if sup != a else f"{_h(a + 10)}°"
    opts = [o["v"] for o in _pick2(rng, good, bad)["options"]]
    return ("اقرأ قياس الزاوية بالمنقلة.", good,
            {"kind": "protractor", "mode": "measure", "angle": a, "options": opts})


@register("g4ANGLE", "draw")
def angle_draw(rng, p):
    a = rng.choice(_ANGLES)
    return (f"اصنع زاويةً قياسها {_h(a)}° على المنقلة.", f"{_h(a)}°",
            {"kind": "protractor", "mode": "draw", "target": a})


# ============================ g4SHAPES (six) ============================

SHAPE_BANK = [
    ("مثلثٌ أضلاعه الثلاثة متساوية — ما نوعه؟", "متساوي الأضلاع", "متساوي الساقين"),
    ("مثلثٌ ضلعان منه متساويان فقط — ما نوعه؟", "متساوي الساقين", "مختلف الأضلاع"),
    ("مثلثٌ فيه زاويةٌ قائمة — ما نوعه؟", "قائم الزاوية", "حادّ الزوايا"),
    ("رباعيٌّ أضلاعه الأربعة متساوية وزواياه قائمة — ما اسمه؟", "مربّع", "مستطيل"),
    ("رباعيٌّ متقابلاته متساوية وزواياه قائمة وليس مربّعاً — ما اسمه؟", "مستطيل", "مربّع"),
    ("رباعيٌّ أضلاعه الأربعة متساوية وزواياه غيرُ قائمة — ما اسمه؟", "معيّن", "مربّع"),
]
DESCRIBE_BANK = [
    ("rectangle", "sides", 4, "كم ضلعاً للمستطيل؟"),
    ("triangle", "vertices", 3, "كم رأساً للمثلث؟"),
    ("pentagon", "sides", 5, "كم ضلعاً للمخمّس؟"),
    ("hexagon", "sides", 6, "كم ضلعاً للمسدّس؟"),
    ("square", "vertices", 4, "كم رأساً للمربّع؟"),
]


@register("g4SHAPES", "classify")
def shapes_classify(rng, p):
    q, good, bad = rng.choice(SHAPE_BANK)
    return (q, good, _pick2(rng, good, bad))


@register("g4SHAPES", "describe")
def shapes_describe(rng, p):
    shape, el, n, q = rng.choice(DESCRIBE_BANK)
    return (q, _h(n), {"kind": "element-count", "shape": shape, "element": el, "n": n})


# ============================ g4SYMM (SA/OM/AE) ============================

SYMM_LINE = [("square", True), ("circle", True), ("rectangle", True),
             ("pentagon", True), ("hexagon", True),
             ("triangle-scalene", False), ("l-shape", False)]
SYMM_ROT = [("square", True), ("circle", True), ("rectangle", True),
            ("l-shape", False), ("triangle-scalene", False)]


@register("g4SYMM", "line")
def symm_line(rng, p):
    shape, has = rng.choice(SYMM_LINE)
    good = "نعم" if has else "لا"
    return ("هل لهذا الشكل خطُّ تماثل؟", good,
            {"kind": "shape-pick", "show": shape, "options": [{"v": "نعم"}, {"v": "لا"}]})


@register("g4SYMM", "rotational")
def symm_rotational(rng, p):
    shape, has = rng.choice(SYMM_ROT)
    good = "نعم" if has else "لا"
    return ("هل يبقى الشكل مطابقاً لأصله بعد دورانٍ أقلَّ من دورةٍ كاملة؟ (تماثل دوراني)", good,
            {"kind": "shape-pick", "show": shape, "options": [{"v": "نعم"}, {"v": "لا"}]})


# ============================ g4COORD (SA) ============================

def _xy(x, y):
    return f"({_h(x)}، {_h(y)})"                        # matches the coord-grid widget's emit


@register("g4COORD", "plot")
def coord_plot(rng, p):
    mx = rng.choice([8, 10])
    x, y = rng.randrange(0, mx + 1), rng.randrange(0, mx + 1)
    return (f"ضع نقطةً عند الزوج المرتّب {_xy(x, y)}.", _xy(x, y),
            {"kind": "coord-grid", "mode": "plot", "max": mx, "target": [x, y]})


@register("g4COORD", "read")
def coord_read(rng, p):
    mx = rng.choice([8, 10])
    x, y = rng.randrange(0, mx + 1), rng.randrange(0, mx + 1)
    good = _xy(x, y)
    bad = _xy(y, x) if x != y else _xy(x, (y + 1) % (mx + 1))   # the order trap
    opts = [good, bad]
    rng.shuffle(opts)
    return ("ما إحداثيا النقطة المعلَّمة؟", good,
            {"kind": "coord-grid", "mode": "read", "max": mx, "point": [x, y], "options": opts})


# ============================ g4LOC (OM — position-scene) ============================

POS = [("فوق", "above"), ("تحت", "below"), ("يمين", "right"), ("يسار", "left")]
ITEMS = ["🐈", "🦜", "🎈", "⚽", "🌟", "🍎"]


@register("g4LOC", "position")
def loc_position(rng, p):
    target_word, _ = rng.choice(POS)
    items = rng.sample(ITEMS, 4)
    objs = [{"e": items[i], "v": w, "pos": pos} for i, (w, pos) in enumerate(POS)]
    return (f"انقر العنصر الذي يقع {target_word} الصندوق.", target_word,
            {"kind": "position-scene", "mode": "grid", "anchor": "📦", "objects": objs})


@register("g4LOC", "between")
def loc_between(rng, p):
    mid, out = rng.sample(ITEMS, 2)
    return ("انقر العنصر الذي يقع بين العَلَمين.", "بين",
            {"kind": "position-scene", "mode": "between", "anchor": "🚩", "anchor2": "🚩",
             "objects": [{"e": mid, "v": "بين", "pos": "between"},
                         {"e": out, "v": "خارج", "pos": "outside"}]})
