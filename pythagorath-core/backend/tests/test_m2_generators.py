"""M2 — the 27 HIGH-risk nodes' live generators, verified independently.

Same harness as m1: transcribed verifiers ×500 samples, numeral caps, variation
floors (honest for finite banks), families == template families, shuffled
options, and an Arabic-agreement scan (no singular-منصوب noun after 3–10, no
plural noun after 11+ in the story nodes — the R2-style linguistic guard).
"""
import json
import re
import random

import pytest
from sqlalchemy import select

from app import gencontent_m2, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(text):
    return [int(m) for m in re.findall(r"[0-9]+", str(text).translate(_W))]


def _n1(text):
    return _nums(text)[0]


DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
TIME_UNITS = ["الدقيقة", "الساعة", "اليوم", "الأسبوع", "الشهر", "السنة"]
COLOR_AR = {"red": ("حمراء", "أحمر"), "blue": ("زرقاء", "أزرق"),
            "green": ("خضراء", "أخضر"), "yellow": ("صفراء", "أصفر")}
SHAPE_AR = {"circle": "دائرة", "square": "مربع", "rectangle": "مستطيل",
            "triangle": "مثلث", "pentagon": "مخمّس", "hexagon": "مسدّس",
            "cube": "مكعب", "sphere": "كرة", "cylinder": "أسطوانة",
            "cone": "مخروط", "pyramid": "هرم"}
G3_TRUTH = {("cube", "faces"): 6, ("cube", "vertices"): 8, ("cube", "edges"): 12,
            ("pyramid", "faces"): 5, ("pyramid", "vertices"): 5, ("pyramid", "edges"): 8}
ORD_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"]
LETTERS4 = ["أ", "ب", "ج", "د"]


# ---------- verifiers ----------

def v_total_groups(pr, ans, vis):
    return _n1(ans) == vis["groups"] * vis["per"]


def v_total_array(pr, ans, vis):
    return _n1(ans) == vis["rows"] * vis["cols"]


def v_m4(pr, ans, vis):
    n1, n2 = _nums(pr)[:2]
    return _n1(ans) == n1 * n2 and 3 <= n1 <= 9 and 3 <= n2 <= 9


def v_share(pr, ans, vis):
    return vis["total"] % vis["groups"] == 0 and _n1(ans) == vis["total"] // vis["groups"]


def v_v2(pr, ans, vis):
    total, g = _nums(pr)[:2]
    return total % g == 0 and _n1(ans) == total // g and total >= 11


def v_measure_groups(pr, ans, vis):
    return vis["total"] % vis["per"] == 0 and _n1(ans) == vis["total"] // vis["per"]


def v_da1(pr, ans, vis):
    data = dict((c, n) for c, n in vis["data"])
    if vis["ask"] == "count":
        return _n1(ans) == data[vis["cat"]]
    return ans == max(data, key=data.get) and len(set(data.values())) == 3


def v_da2(pr, ans, vis):
    return _n1(ans) == vis["target"] == _n1(pr)


def v_da3_certainty(pr, ans, vis):
    balls = dict((c, n) for c, n in vis["balls"])
    ev = vis["event"]
    if set(balls) == {ev}:
        return ans == "أكيد"
    if ev not in balls:
        return ans == "مستحيل"
    return ans == "ممكن"


def v_da3_more(pr, ans, vis):
    balls = vis["balls"]
    winner = max(balls, key=lambda b: b[1])[0]
    return ans == COLOR_AR[winner][1] and balls[0][1] != balls[1][1]


def v_fr2(pr, ans, vis):
    a, b = vis["a"], vis["b"]
    va = a["shaded"] / a["parts"]
    vb = b["shaded"] / b["parts"]
    bigger = a if va > vb else b
    return ans == f"{_h(bigger['shaded'])}/{_h(bigger['parts'])}" and va != vb


def _h(n):
    return str(n).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


def v_q1(pr, ans, vis):
    key = {"ruler": "length", "balance": "mass", "container": "cups"}[vis["mode"]]
    return _n1(ans) == vis[key]


def v_q5(pr, ans, vis):
    if "وحدةٍ" in pr:
        named = [u for u in TIME_UNITS if u in pr.split(":")[1]]
        want_long = "الأطول" in pr
        target = max(named, key=TIME_UNITS.index) if want_long else min(named, key=TIME_UNITS.index)
        return ans == target
    if "رتّب زمنياً" in pr:
        seq = pr.split(":")[1].split("—")[0]
        order = [w.strip("،  ُ") for w in seq.split("،")]
        want_first = "أوّل" in pr
        target = order[0] if want_first else order[-1]
        return target.startswith(ans) or ans in target
    day = next(d for d in DAYS if d in pr.split("يأتي")[1])
    i = DAYS.index(day)
    return ans == (DAYS[(i + 1) % 7] if "بعد" in pr else DAYS[(i - 1) % 7])


def v_s1(pr, ans, vis):
    a, b = _nums(pr)[:2]
    if "كم بقي" in pr:
        return _n1(ans) == a - b and a > b
    return _n1(ans) == a + b


