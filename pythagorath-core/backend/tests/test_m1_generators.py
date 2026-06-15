"""M1 — the 22 critical nodes' live generators, verified INDEPENDENTLY.

For every (node, family): 500 samples → the verifier RECOMPUTES the truth from
the prompt/visual with its own transcribed logic (banks are deliberately written
twice — here and in gencontent — as a transcription check); every numeral stays
inside the node's cap; the variation guard asserts the distinct-draw floor
(≥40 computational, honest declared floors for finite/geometric families); and
the generator families MATCH the node's template families exactly (the
understanding gate counts families from the anchored template).
"""
import json
import re
import random
from collections import Counter

import pytest
from sqlalchemy import select

from app import gencontent, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(text):
    return [int(m) for m in re.findall(r"[0-9]+", str(text).translate(_W))]


def _n1(text):
    return _nums(text)[0]


DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
MONTHS = ["محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
          "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"]
SOLID_NAMES = {"cube": "مكعب", "sphere": "كرة", "cylinder": "أسطوانة",
               "cone": "مخروط", "pyramid": "هرم"}
ROLLERS = {"sphere", "cylinder", "cone"}
POLY_N = {"triangle": 3, "square": 4, "rectangle": 4, "pentagon": 5, "hexagon": 6}
EST_SCENES = {"عدد تلاميذ صفّك": 20, "عدد أصابع يديك": 10, "عدد عجلات السيارة": 4,
              "عدد كتب حقيبتك": 6, "عدد أرجل القطة": 4, "عدد أيام الأسبوع": 7,
              "عدد أبواب الصف": 2, "عدد عيون الإنسان": 2}
SYM_BANK = {"🦋 الفراشة": True, "🧤 قفّازٌ واحد": False, "⭕ الحلقة": True,
            "🔺 المثلث المتساوي": True, "🌙 الهلال": False, "⬛ المربع": True,
            "👞 حذاءٌ واحد": False, "➰ الوشاح الملتفّ": False}
G7_BANK = {"circle": True, "square": True, "rectangle": True, "triangle-iso": True,
           "triangle": True, "l-shape": False, "triangle-scalene": False}
G6_VALID = {("مثلثان قائمان متطابقان", "مربعاً"), ("٤ مربعات صغيرة", "مربعاً أكبر"),
            ("مربعان متطابقان", "مستطيلاً"), ("٣ مربعات متجاورة", "مستطيلاً"),
            ("مثلثان متطابقان", "مستطيلاً"), ("٤ مثلثات", "مربعاً")}
G6_INVALID = {("دائرتان", "مربعاً"), ("٣ دوائر", "مستطيلاً"),
              ("دائرة ومثلث", "مستطيلاً"), ("دائرتان", "مثلثاً")}
EVENM_RULES = {"ضاعفتُ عدداً فردياً — ماذا يكون الناتج دائماً؟": "زوجياً دائماً",
               "حاصل ضرب أيِّ عددٍ في ٢ يكون…": "زوجياً",
               "جميع الأعداد في جدول ضرب الأربعة…": "زوجية",
               "جميع الأعداد في جدول ضرب الستة…": "زوجية",
               "فرديٌّ × فرديٌّ يكون الناتج…": "فردياً",
               "زوجيٌّ × زوجيٌّ يكون الناتج…": "زوجياً",
               "أيُّ جدولٍ تكون كلُّ نواتجه زوجية؟": "جدول ٨",
               "أيُّ جدولٍ تتناوب نواتجه زوجياً وفردياً؟": "جدول ٥"}
DEC_EXACT = {"كم بقي معك بالضبط": True, "ما المجموع الصحيح تماماً": True,
             "أيكفي معك": False, "أيُّهما أرخص تقريباً": False}

_EMOJI = re.compile(r"[\U0001F000-\U0001FAFF☀-➿⬀-⯿■-◿]")


