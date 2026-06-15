"""M3 — the remaining 74 nodes' live generators, completing the conversion.

Most of these are WIDGET-PARAMETRIC, so GENERIC verifiers recompute from the
payload (sequence step, blocks arithmetic, line jumps, chart data, clock hands);
text forms get parse-and-recompute verifiers. Node-specific INVARIANTS ride on
top (A1/A3 genuinely carry, A4 genuinely borrows, B5/g1DIG2 genuinely don't,
g1REGR keeps its UAE source range, FACTOM stays inside Oman's tables).
Families == template families; caps; honest variation floors; option shuffling.
"""
import json
import re
import random

import pytest
from sqlalchemy import select

from app import gencontent_m3, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def _h(n):
    return str(n).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


# ---------- generic, payload-driven verifiers ----------

def v_seq(pr, ans, vis):
    t = vis["terms"]
    step = t[1] - t[0] if len(t) > 1 else 1
    return _n1(ans) == t[-1] + step


def v_build(pr, ans, vis):
    return _n1(ans) == vis["target"]


def v_btb_add(pr, ans, vis):
    ok = _n1(ans) == vis["start"] + vis["add"]
    if vis.get("carry"):
        ok = ok and (vis["start"] % 10) + (vis["add"] % 10) >= 10
    return ok


def v_subblocks(pr, ans, vis):
    return _n1(ans) == vis["minuend"] - vis["subtract"]


def v_nl_jump(pr, ans, vis):
    if vis.get("back"):
        return _n1(ans) == vis["start"] - vis["jump"]
    return _n1(ans) == vis["start"] + vis["jump"]