def v_s2(pr, ans, vis):
    nums = _nums(pr)
    start = nums[0]
    body = pr.split("،", 1)[1]
    first, second = body.split(" ثم ")
    def signed(part, val):
        return -val if any(w in part for w in ("أعط", "اشترت بـ", "اشترى بـ", "أهد")) else val
    # gain verbs: اشترى/اشترت (بلا بـ), حصلت على — disambiguate by «بـ»
    def delta(part, val):
        if "بـ" in part or "أعط" in part or "أهد" in part:
            return -val
        return val
    cur = start + delta(first, nums[1]) + delta(second, nums[2])
    return _n1(ans) == cur and cur >= 0


def v_p(pr, ans, vis):
    seq = vis["seq"]
    if vis["itemType"] == "shape":
        for L in (2, 3):
            unit = seq[:L]
            if all(seq[i] == unit[i % L] for i in range(len(seq))):
                return ans == SHAPE_AR[unit[len(seq) % L]]
        return False
    if seq[0] == seq[2] and seq[1] == seq[3] and seq[0] != seq[1]:
        return _n1(ans) == seq[0]                  # repeating
    d = seq[1] - seq[0]
    if all(seq[i + 1] - seq[i] == d for i in range(len(seq) - 1)):
        return _n1(ans) == seq[-1] + d             # skip-count
    return False


def v_ord(pr, ans, vis):
    pos = next(i for i, n in enumerate(ORD_NAMES) if n in pr)
    return ans == LETTERS4[pos] and pos < len(vis["options"])


def v_recognize(pr, ans, vis):
    return ans == SHAPE_AR[vis["show"]] and any(o["v"] == ans for o in vis["options"])


def v_g3(pr, ans, vis):
    return _n1(ans) == G3_TRUTH[(vis["solid"], vis["element"])] == vis["n"]


def v_a2(pr, ans, vis):
    if vis["kind"] == "subtract-blocks":
        m, s = vis["minuend"], vis["subtract"]
    elif vis["kind"] == "number-line":
        m, s = vis["start"], vis["jump"]
    else:
        m, s = vis["minuend"], vis["subtrahend"]
    return _n1(ans) == m - s and (m % 10) < (s % 10)          # genuine borrow


def v_b2(pr, ans, vis):
    if vis["kind"] == "ten-frame":
        a, b = vis["start"], vis["add"]
        return _n1(ans) == a + b and a + b > 10
    if vis["kind"] == "number-line":
        a, b = vis["start"], vis["jump"]
        return _n1(ans) == a + b and a + b > 10
    a, b = vis["a"], vis["b"]
    return _n1(ans) == a + b - 10 and a + b > 10              # the make-ten remainder


def v_b3(pr, ans, vis):
    if vis["kind"] == "subtract-blocks":
        m, s = vis["minuend"], vis["subtract"]
    elif vis["kind"] == "number-line":
        m, s = vis["start"], vis["jump"]
    else:
        m, s = vis["minuend"], vis["subtrahend"]
    return _n1(ans) == m - s and 10 < m < 20 and m - s < 10   # crosses down through ten


def v_b4(pr, ans, vis):
    if vis["kind"] == "base-ten-blocks":
        a, b = vis["start"], vis["add"]
    elif vis["kind"] == "number-line":
        a, b = vis["start"], vis["jump"]
    else:
        a, b = vis["a"], vis["b"]
    return _n1(ans) == a + b and (a % 10) + (b % 10) <= 9     # genuinely regroup-free


def v_f12(pr, ans, vis):
    a, b = _nums(pr)[:2]
    if "−" not in pr:
        return _n1(ans) + a == b if pr.split("؟")[1].strip().startswith("+") or "؟ +" in pr \
            else a + _n1(ans) == b
    if "؟ −" in pr:
        return _n1(ans) - a == b
    return a - _n1(ans) == b


def v_g1add(pr, ans, vis):
    if vis:
        return _n1(ans) == vis["start"] + vis["add"] and vis["start"] + vis["add"] <= 10
    a, b = _nums(pr)[:2]
    return _n1(ans) == a + b and a + b <= 10


def v_g1half_judge(pr, ans, vis):
    w = vis["widths"]
    return ans == ("متساوية" if len(set(w)) == 1 else "غير متساوية")


def v_fraction_name(pr, ans, vis):
    return ans == f"{_h(vis['shaded'])}/{_h(vis['parts'])}" and ans in vis["options"]


def v_fraction_shade(pr, ans, vis):
    return ans == f"{_h(vis['target'])}/{_h(vis['parts'])}"