def _runs(prompt):
    """Emoji runs separated by non-emoji — [counts...] in order."""
    runs, cur = [], 0
    for ch in prompt:
        if _EMOJI.match(ch):
            cur += 1
        elif cur:
            runs.append(cur)
            cur = 0
    if cur:
        runs.append(cur)
    return runs


def _r10(x):  return (x + 5) // 10 * 10
def _r100(x): return (x + 50) // 100 * 100


# ---------- the independent verifiers (one per family) ----------

def v_g1cal_sequence(pr, ans, vis):
    if "أشهر السنة" in pr:
        named = [m for m in MONTHS if f"، {m}،" in pr or pr.endswith(m + "، ؟")]
        idx = max(MONTHS.index(m) for m in MONTHS if m + "، ؟" in pr)
        return ans == MONTHS[idx + 1]
    day = next(d for d in DAYS if d in pr.split("الذي")[1])
    i = DAYS.index(day)
    return ans == (DAYS[(i + 1) % 7] if "بعد" in pr else DAYS[(i - 1) % 7])


def v_g1cal_calendar(pr, ans, vis):
    start = next(d for d in DAYS if f"أيامه {d}" in pr)
    date = _n1(pr)
    return ans == DAYS[(DAYS.index(start) + date - 1) % 7] and 1 <= date <= 28


def v_g1cmpq(pr, ans, vis):
    a, b = _runs(pr)[:2]
    opts = {o["v"] for o in vis["options"]}
    if "متكافئتان" in pr:
        return ans == ("نعم" if a == b else "لا") and opts == {"نعم", "لا"}
    left = pr.split("(")[1].split(")")[0]
    right = pr.split("(")[2].split(")")[0]
    want_more = "الأكثر" in pr
    expect = (left if a > b else right) if want_more else (left if a < b else right)
    return ans == expect and a != b


def v_g1est_estimation(pr, ans, vis):
    n = vis["n"]
    far = [int(str(o).translate(_W)) for o in vis["options"] if str(o).translate(_W) != str(n)]
    return ans == str(n).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")) \
        and vis["notap"] and len(far) == 1 and abs(far[0] - n) >= 8 and 6 <= n <= 28


def v_g1est_reason(pr, ans, vis):
    scene = pr.split(" —")[0]
    return _n1(ans) == EST_SCENES[scene]


def v_g1estr_round(pr, ans, vis):
    a, b, ra, rb, *_ = _nums(pr)
    op = -1 if "اطرح" in pr else 1
    return ra == _r10(a) and rb == _r10(b) and _n1(ans) == ra + op * rb


def v_g1estr_plaus(pr, ans, vis):
    a, b = _nums(pr)[:2]
    real = a - b if "−" in pr else a + b
    others = [_n1(o["v"]) for o in vis["options"] if o["v"] != ans]
    return _n1(ans) == _r10(real) and len(others) == 1 and abs(others[0] - _r10(real)) >= 20


def v_parity(pr, ans, vis):
    n = _nums(pr)[0]
    return ans in ("زوجي", "فردي") and ans == ("فردي" if n % 2 else "زوجي")


def v_g1frset_express(pr, ans, vis):
    # the colored part and the ⚪ filler are CONTIGUOUS — count by colour, not runs
    white = pr.count("⚪")
    total = sum(_runs(pr))
    k = total - white
    return _nums(ans) == [k, total] and 1 <= k < total


def v_g1frset_take(pr, ans, vis):
    return vis["total"] % vis["groups"] == 0 and _n1(ans) == vis["total"] // vis["groups"]


def v_g1money_identify(pr, ans, vis):
    return vis["coin"] in (5, 10, 25, 50) and _n1(ans) == vis["coin"] \
        and vis["coin"] in vis["options"]


def v_g1money_count(pr, ans, vis):
    if vis["kind"] == "money":
        return _n1(ans) == sum(vis["coins"]) and all(c in (5, 10, 25, 50) for c in vis["coins"])
    price, c1, c2 = _nums(pr)[:3]
    return ans == ("نعم" if c1 + c2 >= price else "لا")


SHAPE_AR = {"circle": "دائرة", "square": "مربع", "triangle": "مثلث"}