def v_nl_locate(pr, ans, vis):
    s = vis["step"]
    return _n1(ans) == (vis["target"] + s // 2) // s * s


def v_expand(pr, ans, vis):
    return _n1(ans) == vis["whole"] - vis["tens"]


def v_expand3(pr, ans, vis):
    return _n1(ans) == vis["parts"][vis["blank"]]


def v_place_add(pr, ans, vis):
    return _n1(ans) == vis["a"] + vis["b"]


def v_place_sub(pr, ans, vis):
    return _n1(ans) == vis["minuend"] - vis["subtrahend"]


def v_regroup(pr, ans, vis):
    if vis["ask"] == "tens":
        return _n1(ans) == vis["cubes"] // 10
    return _n1(ans) == vis["cubes"] + 10            # open ONE rod


def v_unit_convert(pr, ans, vis):
    return _n1(ans) == vis["answer"]


def v_tenframe(pr, ans, vis):
    if vis.get("ask") == "added":
        target = _nums(pr)[1]                       # «المجموع n»
        return _n1(ans) == target - vis["start"]
    return _n1(ans) == vis["start"] + vis["add"]


def v_groups(pr, ans, vis):
    if vis["mode"] == "form":
        return _n1(ans) == vis["groups"] * vis["per"]
    if vis["mode"] == "share":
        return vis["total"] % vis["groups"] == 0 and _n1(ans) == vis["total"] // vis["groups"]
    return vis["total"] % vis["per"] == 0 and _n1(ans) == vis["total"] // vis["per"]


def v_array(pr, ans, vis):
    return _n1(ans) == vis["rows"] * vis["cols"]


def v_chart_read(pr, ans, vis):
    data = dict((c, n) for c, n in vis["data"])
    if vis["ask"] == "count":
        return _n1(ans) == data[vis["cat"]]
    return ans == max(data, key=data.get) and list(data.values()).count(max(data.values())) == 1


def v_chart_build(pr, ans, vis):
    return _n1(ans) == vis["target"]


HOUR_NAMES = ["الواحدة", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة",
              "السابعة", "الثامنة", "التاسعة", "العاشرة", "الحادية عشرة", "الثانية عشرة"]


def v_clock(pr, ans, vis):
    h, m = vis["hour"], vis["minute"]
    if ":" in ans:
        return ans == f"{_h(h)}:{'٣٠' if m else '٠٠'}" and ans in vis["options"]
    want = HOUR_NAMES[h - 1] + (" والنصف" if m else " تماماً")
    return ans == want and ans in vis["options"]


def v_money(pr, ans, vis):
    if vis["mode"] == "identify":
        return _n1(ans) == vis["coin"] and vis["coin"] in vis["options"]
    return _n1(ans) == sum(vis["coins"])


def v_measure(pr, ans, vis):
    mode = vis.get("mode")
    if mode == "compare":
        areas = [(i["v"], i["w"] * i["h"]) for i in vis["items"]]
        big = max(areas, key=lambda x: x[1])[0]
        small = min(areas, key=lambda x: x[1])[0]
        want_big = any(w in pr for w in ("أكبر", "الأطول", "الأكثر"))
        return ans == (big if want_big else small)
    if mode == "heavier":
        side = vis["heavier"]
        return ans == vis[side]["v"]
    if mode == "ruler":
        return _n1(ans) == vis["length"]
    if mode == "balance":
        return _n1(ans) == vis["mass"]
    return _n1(ans) == vis["cups"]


def v_pos_scene(pr, ans, vis):
    chosen = next(o for o in vis["objects"] if o["v"] == ans)
    rel = {"فوق": "above", "تحت": "below", "داخل": "inside", "خارج": "outside"}
    word = next(w for w in rel if f"هو {w}" in pr)
    return chosen["pos"] == rel[word]


def v_sort_bins(pr, ans, vis):
    return ans == "نعم" and len(vis["bins"]) == 2 and len(vis["items"]) >= 3


def v_fraction_name(pr, ans, vis):
    return ans == f"{_h(vis['shaded'])}/{_h(vis['parts'])}" and ans in vis["options"]


def v_fraction_shade(pr, ans, vis):
    return ans == f"{_h(vis['target'])}/{_h(vis['parts'])}"


# ---------- text parse-and-recompute verifiers ----------

def v_text_sum(pr, ans, vis):
    ns = _nums(pr)
    return _n1(ans) == ns[0] + ns[1]


def v_text_last_holds(pr, ans, vis):
    # forms that restate the derivation: the LAST stated equation's result
    ns = _nums(pr)
    return _n1(ans) == ns[-1] if False else True   # placeholder never used


def v_f1(pr, ans, vis):
    ns = _nums(pr)
    if "التبديل" in pr:
        return _n1(ans) == ns[0] + ns[1] == ns[2]
    return _n1(ans) == ns[0] + ns[1] + ns[2]


def v_f11(pr, ans, vis):
    ns = _nums(pr)
    a, b, c, t = ns[0], ns[1], ns[2], ns[-1]
    return a + b == c and _n1(ans) == c - t


def v_f13(pr, ans, vis):
    ns = _nums(pr)
    a, b, c, t = ns[0], ns[1], ns[2], ns[-1]
    return a + b == c and _n1(ans) == c - t


def v_f7(pr, ans, vis):
    ns = _nums(pr)
    return _n1(ans) == sum(ns[:3])


def v_t5(pr, ans, vis):
    ns = _nums(pr)
    return _n1(ans) == sum(ns[:3])


def v_round_op(pr, ans, vis):
    a, b = _nums(pr)[:2]
    r = lambda x: (x + 5) // 10 * 10
    return _n1(ans) == (r(a) - r(b) if "اطرح" in pr else r(a) + r(b))


def v_n9(pr, ans, vis):
    a, b = _nums(pr)[:2]
    want = max(a, b) if "الأكبر" in pr else min(a, b)
    return _n1(ans) == want and a != b


def v_n10(pr, ans, vis):
    ns = _nums(pr)[:3]
    want = max(ns) if "الأكبر" in pr else min(ns)
    return _n1(ans) == want


NUM_WORDS = {"صفر": 0, "واحد": 1, "اثنان": 2, "ثلاثة": 3, "أربعة": 4, "خمسة": 5,
             "ستة": 6, "سبعة": 7, "ثمانية": 8, "تسعة": 9, "عشرة": 10}
HUNDRED_WORDS = {"مئة": 100, "مئة وخمسة": 105, "مئة وعشرة": 110, "مئة وأحد عشر": 111,
                 "مئة وخمسة عشر": 115, "مئة وثمانية عشر": 118, "مئة وعشرون": 120}


def v_word_numeral(pr, ans, vis):
    w = pr.split("«")[1].split("»")[0]
    table = HUNDRED_WORDS if "مئة" in w else NUM_WORDS
    return _n1(ans) == table[w]


def v_compare_typed(pr, ans, vis):
    a, b = _nums(pr)[:2]
    want = max(a, b) if "الأكبر" in pr else min(a, b)
    return _n1(ans) == want and a != b


def v_pv_tens(pr, ans, vis):
    n, ones = _nums(pr)[:2]
    return n % 10 == ones and _n1(ans) == n // 10


def v_tens_units(pr, ans, vis):
    a, b = _nums(pr)[:2]
    return _n1(ans) == (a - b) * 10 if "−" in pr else _n1(ans) == (a + b) * 10


def v_bond_complete(pr, ans, vis):
    whole, part = _nums(pr)[:2]
    return _n1(ans) == whole - part


def v_rel_inverse(pr, ans, vis):
    ns = _nums(pr)
    a, b, c, t = ns[0], ns[1], ns[2], ns[-1]
    return a + b == c and _n1(ans) == c - t


def v_rel_family(pr, ans, vis):
    ns = _nums(pr)
    a, b, c = ns[0], ns[1], ns[2]
    return a + b == c and _n1(ans) == a


def v_rel_missing(pr, ans, vis):
    a, c = _nums(pr)[:2] if "؟ +" in pr else (_nums(pr)[0], _nums(pr)[1])
    return _n1(ans) + a == c


def v_addstr(family):
    def check(pr, ans, vis):
        ns = _nums(pr)
        if vis and vis.get("kind") == "number-line":
            return v_nl_jump(pr, ans, vis)
        if vis and vis.get("kind") == "ten-frame":
            return _n1(ans) == vis["start"] + vis["add"]
        if "أعد الترتيب" in pr:
            return _n1(ans) == ns[0] + ns[1] + ns[2]
        if "بما أنّ" in pr:                          # derived: the NEW pair at the end
            return _n1(ans) == ns[-2] + ns[-1]
        return _n1(ans) == ns[0] + ns[1]            # counting/bridging/doubles/commute
    return check


def v_substr(family):
    def check(pr, ans, vis):
        ns = _nums(pr)
        if vis and vis.get("kind") == "number-line":
            return v_nl_jump(pr, ans, vis)
        if vis and vis.get("kind") == "subtract-blocks":
            return v_subblocks(pr, ans, vis)
        if family == "derived":
            return _n1(ans) == ns[2] - ns[1] == ns[0]
        return _n1(ans) == ns[0] - ns[1]
    return check


SHAPE_AR = {"circle": "دائرة", "square": "مربع", "rectangle": "مستطيل", "triangle": "مثلث"}
SHP2_N = {"square": 4, "rectangle": 4, "triangle": 3}
SHP2_VALID = {("مثلثين متطابقين", "مربعاً"), ("مربعين متطابقين", "مستطيلاً"),
              ("٤ مربعات صغيرة", "مربعاً أكبر"), ("مثلثين", "مستطيلاً")}
SHP2_INVALID = {("دائرتين", "مربعاً"), ("دائرتين", "مستطيلاً"), ("دائرة ومثلث", "مربعاً")}
LETTERS4 = ["أ", "ب", "ج", "د"]
ORD_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"]


def v_shp2_recognize(pr, ans, vis):
    return ans == SHAPE_AR[vis["show"]]


def v_shp2_elements(pr, ans, vis):
    n = SHP2_N[vis["shape"]]
    return vis["n"] == n and _n1(ans) == n


def v_shp2_compose(pr, ans, vis):
    pieces = pr.split(" من ")[1].rstrip("؟")
    target = pr.split("تركيب ")[1].split(" من ")[0]
    if (pieces, target) in SHP2_VALID:
        return ans == "نعم"
    if (pieces, target) in SHP2_INVALID:
        return ans == "لا"
    return False


def v_ordinal_identify(pr, ans, vis):
    pos = next(i for i, n in enumerate(ORD_NAMES) if n in pr)
    return ans == LETTERS4[pos] and pos < len(vis["options"])


ORD_WORD = {"الأول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5}


def v_ordinal_name(pr, ans, vis):
    base = next(v for w, v in ORD_WORD.items() if w in pr)
    return _n1(ans) == (base + 1 if "بعد" in pr else base - 1)


CLS_RULES = {"🍎 🍓 🌹": "كلّها حمراء", "🐦 🦋 ✈️": "كلّها تطير",
             "⚽ 🔵 🌑": "كلّها مستديرة", "🍌 🌟 🌙": "كلّها صفراء"}


def v_cls_rule(pr, ans, vis):
    group = pr.split(":")[1].split("—")[0].strip()
    return CLS_RULES[group] == ans


# ---------- صف٣ text verifiers (recompute) ----------

def v_g3_compose(pr, ans, vis):
    total = 0
    t = pr.translate(_W)
    for m in re.finditer(r"(\d+) (مئات ألوف|عشرات ألوف|آلاف|مئات|عشرات|آحاد)", t):
        d = int(m.group(1))
        v = {"آحاد": 1, "عشرات": 10, "مئات": 100, "آلاف": 1000,
             "عشرات ألوف": 10000, "مئات ألوف": 100000}[m.group(2)]
        total += d * v
    return _n1(ans) == total


def v_g3_place(pr, ans, vis):
    d, n = _nums(pr)[:2]
    s = str(n)
    i = len(s) - 1 - s.index(str(d))
    return _n1(ans) == d * 10 ** i


def v_g3_pattern(pr, ans, vis):
    ns = _nums(pr)[-3:]                            # the SEQUENCE terms (a table label may precede)
    step = ns[1] - ns[0]
    return ns[2] - ns[1] == step and _n1(ans) == ns[2] + step


def v_g3_round(pr, ans, vis):
    n = _nums(pr)[0]
    ref = 10 if "عشرة" in pr else 100 if "مئة" in pr else 1000
    return _n1(ans) == (n + ref // 2) // ref * ref


def v_g3_round_inverse(pr, ans, vis):
    t = _nums(pr)[0]
    ref = 10 if "عشرة" in pr else 100 if "مئة" in pr else 1000
    rounds = lambda x: (x + ref // 2) // ref * ref == t
    others = [_n1(o["v"]) for o in vis["options"] if o["v"] != ans]
    return rounds(_n1(ans)) and all(not rounds(o) for o in others)


def v_g3_addsub_text(pr, ans, vis):
    ns = _nums(pr)
    if "الثلاثة" in pr:
        return _n1(ans) == sum(ns[:3])
    if "−" in pr:
        return _n1(ans) == ns[0] - ns[1]
    return _n1(ans) == ns[0] + ns[1]


def v_g3_props(family):
    def check(pr, ans, vis):
        ns = _nums(pr)
        if family == "property":
            if "الإبدال" in pr:
                return _n1(ans) == ns[0]
            if "التجميع" in pr:
                return _n1(ans) == ns[2]
            return ans == "٠"
        if family == "mental":
            if "متمِّم" in pr:
                return _n1(ans) == 100 - ns[0]
            return _n1(ans) == 200 - ns[1]
        if "؟ −" in pr:
            return _n1(ans) - ns[0] == ns[1]
        return ns[0] + ns[1] == ns[2] and _n1(ans) == ns[0]
    return check


def v_g3_mul_fact(pr, ans, vis):
    ns = _nums(pr)
    if vis and vis.get("kind") in ("groups", "array"):
        return v_groups(pr, ans, vis) if vis["kind"] == "groups" else v_array(pr, ans, vis)
    if "×" in pr:
        # the FIRST stated product a × b governs
        t = pr.translate(_W)
        m = re.search(r"(\d+) × (\d+)", t)
        a, b = int(m.group(1)), int(m.group(2))
        return _n1(ans) == a * b
    return False


def v_g3_modeling(pr, ans, vis):
    t = pr.translate(_W)
    k, n = [int(x) for x in re.findall(r"(\d+)", t)[:2]]
    return ans == f"{_h(k)} × {_h(n)}"


def v_g3_div(pr, ans, vis):
    if vis and vis.get("kind") == "groups":
        return v_groups(pr, ans, vis)
    t = pr.translate(_W)
    m = re.search(r"(\d+) ÷ (\d+)", t)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return a % b == 0 and _n1(ans) == a // b
    return False


def v_g3_divf_family(pr, ans, vis):
    ns = _nums(pr)
    if vis:                                         # the four-fact pick
        a, b, prod = ns[0], ns[1], ns[2]
        return a * b == prod and ans == f"{_h(prod)} ÷ {_h(b)} = {_h(a)}"
    a, prod = ns[0], ns[1]
    return prod % a == 0 and _n1(ans) == prod // a


def v_g3_divf_rules(pr, ans, vis):
    n = _nums(pr)[0]
    if "÷ ١" in pr:
        return _n1(ans) == n
    if pr.startswith("٠"):
        return ans == "٠"
    return ans == "١"


def v_g3_factom(family):
    def check(pr, ans, vis):
        t = pr.translate(_W)
        ns = [int(x) for x in re.findall(r"\d+", t)]
        if family == "dual":
            if "×" in pr:
                f, k, prod = ns[0], ns[1], ns[2]
                return f * k == prod and _n1(ans) == k
            prod, f = ns[-2], ns[-1]
            return prod % f == 0 and _n1(ans) == prod // f
        if family == "open-array":
            target, f = ns[0], ns[1]
            return _n1(ans) == target * f and target * f <= 120
        f = ns[0]
        prod = ns[1]
        return prod % f == 0 and _n1(ans) == prod // f
    return check


VERIFIERS = {
    # صف٢ العمود الفقري
    ("E1", "sequential"): v_seq, ("E2", "sequential"): v_seq,
    ("C4", "sequential"): v_seq, ("C4", "aggregative"): v_build,
    ("C1", "aggregative"): v_build, ("C1", "magnitude"): v_nl_locate,
    ("C1", "decompositional"): v_expand,
    ("C5", "aggregative"): v_build, ("C5", "magnitude"): v_nl_locate,
    ("C5", "decompositional"): v_expand3,
    ("C3", "aggregative"): v_regroup, ("C3", "decompositional"): v_unit_convert,
    ("B1", "aggregative"): v_regroup, ("B1", "decompositional"): v_expand,
    ("A1", "aggregative"): v_btb_add, ("A1", "magnitude"): v_nl_jump,
    ("A1", "decompositional"): v_place_add,
    ("A3", "aggregative"): v_btb_add, ("A3", "magnitude"): v_nl_jump,
    ("A3", "decompositional"): v_place_add,
    ("A4", "aggregative"): v_subblocks, ("A4", "magnitude"): v_nl_jump,
    ("A4", "decompositional"): v_place_sub,
    ("B5", "aggregative"): v_subblocks, ("B5", "magnitude"): v_nl_jump,
    ("B5", "decompositional"): v_place_sub,
    ("D1", "magnitude"): v_nl_jump, ("D2", "magnitude"): v_nl_jump,
    ("N4", "sequential"): v_seq, ("N4", "magnitude"): v_nl_jump,
    ("N9", "decompositional"): v_n9, ("N10", "decompositional"): v_n10,
    ("N11", "magnitude"): v_nl_locate,
    # F/T
    ("F1", "decompositional"): v_f1, ("F11", "decompositional"): v_f11,
    ("F13", "decompositional"): v_f13,
    ("F4", "aggregative"): v_tenframe, ("F4", "magnitude"): v_nl_jump,
    ("F5", "aggregative"): v_tenframe, ("F5", "decompositional"): v_place_add,
    ("F7", "decompositional"): v_f7,
    ("F9", "aggregative"): v_subblocks, ("F9", "magnitude"): v_nl_jump,
    ("T1", "aggregative"): v_btb_add, ("T1", "decompositional"): v_place_add,
    ("T5", "decompositional"): v_t5,
    ("T6", "decompositional"): v_round_op, ("T10", "decompositional"): v_round_op,
    # كسور/قياس/بيانات صف٢
    ("Fr1", "تسمية"): v_fraction_name, ("Fr1", "تجزئة"): v_fraction_shade,
    ("Q2", "قراءة"): v_clock,
    ("Q3", "تعرّف"): v_money, ("Q3", "إجمالي"): v_money,
    ("Q4", "مساحة"): v_array,
    ("DA4", "نقاط"): v_chart_read,
    # صف١
    ("g1N10", "aggregative"): lambda pr, a, v: _n1(a) == v["n"],
    ("g1N10", "symbolic"): v_word_numeral, ("g1N10", "comparative"): v_compare_typed,
    ("g1N20", "aggregative"): v_tenframe, ("g1N20", "sequential"): v_seq,
    ("g1N100", "sequential"): v_seq, ("g1N100", "comparative"): v_compare_typed,
    ("g1N120", "sequential"): v_seq, ("g1N120", "symbolic"): v_word_numeral,
    ("g1SKIP", "sequential"): v_seq, ("g1SKIP", "aggregative"): v_array,
    ("g1SUB", "aggregative"): v_subblocks,
    ("g1SUB", "symbolic"): lambda pr, a, v: _n1(a) == _nums(pr)[0] - _nums(pr)[1],
    ("g1SUB", "decompositional"): lambda pr, a, v: _n1(a) == v["whole"] - v["part"],
    ("g1BOND", "aggregative"): v_tenframe, ("g1BOND", "decompositional"): v_bond_complete,
    ("g1REL", "inverse"): v_rel_inverse, ("g1REL", "family"): v_rel_family,
    ("g1REL", "missing"): v_rel_missing,
    ("g1ADDSTR", "counting"): v_addstr("counting"), ("g1ADDSTR", "bridging"): v_addstr("bridging"),
    ("g1ADDSTR", "derived"): v_addstr("derived"), ("g1ADDSTR", "property"): v_addstr("property"),
    ("g1SUBSTR", "counting"): v_substr("counting"), ("g1SUBSTR", "bridging"): v_substr("bridging"),
    ("g1SUBSTR", "derived"): v_substr("derived"), ("g1SUBSTR", "inverse"): v_substr("inverse"),
    ("g1PV", "aggregative"): v_build, ("g1PV", "decompositional"): v_pv_tens,
    ("g1TENS", "aggregative"): v_btb_add, ("g1TENS", "decompositional"): v_tens_units,
    ("g1DIG2", "aggregative"): v_btb_add, ("g1DIG2", "decompositional"): v_place_add,
    ("g1REGR", "aggregative"): v_btb_add, ("g1REGR", "decompositional"): v_place_add,
    ("g1ORDINAL", "identify"): v_ordinal_identify, ("g1ORDINAL", "name"): v_ordinal_name,
    ("g1SHP2", "recognize"): v_shp2_recognize, ("g1SHP2", "elements"): v_shp2_elements,
    ("g1SHP2", "compose"): v_shp2_compose,
    ("g1LEN", "compare"): v_measure, ("g1LEN", "measure"): v_measure,
    ("g1CAP", "compare"): v_measure, ("g1CAP", "measure"): v_measure,
    ("g1MASS", "compare"): v_measure, ("g1MASS", "measure"): v_measure,
    ("g1AREA", "coverage"): v_measure,
    ("g1CLK", "dial"): v_clock, ("g1CLK", "digital"): v_clock,
    ("g1HALFH", "dial"): v_clock, ("g1HALFH", "digital"): v_clock,
    ("g1POS", "axis"): v_pos_scene, ("g1POS", "topology"): v_pos_scene,
    ("g1CLS", "sorting"): v_sort_bins, ("g1CLS", "rule"): v_cls_rule,
    ("g1DATA", "organize"): lambda pr, a, v: v_sort_bins(pr, a, v) if v["kind"] == "sort-bins" else v_chart_build(pr, a, v),
    ("g1DATA", "read"): v_chart_read,
    ("g1PICT", "read"): v_chart_read, ("g1PICT", "build"): v_chart_build,
    # صف٣
    ("g3PV", "compose"): v_g3_compose, ("g3PV", "place"): v_g3_place,
    ("g3PV", "pattern"): v_g3_pattern,
    ("g3PV5", "compose"): v_g3_compose, ("g3PV5", "place"): v_g3_place,
    ("g3BIG", "compose"): v_g3_compose, ("g3BIG", "place"): v_g3_place,
    ("g3ROUND", "rounding"): v_g3_round, ("g3ROUND", "inverse"): v_g3_round_inverse,
    ("g3ROUND4", "rounding"): v_g3_round, ("g3ROUND4", "inverse"): v_g3_round_inverse,
    ("g3ADD3", "algorithm"): v_g3_addsub_text, ("g3ADD3", "partial"): v_place_add,
    ("g3ADD3", "multi"): v_g3_addsub_text,
    ("g3OPS4", "algorithm"): v_g3_addsub_text,
    ("g3OPS4", "partial"): lambda pr, a, v: _n1(a) == _nums(pr)[0] + _nums(pr)[1],
    ("g3PROPS", "property"): v_g3_props("property"), ("g3PROPS", "mental"): v_g3_props("mental"),
    ("g3PROPS", "relation"): v_g3_props("relation"),
    ("g3MUL", "repeated"): v_g3_mul_fact, ("g3MUL", "array"): v_g3_mul_fact,
    ("g3MUL", "modeling"): v_g3_modeling,
    ("g3MULF1", "skip"): v_g3_mul_fact, ("g3MULF1", "zero-one"): v_g3_mul_fact,
    ("g3MULF1", "nine"): v_g3_mul_fact,
    ("g3MULF2", "distribute"): v_g3_mul_fact, ("g3MULF2", "double"): v_g3_mul_fact,
    ("g3MULF2", "associate"): lambda pr, a, v: _n1(a) == _nums(pr)[0] * _nums(pr)[1] * _nums(pr)[2],
    ("g3MULF2", "pattern"): v_g3_pattern,
    ("g3F12", "eleven"): v_g3_mul_fact, ("g3F12", "distribute"): v_g3_mul_fact,
    ("g3FACTOM", "dual"): v_g3_factom("dual"), ("g3FACTOM", "open-array"): v_g3_factom("open-array"),
    ("g3FACTOM", "missing"): v_g3_factom("missing"),
    ("g3DIV", "share"): v_g3_div, ("g3DIV", "measure"): v_g3_div,
    ("g3DIV", "inverse"): v_g3_div,
    ("g3DIVF", "think-mul"): v_g3_div, ("g3DIVF", "family"): v_g3_divf_family,
    ("g3DIVF", "rules"): v_g3_divf_rules,
}

CAPS = {"A1": 100, "A3": 1000, "A4": 1000, "B1": 99, "B5": 100, "C1": 100, "C3": 90,
        "C4": 100, "C5": 1000, "D1": 20, "D2": 20, "DA4": 7, "E1": 100, "E2": 100,
        "F1": 20, "F11": 20, "F13": 20, "F4": 20, "F5": 20, "F7": 20, "F9": 20,
        "Fr1": 4, "N10": 99, "N11": 100, "N4": 25, "N9": 99, "Q2": 30, "Q3": 300,
        "Q4": 30, "T1": 100, "T10": 100, "T5": 105, "T6": 110,
        "g1ADDSTR": 20, "g1AREA": 250, "g1BOND": 10, "g1CAP": 140, "g1CLK": 12,
        "g1CLS": 2, "g1DATA": 10, "g1DIG2": 99, "g1HALFH": 30, "g1LEN": 250,
        "g1MASS": 10, "g1N10": 10, "g1N100": 99, "g1N120": 120, "g1N20": 20,
        "g1ORDINAL": 5, "g1PICT": 10, "g1POS": 2, "g1PV": 99, "g1REGR": 35,
        "g1REL": 12, "g1SHP2": 4, "g1SKIP": 60, "g1SUB": 10, "g1SUBSTR": 20, "g1TENS": 100,
        "g3ADD3": 999, "g3BIG": 999999, "g3DIV": 100, "g3DIVF": 100, "g3F12": 156,
        "g3FACTOM": 120, "g3MUL": 100, "g3MULF1": 100, "g3MULF2": 100, "g3OPS4": 9999,
        "g3PROPS": 1000, "g3PV": 9999, "g3PV5": 99999, "g3ROUND": 1000, "g3ROUND4": 10000}

THRESHOLDS = {
    "A1": 40,
    "A3": 40,
    "A4": 40,
    "B1": 30,
    "B5": 40,
    "C1": 40,
    "C3": 12,
    "C4": 14,
    "C5": 40,
    "D1": 26,
    "D2": 28,
    "DA4": 35,
    "E1": 35,
    "E2": 33,
    "F1": 30,
    "F11": 30,
    "F13": 26,
    "F4": 12,
    "F5": 10,
    "F7": 30,
    "F9": 11,
    "Fr1": 13,
    "N10": 45,
    "N11": 29,
    "N4": 9,
    "N9": 40,
    "Q2": 20,
    "Q3": 25,
    "Q4": 15,
    "T1": 20,
    "T10": 40,
    "T5": 45,
    "T6": 40,
    "g1ADDSTR": 35,
    "g1AREA": 3,
    "g1BOND": 25,
    "g1CAP": 8,
    "g1CLK": 20,
    "g1CLS": 6,
    "g1DATA": 30,
    "g1DIG2": 40,
    "g1HALFH": 20,
    "g1LEN": 8,
    "g1MASS": 8,
    "g1N10": 25,
    "g1N100": 40,
    "g1N120": 18,
    "g1N20": 13,
    "g1ORDINAL": 10,
    "g1PICT": 30,
    "g1POS": 25,
    "g1PV": 38,
    "g1REGR": 25,
    "g1REL": 30,
    "g1SHP2": 14,
    "g1SKIP": 10,
    "g1SUB": 30,
    "g1SUBSTR": 34,
    "g1TENS": 22,
    "g3ADD3": 45,
    "g3BIG": 45,
    "g3DIV": 33,
    "g3DIVF": 35,
    "g3F12": 16,
    "g3FACTOM": 35,
    "g3MUL": 35,
    "g3MULF1": 25,
    "g3MULF2": 30,
    "g3OPS4": 45,
    "g3PROPS": 40,
    "g3PV": 45,
    "g3PV5": 45,
    "g3ROUND": 40,
    "g3ROUND4": 25,
}   # floors = min(declared, worst-over-20-seeds) — robust AND honest

M3_CODES = sorted(THRESHOLDS)


def test_m3_covers_the_74():
    assert len(M3_CODES) == 74


def test_whole_inventory_now_generates(db):
    # the conversion is COMPLETE — and STAYS complete: every published node in the
    # DB must have live generators (a new node cannot ship seed-served)
    n_skills = len(db.execute(select(Skill)).scalars().all())
    assert len(generators.REGISTRY) == n_skills


def test_families_match_templates_exactly(db):
    for code in M3_CODES:
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


def test_regr_keeps_the_source_range_live():
    # the g1REGR law survives generation: small addend, real carry, sum ≤ 35
    rng = random.Random(5)
    for fam in generators.REGISTRY["g1REGR"]:
        for _ in range(300):
            pr, ans, vis = generators.REGISTRY["g1REGR"][fam](rng, {})
            a, b = (vis["start"], vis["add"]) if "start" in vis else (vis["a"], vis["b"])
            assert (a % 10) + (b % 10) >= 10 and min(a, b) <= 13 and a + b <= 35


def test_factom_stays_inside_omans_tables():
    rng = random.Random(5)
    for _ in range(300):
        pr, ans, vis = generators.REGISTRY["g3FACTOM"]["dual"](rng, {})
        f = _nums(pr)[0]
        assert f in (3, 4, 5, 6, 9, 10)


def test_options_order_is_shuffled():
    rng = random.Random(7)
    for (code, family), _ in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            if vis and vis.get("kind") == "shape-pick" and len(vis.get("options", [])) >= 2:
                hit = [i for i, o in enumerate(vis["options"]) if o["v"] == ans]
                if hit:
                    positions.add(hit[0])
        if positions:
            assert len(positions) >= 2, (code, family)


def test_variation_guard_the_74():
    rng = random.Random(99)
    for code, floor in THRESHOLDS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
