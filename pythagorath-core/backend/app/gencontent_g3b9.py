"""G3 batch 9 — perimeter / area / geometry / symmetry / coordinates, born live.

Verifiers recompute independently: perimeter 2(l+w) or l+w+w… ; area l×w; the
ordered pair matched coordinate-by-coordinate; geometry/symmetry against honest
finite fact banks (a square has 4 right angles; a scalene triangle has no
symmetry axis). g3COORD rides the one new widget (coord-grid).
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2


def _coord(x, y):
    return f"({_h(x)}، {_h(y)})"


# ============================ g3PERI ============================

@register("g3PERI", "compute")
def peri_compute(rng: random.Random, p: dict):
    shape = rng.randrange(3)
    if shape == 0:                                   # rectangle
        l, w = rng.randrange(2, 12), rng.randrange(2, 12)
        return (f"مستطيل طوله {_h(l)} سم وعرضه {_h(w)} سم — ما محيطه؟", _h(2 * (l + w)), None)
    if shape == 1:                                   # square
        s = rng.randrange(2, 15)
        return (f"مربع طول ضلعه {_h(s)} سم — ما محيطه؟", _h(4 * s), None)
    a, b, c = (rng.randrange(2, 9) for _ in range(3))  # triangle
    return (f"مثلث أطوال أضلاعه {_h(a)} و{_h(b)} و{_h(c)} سم — ما محيطه؟", _h(a + b + c), None)


@register("g3PERI", "unknown")
def peri_unknown(rng: random.Random, p: dict):
    if rng.random() < 0.5:                           # rectangle: given perim + one side
        l, w = rng.randrange(3, 12), rng.randrange(2, 10)
        per = 2 * (l + w)
        if rng.random() < 0.5:
            return (f"محيط مستطيل {_h(per)} سم وطوله {_h(l)} سم — ما عرضه؟", _h(w), None)
        return (f"محيط مستطيل {_h(per)} سم وعرضه {_h(w)} سم — ما طوله؟", _h(l), None)
    s = rng.randrange(2, 15)                          # square: given perim
    return (f"محيط مربع {_h(4 * s)} سم — ما طول ضلعه؟", _h(s), None)


@register("g3PERI", "relation")
def peri_relation(rng: random.Random, p: dict):
    if rng.random() < 0.6:
        per = rng.choice([12, 16, 20, 24])
        half = per // 2
        a = rng.randrange(1, half // 2 + 1)          # «square-ish» pair has the bigger area
        b = half - a
        near = (half // 2, half - half // 2)         # the most-square split
        far = (a, b)
        if near == far:
            far = (1, half - 1)
        ans = f"{_h(near[0])}×{_h(near[1])}"
        bad = f"{_h(far[0])}×{_h(far[1])}"
        return (f"مستطيلان محيطهما {_h(per)}: الأول {_h(far[0])}×{_h(far[1])} والثاني "
                f"{_h(near[0])}×{_h(near[1])} — أيهما مساحته أكبر؟", ans, _pick2(rng, ans, bad))
    return ("أيمكن لشكلين مختلفين أن يكون لهما المحيط نفسه؟", "نعم",
            _pick2(rng, "نعم", "لا"))


# ============================ g3AREA3 ============================

@register("g3AREA3", "multiply")
def area_multiply(rng: random.Random, p: dict):
    if rng.random() < 0.7:
        l, w = rng.randrange(2, 11), rng.randrange(2, 11)
        return (f"مستطيل {_h(l)} × {_h(w)} — ما مساحته بالمربعات؟ (الطول × العرض)",
                _h(l * w), None)
    s = rng.randrange(2, 11)
    return (f"مربع طول ضلعه {_h(s)} — ما مساحته؟", _h(s * s), None)


@register("g3AREA3", "distribute")
def area_distribute(rng: random.Random, p: dict):
    l = rng.choice([6, 7, 8, 9])
    w = rng.randrange(3, 8)
    s1 = 5
    s2 = l - 5
    return (f"مساحة {_h(l)} × {_h(w)} = ({_h(s1)} + {_h(s2)}) × {_h(w)} = "
            f"{_h(s1 * w)} + {_h(s2 * w)} = ؟", _h(l * w), None)


@register("g3AREA3", "composite")
def area_composite(rng: random.Random, p: dict):
    if rng.random() < 0.6:                           # two rectangles added
        a = (rng.randrange(2, 6), rng.randrange(2, 5))
        b = (rng.randrange(2, 6), rng.randrange(2, 5))
        return (f"شكلٌ مركّب من مستطيلين: {_h(a[0])}×{_h(a[1])} و{_h(b[0])}×{_h(b[1])} — "
                f"ما المساحة الكلية؟", _h(a[0] * a[1] + b[0] * b[1]), None)
    big = (rng.randrange(4, 8), rng.randrange(3, 6))  # a square cut out
    cut = rng.randrange(2, min(big) )
    return (f"غرفة {_h(big[0])}×{_h(big[1])} اقتُطع منها مربع {_h(cut)}×{_h(cut)} — "
            f"ما المساحة المتبقية؟", _h(big[0] * big[1] - cut * cut), None)


# ============================ g3GEO ============================

POLY = [("rectangle", "المستطيل", 4), ("square", "المربع", 4), ("triangle", "المثلث", 3),
        ("pentagon", "المخمّس", 5), ("hexagon", "المسدّس", 6)]


@register("g3GEO", "describe")
def geo_describe(rng: random.Random, p: dict):
    key, name, n = rng.choice(POLY)
    element = rng.choice(["sides", "vertices"])
    word, pl = ("ضلعاً", "أضلاع") if element == "sides" else ("رأساً", "رؤوس")
    return (f"كم {word} ل{name}؟", _h(n),
            {"kind": "element-count", "shape": key, "element": element, "n": n})


SHAPES2D = [("circle", "دائرة"), ("square", "مربع"), ("rectangle", "مستطيل"),
            ("triangle", "مثلث"), ("pentagon", "مخمّس"), ("hexagon", "مسدّس")]
ROLLERS = [("sphere", "كرة"), ("cylinder", "أسطوانة"), ("cone", "مخروط")]
FLATS = [("cube", "مكعب"), ("pyramid", "هرم")]


@register("g3GEO", "classify")
def geo_classify(rng: random.Random, p: dict):
    kind = rng.randrange(3)
    if kind == 0:                                    # the right-angled equilateral quad
        return ("أيُّ شكلٍ أضلاعه الأربعة متساوية وزواياه قائمة؟", "مربع",
                {"kind": "shape-pick", "options": [{"v": "مربع", "shape": "square"},
                                                   {"v": "مستطيل", "shape": "rectangle"}]})
    if kind == 1:                                    # name a polygon
        (k, name), (k2, other) = rng.sample(SHAPES2D, 2)
        opts = [{"v": name, "shape": k}, {"v": other, "shape": k2}]
        rng.shuffle(opts)
        return ("ما اسم هذا الشكل؟", name, {"kind": "shape-pick", "show": k, "options": opts})
    roller = rng.choice(ROLLERS)                     # which solid rolls
    flat = rng.choice(FLATS)
    opts = [{"v": roller[1], "shape": roller[0]}, {"v": flat[1], "shape": flat[0]}]
    rng.shuffle(opts)
    return ("أيُّ مجسّمٍ يتدحرج؟", roller[1], {"kind": "shape-pick", "options": opts})


# right-angle facts (Oman u26) — honest finite bank
RIGHT_ANGLES = {"المربع": 4, "المستطيل": 4, "المثلث القائم": 1, "الدائرة": 0}


@register("g3GEO", "analyze")
def geo_analyze(rng: random.Random, p: dict):
    if rng.random() < 0.6:
        shape, n = rng.choice(list(RIGHT_ANGLES.items()))
        return (f"كم زاوية قائمة في {shape}؟", _h(n), None)
    smaller = rng.random() < 0.5
    obj, ans = ("المثلث المتساوي الأضلاع", "أصغر") if smaller else ("الزاوية المنفرجة", "أكبر")
    return (f"زاوية {obj} — أكبر أم أصغر من القائمة؟", ans, _pick2(rng, ans, "أكبر" if smaller else "أصغر"))


# ============================ g3SYMM ============================

SYM_SHAPES = {"square": True, "rectangle": True, "circle": True, "triangle-iso": True,
              "triangle-scalene": False, "l-shape": False}


@register("g3SYMM", "symmetry")
def symm_symmetry(rng: random.Random, p: dict):
    shape, sym = rng.choice(list(SYM_SHAPES.items()))
    ans = "نعم" if sym else "لا"
    prompt = rng.choice(["هل لهذا الشكل خط تماثل؟", "أيمكن طيُّ هذا الشكل نصفين متطابقين؟"])
    v = _pick2(rng, ans, "لا" if ans == "نعم" else "نعم")
    v["show"] = shape
    return (prompt, ans, v)


CONG = ["circle", "square", "triangle", "rectangle", "pentagon"]


@register("g3SYMM", "congruence")
def symm_congruence(rng: random.Random, p: dict):
    if rng.random() < 0.7:
        same = rng.random() < 0.5
        s1 = rng.choice(CONG)
        s2 = s1 if same else rng.choice([s for s in CONG if s != s1])
        ans = "نعم" if same else "لا"
        v = _pick2(rng, ans, "لا" if ans == "نعم" else "نعم")
        v["pair"] = [s1, s2]
        return ("هل الشكلان متطابقان (نفس الشكل والحجم)؟", ans, v)
    move = rng.choice(["ربع دورة", "نصف دورة", "انسحاباً"])      # KW movement case
    return (f"بعد تحريك المربع {move} — أيبقى مطابقاً لأصله؟", "نعم", _pick2(rng, "نعم", "لا"))


# ============================ g3COORD ============================

@register("g3COORD", "plot")
def coord_plot(rng: random.Random, p: dict):
    x, y = rng.randrange(0, 7), rng.randrange(0, 7)
    return (f"ضع نقطةً عند الزوج المرتب {_coord(x, y)}.", _coord(x, y),
            {"kind": "coord-grid", "mode": "plot", "max": 6, "target": [x, y]})


@register("g3COORD", "read")
def coord_read(rng: random.Random, p: dict):
    x, y = rng.randrange(0, 7), rng.randrange(0, 7)
    good = _coord(x, y)
    bad = _coord(y, x) if x != y else _coord((x + 1) % 7, y)   # the swap misconception
    opts = [good, bad]
    rng.shuffle(opts)
    return ("ما إحداثيا النقطة المعلَّمة؟", good,
            {"kind": "coord-grid", "mode": "read", "max": 6, "point": [x, y], "options": opts})