def v_g1pat_extend(pr, ans, vis):
    seq = vis["seq"]
    for L in (2, 3):
        unit = seq[:L]
        if all(seq[i] == unit[i % L] for i in range(len(seq))):
            return ans == SHAPE_AR[unit[len(seq) % L]]
    return False


POS_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"]


def v_g1pat_structure(pr, ans, vis):
    seq = [c for c in pr.split(" —")[0].split(" ") if c]
    pos = POS_NAMES.index(ans)
    syms = sorted(set(seq))
    fixed = list(seq)
    fixed[pos] = syms[0] if fixed[pos] == syms[1] else syms[1]
    def periodic(s):
        return any(all(s[i] == s[i % L] for i in range(len(s))) for L in (2, 3))
    return periodic(fixed) and not periodic(seq)


def v_g1pat_symmetry(pr, ans, vis):
    obj = pr.split(":")[0]
    return ans == ("نعم" if SYM_BANK[obj] else "لا")


def v_g1shp3_recognize(pr, ans, vis):
    return ans == SOLID_NAMES[vis["show"]] and any(o["v"] == ans for o in vis["options"])


def v_g1shp3_classify(pr, ans, vis):
    by_name = {o["v"]: o["shape"] for o in vis["options"]}
    rolls = by_name[ans] in ROLLERS
    return rolls == ("لا يتدحرج" not in pr)


def v_g1shp3_compose(pr, ans, vis):
    return ans in pr and any(o["v"] == ans for o in vis["options"])


def v_g4(pr, ans, vis):
    n = POLY_N[vis["shape"]]
    return vis["n"] == n and _n1(ans) == n \
        and (vis["element"] == "sides") == ("أضلاع" in pr)


def v_g5_check(pr, ans, vis):
    s1, s2 = vis["pair"]
    return ans == ("نعم" if s1 == s2 else "لا")


def v_g5_search(pr, ans, vis):
    target = vis["show"]
    chosen = next(o for o in vis["options"] if o["v"] == ans)
    others = [o for o in vis["options"] if o["v"] != ans]
    return chosen["shape"] == target and all(o["shape"] != target for o in others)


def v_g6(pr, ans, vis):
    if vis and vis.get("kind") == "array":
        return _n1(ans) == vis["rows"] * vis["cols"]
    if "كم مثلثاً" in pr:
        n, m = _nums(pr)[1:3] if "١/" in pr else _nums(pr)[:2]
        return _n1(ans) == 2 * n * m
    if pr.startswith("أيُّ المجموعتين"):
        target = pr.split("تكوّن ")[1].rstrip("؟")
        return (ans, target) in G6_VALID
    pieces = pr.split(" من ")[1].rstrip("؟")
    target = pr.split("تكوين ")[1].split(" من ")[0]
    if (pieces, target) in G6_VALID:
        return ans == "نعم"
    if (pieces, target) in G6_INVALID:
        return ans == "لا"
    return False


def v_g7(pr, ans, vis):
    if "خطّ التماثل الصحيح" in pr or "انقر خطّ" in pr:
        return ans == "عمودي" and vis["show"] == "triangle-iso"
    return ans == ("نعم" if G7_BANK[vis["show"]] else "لا")


CURVES = {"line-curved", "line-curved-s"}            # one classification, two glyphs


def v_g8(pr, ans, vis):
    straight = "المستقيم" in pr
    chosen = next(o for o in vis["options"] if o["v"] == ans)
    others = [o for o in vis["options"] if o["v"] != ans]
    if straight:
        return chosen["shape"] == "line-straight" and all(o["shape"] in CURVES for o in others)
    return chosen["shape"] in CURVES and all(o["shape"] == "line-straight" for o in others)


def v_r1(pr, ans, vis):
    shapes = [o["shape"] for o in vis["options"]]
    chosen = next(o["shape"] for o in vis["options"] if o["v"] == ans)
    return shapes.count(chosen) == 1 and len(set(shapes)) == 2