VERIFIERS = {
    ("M1", "خطّي"): v_total_groups, ("M1", "مصفوفة"): v_total_array,
    ("M4", "نمذجة"): v_m4,
    ("V1", "توزيع"): v_share, ("V2", "نمذجة"): v_v2, ("V3", "قياس"): v_measure_groups,
    ("DA1", "صور"): v_da1, ("DA1", "أعمدة"): v_da1,
    ("DA2", "إشارات"): v_da2, ("DA2", "أعمدة"): v_da2,
    ("DA3", "حتمية"): v_da3_certainty, ("DA3", "مقارنة"): v_da3_more,
    ("Fr2", "مقارنة"): v_fr2, ("Fr3", "مجموعة"): v_share,
    ("Q1", "طول"): v_q1, ("Q1", "كتلة"): v_q1, ("Q1", "سعة"): v_q1,
    ("Q5", "ترتيب"): v_q5,
    ("S1", "نمذجة"): v_s1, ("S2", "نمذجة"): v_s2,
    ("P", "نمط"): v_p, ("Ord", "ترتيبي"): v_ord,
    ("G1", "تعرّف"): v_recognize, ("G2", "تعرّف"): v_recognize, ("G3", "عدّ"): v_g3,
    ("A2", "aggregative"): v_a2, ("A2", "magnitude"): v_a2, ("A2", "decompositional"): v_a2,
    ("B2", "aggregative"): v_b2, ("B2", "magnitude"): v_b2, ("B2", "decompositional"): v_b2,
    ("B3", "aggregative"): v_b3, ("B3", "magnitude"): v_b3, ("B3", "decompositional"): v_b3,
    ("B4", "aggregative"): v_b4, ("B4", "magnitude"): v_b4, ("B4", "decompositional"): v_b4,
    ("F12", "decompositional"): v_f12,
    ("g1ADD", "aggregative"): v_g1add, ("g1ADD", "symbolic"): v_g1add,
    ("g1HALF", "judge"): v_g1half_judge, ("g1HALF", "name"): v_fraction_name,
    ("g1HALF", "shade"): v_fraction_shade,
    ("g1QRT", "name"): v_fraction_name, ("g1QRT", "shade"): v_fraction_shade,
}

CAPS = {"M1": 49, "M4": 81, "V1": 40, "V2": 40, "V3": 30, "DA1": 8, "DA2": 10,
        "DA3": 9, "Fr2": 6, "Fr3": 12, "Q1": 10, "Q5": 7, "S1": 20, "S2": 30,
        "P": 30, "Ord": 4, "G1": 9, "G2": 9, "G3": 12, "A2": 100, "B2": 20,
        "B3": 20, "B4": 100, "F12": 20, "g1ADD": 10, "g1HALF": 4, "g1QRT": 4}

THRESHOLDS = {"M1": 35,  # raised (phase-1 enrichment: products to the node's 49 ceiling)
              "M4": 40,
              "V1": 20, "V2": 28, "V3": 20,    # 4×7 share combos bound V1's space
              "DA1": 40, "DA2": 14,            # build targets bounded by the widget (3–10)
              "DA3": 30, "Fr2": 21, "Fr3": 13,  # source-bounded fraction spaces
              "Q1": 17, "Q5": 25, "S1": 40, "S2": 40, "P": 28, "Ord": 22,  # Q5 cap-7 bounded; floor follows the shared-rng stream after M1 widening
              "G1": 16, "G2": 20,
              "G3": 6,                          # the HONEST space: two source solids × 3 elements
              "A2": 40, "B2": 25, "B3": 22,     # crossing-ten pairs are few by nature
              "B4": 40, "F12": 40,
              "g1ADD": 30, "g1HALF": 11, "g1QRT": 10}   # النصف وحده — declared finite

M2_CODES = sorted(THRESHOLDS)


def test_m2_covers_the_27():
    assert len(M2_CODES) == 27


def test_families_match_templates_exactly(db):
    for code in M2_CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl_fams = set(db.execute(
            select(Question.family).where(Question.skill_id == skill.id,
                                          Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl_fams, code


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


# the story nodes: no singular-منصوب noun after 3–10, no plural after 11+
_SING = ["قلماً", "تفّاحةً", "كرةً", "تمرةً", "كأساً", "ريالاً"]
_PLUR = ["تفّاحات", "كرات", "أقلام", "ورود", "ريالات", "صناديق", "أطباق",
         "علب", "سلال", "رفوف", "عصافير", "تفاحات"]


def test_arabic_number_agreement_in_stories():
    rng = random.Random(31)
    for code, family in (("M4", "نمذجة"), ("V2", "نمذجة"), ("S1", "نمذجة"),
                         ("S2", "نمذجة"), ("g1ADD", "aggregative")):
        gen = generators.REGISTRY[code][family]
        for _ in range(300):
            pr, _, _ = gen(rng, {})
            west = pr.translate(_W)
            for m in re.finditer(r"(\d+) (\S+)", west):
                n, noun = int(m.group(1)), m.group(2)
                if noun in _SING:
                    assert n >= 11, (code, pr)
                if noun in _PLUR:
                    assert 3 <= n <= 10, (code, pr)


def test_options_order_is_shuffled():
    rng = random.Random(7)
    for (code, family), _ in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            if vis and vis.get("kind") == "shape-pick" and len(vis["options"]) >= 2:
                positions.add(next(i for i, o in enumerate(vis["options"]) if o["v"] == ans))
        if positions:
            assert len(positions) >= 2, (code, family)


def test_variation_guard_the_27():
    rng = random.Random(99)
    for code, floor in THRESHOLDS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
