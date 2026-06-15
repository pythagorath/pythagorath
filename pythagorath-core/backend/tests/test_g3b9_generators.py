"""G3 batch 9 — geometry cluster, born live, independently verified.

Perimeter recomputed as 2(l+w)/4s/sum-of-sides; area as l×w; the ordered pair
matched coordinate-by-coordinate (the swap is the distractor); geometry/symmetry
against transcribed fact banks. g3COORD rides the new coord-grid widget.
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g3b9, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def v_peri_compute(pr, ans, vis):
    ns = _nums(pr)
    if "مستطيل" in pr:
        l, w = ns[:2]
        return _n1(ans) == 2 * (l + w)
    if "طول ضلعه" in pr:
        return _n1(ans) == 4 * ns[0]
    return _n1(ans) == sum(ns[:3])                   # triangle


def v_peri_unknown(pr, ans, vis):
    ns = _nums(pr)
    if "مربع" in pr and "مستطيل" not in pr:
        return _n1(ans) == ns[0] // 4
    per, side = ns[:2]
    return _n1(ans) == per // 2 - side


def v_peri_relation(pr, ans, vis):
    if "أيمكن" in pr:
        return ans == "نعم"
    # the more-square split has the larger area — recompute both products
    pairs = re.findall(r"([0-9٠-٩]+)×([0-9٠-٩]+)", pr)
    areas = [(int(a.translate(_W)) * int(b.translate(_W)),
              f"{a}×{b}") for a, b in pairs]
    big = max(areas, key=lambda x: x[0])[1]
    # answer is one of the displayed pairs and is the larger-area one
    aa, ab = _nums(ans)
    return aa * ab == max(a for a, _ in areas)


def v_area_multiply(pr, ans, vis):
    ns = _nums(pr)
    if "طول ضلعه" in pr:                              # square (not «بالمربعات»!)
        return _n1(ans) == ns[0] ** 2
    l, w = ns[:2]
    return _n1(ans) == l * w


def v_area_distribute(pr, ans, vis):
    l, w = _nums(pr)[:2]
    return _n1(ans) == l * w


def v_area_composite(pr, ans, vis):
    ns = _nums(pr)
    if "اقتُطع" in pr:
        bl, bw, c, c2 = ns[:4]
        return _n1(ans) == bl * bw - c * c
    a1, a2, b1, b2 = ns[:4]
    return _n1(ans) == a1 * a2 + b1 * b2


POLY_N = {"المستطيل": 4, "المربع": 4, "المثلث": 3, "المخمّس": 5, "المسدّس": 6}


def v_geo_describe(pr, ans, vis):
    name = pr.split("ل")[-1].rstrip("؟")
    n = POLY_N.get(name, vis["n"])
    return _n1(ans) == n == vis["n"]


SHAPE_AR = {"circle": "دائرة", "square": "مربع", "rectangle": "مستطيل",
            "triangle": "مثلث", "pentagon": "مخمّس", "hexagon": "مسدّس",
            "sphere": "كرة", "cylinder": "أسطوانة", "cone": "مخروط",
            "cube": "مكعب", "pyramid": "هرم"}
ROLLERS = {"sphere", "cylinder", "cone"}


def v_geo_classify(pr, ans, vis):
    if "أضلاعه الأربعة متساوية" in pr:
        return ans == "مربع"
    if "يتدحرج" in pr:
        chosen = next(o["shape"] for o in vis["options"] if o["v"] == ans)
        return chosen in ROLLERS
    return ans == SHAPE_AR[vis["show"]]


RIGHT_ANGLES = {"المربع": 4, "المستطيل": 4, "المثلث القائم": 1, "الدائرة": 0}


def v_geo_analyze(pr, ans, vis):
    if "كم زاوية قائمة" in pr:
        shape = pr.split("في ")[1].rstrip("؟")
        return _n1(ans) == RIGHT_ANGLES[shape]
    if "المتساوي الأضلاع" in pr:
        return ans == "أصغر"
    return ans == "أكبر"                              # obtuse


SYM = {"square": True, "rectangle": True, "circle": True, "triangle-iso": True,
       "triangle-scalene": False, "l-shape": False}


def v_symm_symmetry(pr, ans, vis):
    return ans == ("نعم" if SYM[vis["show"]] else "لا")


def v_symm_congruence(pr, ans, vis):
    if "تحريك" in pr or "دورة" in pr or "انسحاب" in pr:
        return ans == "نعم"
    a, b = vis["pair"]
    return ans == ("نعم" if a == b else "لا")


def _pair(s):
    a = _nums(s)
    return a[0], a[1]


def v_coord_plot(pr, ans, vis):
    x, y = vis["target"]
    px, py = _pair(ans)
    return px == x and py == y and ans == pr.split("عند ")[1].rstrip(".").replace("الزوج المرتب ", "")


def v_coord_read(pr, ans, vis):
    x, y = vis["point"]
    px, py = _pair(ans)
    others = [o for o in vis["options"] if o != ans]
    ox, oy = _pair(others[0])
    return px == x and py == y and not (ox == x and oy == y)   # the swap is wrong


VERIFIERS = {
    ("g3PERI", "compute"): v_peri_compute, ("g3PERI", "unknown"): v_peri_unknown,
    ("g3PERI", "relation"): v_peri_relation,
    ("g3AREA3", "multiply"): v_area_multiply, ("g3AREA3", "distribute"): v_area_distribute,
    ("g3AREA3", "composite"): v_area_composite,
    ("g3GEO", "describe"): v_geo_describe, ("g3GEO", "classify"): v_geo_classify,
    ("g3GEO", "analyze"): v_geo_analyze,
    ("g3SYMM", "symmetry"): v_symm_symmetry, ("g3SYMM", "congruence"): v_symm_congruence,
    ("g3COORD", "plot"): v_coord_plot, ("g3COORD", "read"): v_coord_read,
}

CAPS = {"g3PERI": 80, "g3AREA3": 100, "g3GEO": 6, "g3SYMM": 6, "g3COORD": 6}
FLOORS = {"g3PERI": 33, "g3AREA3": 35, "g3GEO": 20, "g3SYMM": 12, "g3COORD": 30}


def test_batch9_registered():
    for code in CAPS:
        assert code in generators.REGISTRY


def test_families_match_templates_exactly(db):
    for code in CAPS:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl = set(db.execute(select(Question.family).where(
            Question.skill_id == skill.id, Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl, code


def test_500_samples_verified_and_capped():
    rng = random.Random(2026)
    for (code, family), check in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        for _ in range(500):
            pr, ans, vis = gen(rng, {})
            assert check(pr, ans, vis), (code, family, pr, ans, vis)
            blob = pr + " " + ans + " " + (json.dumps(vis, ensure_ascii=False) if vis else "")
            over = [n for n in _nums(blob) if n > CAPS[code]]
            assert not over, (code, family, pr, over)


def test_perimeter_and_area_independent_400():
    rng = random.Random(13)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g3PERI"]["compute"](rng, {})
        assert v_peri_compute(pr, ans, vis)
        pr, ans, vis = generators.REGISTRY["g3AREA3"]["multiply"](rng, {})
        assert v_area_multiply(pr, ans, vis)


def test_coord_pair_not_swappable_400():
    rng = random.Random(17)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g3COORD"]["read"](rng, {})
        x, y = vis["point"]
        px, py = _pair(ans)
        assert px == x and py == y


def test_options_order_is_shuffled():
    rng = random.Random(7)
    for (code, family), _ in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            opts = vis.get("options") if vis else None
            if opts:
                flat = [o["v"] if isinstance(o, dict) else o for o in opts]
                if ans in flat:
                    positions.add(flat.index(ans))
        if positions:
            assert len(positions) >= 2, (code, family)


def test_variation_guard_batch9():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