R2_SIDE = {"فوق": "في الأعلى", "تحت": "في الأسفل", "يمين": "على اليمين",
           "يسار": "على اليسار", "أمام": "في الأمام", "خلف": "في الخلف"}
R2_OPP = {"في الأعلى": "في الأسفل", "في الأسفل": "في الأعلى",
          "على اليمين": "على اليسار", "على اليسار": "على اليمين",
          "في الأمام": "في الخلف", "في الخلف": "في الأمام"}


def v_r2(pr, ans, vis):
    head, ask = pr.split(". ما الذي ")
    ask = ask.rstrip("؟")
    rel = next(r for r in R2_SIDE if f" {r} " in head)
    a, b = head.split(f" {rel} ")
    return ans == (a if ask == R2_SIDE[rel] else b if ask == R2_OPP[R2_SIDE[rel]] else None)


def v_v4(pr, ans, vis):
    ns = _nums(pr)
    if "؟ ×" in pr:
        b, prod = ns
        return prod % b == 0 and _n1(ans) == prod // b
    if "× ؟" in pr:
        a, prod = ns
        return prod % a == 0 and _n1(ans) == prod // a
    a, b, prod, prod2, b2 = ns
    return a * b == prod and _n1(ans) == prod // b2


def v_g3cmp(lo, hi):
    def check(pr, ans, vis):
        if "علامةٍ" in pr:
            a, b = _nums(pr)
            return ans == (">" if a > b else "<") and lo <= a < hi and lo <= b < hi
        if "الأوسط" in pr:
            nums = _nums(pr)
            return _n1(ans) == sorted(nums)[1]
        if "تصاعدياً" in pr or "تنازلياً" in pr:
            nums = _nums(pr)
            want = min(nums) if "تصاعدياً" in pr else max(nums)
            return _n1(ans) == want
        nums = [_n1(o["v"]) for o in vis["options"]]
        want = max(nums) if "الأكبر" in pr else min(nums)
        return _n1(ans) == want and all(lo <= n < hi for n in nums)
    return check


def v_g3est3_estimate(pr, ans, vis):
    a, b = _nums(pr)[:2]
    r = _r100 if "مئة" in pr else _r10
    op = -1 if "−" in pr else 1
    return _n1(ans) == r(a) + op * r(b)


def v_g3est3_plaus(pr, ans, vis):
    nums = _nums(pr)
    a, b = nums[0], nums[1]
    real = a - b if "−" in pr else a + b
    if "أمعقول" in pr:
        claimed = nums[2]
        return ans == "غير معقول" and claimed != _r100(real)
    return _n1(ans) == _r100(real)


def v_g3est3_decision(pr, ans, vis):
    exact = next(v for k, v in DEC_EXACT.items() if pr.startswith(k))
    return ans == ("جوابٌ دقيق" if exact else "يكفي التقدير")


def v_g3evenm_classify(pr, ans, vis):
    n = _nums(pr)[0]
    return ans == ("زوجي" if n % 2 == 0 else "فردي")


def v_g3evenm_rule(pr, ans, vis):
    return EVENM_RULES[pr] == ans


VERIFIERS = {
    ("g1CAL", "sequence"): v_g1cal_sequence, ("g1CAL", "calendar"): v_g1cal_calendar,
    ("g1CMPQ", "comparative"): v_g1cmpq,
    ("g1EST", "estimation"): v_g1est_estimation, ("g1EST", "reasonableness"): v_g1est_reason,
    ("g1ESTR", "rounding"): v_g1estr_round, ("g1ESTR", "plausibility"): v_g1estr_plaus,
    ("g1EVEN", "pairing"): v_parity, ("g1EVEN", "rule"): v_parity,
    ("g1FRSET", "express"): v_g1frset_express, ("g1FRSET", "take"): v_g1frset_take,
    ("g1MONEY", "identify"): v_g1money_identify, ("g1MONEY", "count"): v_g1money_count,
    ("g1PAT", "extend"): v_g1pat_extend, ("g1PAT", "structure"): v_g1pat_structure,
    ("g1PAT", "symmetry"): v_g1pat_symmetry,
    ("g1SHP3", "recognize"): v_g1shp3_recognize, ("g1SHP3", "classify"): v_g1shp3_classify,
    ("g1SHP3", "compose"): v_g1shp3_compose,
    ("G4", "عدّ"): v_g4, ("G5", "تحقّق"): v_g5_check, ("G5", "بحث"): v_g5_search,
    ("G6", "تركيب"): v_g6, ("G7", "تماثل"): v_g7, ("G8", "تمييز"): v_g8,
    ("R1", "فرز"): v_r1, ("R2", "تموضع"): v_r2, ("V4", "علاقة"): v_v4,
    ("Z", "تصنيف"): v_parity,
    ("g3CMP4", "compare"): v_g3cmp(1000, 10000), ("g3CMP4", "order"): v_g3cmp(1000, 10000),
    ("g3CMP10", "compare"): v_g3cmp(100, 1000), ("g3CMP10", "order"): v_g3cmp(100, 1000),
    ("g3EST3", "estimate"): v_g3est3_estimate, ("g3EST3", "plausibility"): v_g3est3_plaus,
    ("g3EST3", "decision"): v_g3est3_decision,
    ("g3EVENM", "classify"): v_g3evenm_classify, ("g3EVENM", "rule"): v_g3evenm_rule,
}

# per-node numeral cap (the range law) — every numeral in prompt+answer+visual
CAPS = {"g1CAL": 28, "g1CMPQ": 9, "g1EST": 250, "g1ESTR": 100, "g1EVEN": 20,
        "g1FRSET": 12, "g1MONEY": 100, "g1PAT": 6, "g1SHP3": 6,
        "G4": 6, "G5": 6, "G6": 32, "G7": 6, "G8": 6, "R1": 6, "R2": 6, "V4": 81, "Z": 20,
        "g3CMP4": 9999, "g3CMP10": 999, "g3EST3": 1000, "g3EVENM": 99}

# the variation-guard floors: ≥40 computational; HONEST declared floors for the
# finite/geometric families (no fake infinity — owner-ratified)
THRESHOLDS = {"g1CAL": 30, "g1CMPQ": 35, "g1EST": 25, "g1ESTR": 40, "g1EVEN": 25,
              "g1FRSET": 27,   # «خذ» finite by source (halves/quarters of ≤8 → 6 combos)
              "g1MONEY": 22, "g1PAT": 25, "g1SHP3": 25,
              "G4": 9, "G5": 25, "G6": 22, "G7": 11, "G8": 18, "R1": 25, "R2": 35,
              "V4": 40, "Z": 25,
              "g3CMP4": 45, "g3CMP10": 45, "g3EST3": 40, "g3EVENM": 28}

M1_CODES = sorted({c for c, f in VERIFIERS})


def test_m1_covers_the_22():
    assert len(M1_CODES) == 22


def test_families_match_templates_exactly(db):
    # the understanding gate counts families from the anchored TEMPLATE — a
    # generator family with no template would never serve; a template family
    # with no generator would starve. Exact match required.
    for code in M1_CODES:
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
            assert check(pr, ans, vis), (code, family, pr, ans)
            blob = pr + " " + ans + " " + (json.dumps(vis, ensure_ascii=False) if vis else "")
            over = [n for n in _nums(blob) if n > CAPS[code]]
            assert not over, (code, family, pr, over)


def test_options_order_is_shuffled():
    # position memorising must die: across 80 draws of any selection family the
    # correct option must appear in BOTH positions
    rng = random.Random(7)
    for (code, family), _ in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            if vis and vis.get("kind") == "shape-pick" and len(vis["options"]) == 2:
                positions.add(next(i for i, o in enumerate(vis["options"]) if o["v"] == ans))
        assert positions != {0} and positions != {1}, (code, family)


def test_variation_guard_the_22():
    rng = random.Random(99)
    for code, floor in THRESHOLDS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
