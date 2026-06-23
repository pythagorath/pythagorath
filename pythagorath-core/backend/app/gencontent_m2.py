"""M2 — live generators for the 27 HIGH-risk nodes (the G2 six-packs + g1ADD/HALF/QRT).

Same ratified template as m1: sampled context, shuffled options, honest finite
banks. The STORY nodes (M4/V2/S1/S2) use slot vocabularies where every counted
noun is used ONLY with numbers 3–9 (the plural-safe range «٣ تفّاحات…٩ صناديق»)
and verbs are FIXED per vocabulary row (gender agreement baked in, never
computed). Families match the template families exactly.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

# ============================ صف٢ — الضرب والقسمة ============================


@register("M1", "خطّي")
def m1_linear(rng: random.Random, p: dict):
    g = rng.randrange(2, 8)                          # widened 2..7
    per = rng.randrange(2, 9)                        # widened 2..8
    while g * per > p.get("cap", 49):               # to the node's real ceiling (was 30)
        per -= 1
    return (f"كوّن {_h(g)} مجموعات في كلٍّ منها {_h(per)}. كم الإجمالي؟", _h(g * per),
            {"kind": "groups", "mode": "form", "groups": g, "per": per})


@register("M1", "مصفوفة")
def m1_array(rng: random.Random, p: dict):
    r = rng.randrange(2, 8)                          # widened 2..5 → 2..7
    c = rng.randrange(2, 8)                          # widened 2..6 → 2..7
    while r * c > p.get("cap", 49):                 # to the node's real ceiling (was 30)
        c -= 1
    return (f"صفّ مصفوفة: {_h(r)} صفوف × {_h(c)} أعمدة. كم الإجمالي؟", _h(r * c),
            {"kind": "array", "rows": r, "cols": c})


# (container-plural, container-singular, item-plural, ask) — verbs/asks fixed per
# row; numbers stay 3–9 so the plural form is always grammatical
M4_BANK = [("صناديق", "صندوق", "تفّاحات", "كم تفّاحةً؟"),
           ("أطباق", "طبق", "تمرات", "كم تمرةً؟"),
           ("علب", "علبة", "أقلام", "كم قلماً؟"),
           ("سلال", "سلة", "كرات", "كم كرةً؟"),
           ("رفوف", "رف", "كؤوس", "كم كأساً؟")]


@register("M4", "نمذجة")
def m4_story(rng: random.Random, p: dict):
    cp, cs, ip, ask = rng.choice(M4_BANK)
    n1 = rng.randrange(3, 10)
    n2 = rng.randrange(3, 10)
    while n1 * n2 > p.get("cap", 81):
        n2 -= 1
    return (f"{_h(n1)} {cp}، في كلِّ {cs} {_h(n2)} {ip}. {ask}", _h(n1 * n2), None)


@register("V1", "توزيع")
def v1_share(rng: random.Random, p: dict):
    g = rng.randrange(2, 6)
    per = rng.randrange(2, 9)
    while g * per > p.get("cap", 40):
        per -= 1
    total = g * per
    return (f"وزّع {_h(total)} بالتساوي على {_h(g)} مجموعات. كم في كلّ مجموعة؟", _h(per),
            {"kind": "groups", "mode": "share", "total": total, "groups": g})


# (items-plural, receivers-plural, ask) — verbs baked in
V2_BANK = [("قلماً", "تلاميذ", "كم لكلّ تلميذ؟"),
           ("حلوى", "أكياس", "كم في الكيس؟"),
           ("تفّاحةً", "أطفال", "كم لكلّ طفل؟"),
           ("كرةً", "صناديق", "كم في الصندوق؟")]


@register("V2", "نمذجة")
def v2_story(rng: random.Random, p: dict):
    # the counted noun is SINGULAR-منصوب («قلماً») — grammatical only for 11+,
    # so the total stays ≥ 11 (the Arabic-agreement guard, by construction)
    item, recv, ask = rng.choice(V2_BANK)
    g = rng.randrange(3, 6)
    lo = (11 + g - 1) // g                          # smallest per with total ≥ 11
    per = rng.randrange(lo, 9)
    total = g * per
    while total > p.get("cap", 40):
        per -= 1
        total = g * per
    word = "على" if "لكل" in ask else "في"
    return (f"{_h(total)} {item} {word} {_h(g)} {recv} بالتساوي. {ask}", _h(per), None)


@register("V3", "قياس")
def v3_measure(rng: random.Random, p: dict):
    per = rng.randrange(2, 7)
    k = rng.randrange(2, 8)
    while per * k > p.get("cap", 30):
        k -= 1
    total = per * k
    return (f"كم مجموعةً من {_h(per)} في {_h(total)}؟ (اطرح {_h(per)} متكرّراً وعُدّ المجموعات)",
            _h(k), {"kind": "groups", "mode": "measure", "total": total, "per": per})


# ============================ صف٢ — البيانات ============================

CATS = ["أ", "ب", "ج"]


def _chart_data(rng, lo=1, hi=8):
    vals = rng.sample(range(lo, hi + 1), 3)
    return [[c, v] for c, v in zip(CATS, vals)]


def _make_da1(family: str, chart_type: str):
    @register("DA1", family)
    def da1_read(rng: random.Random, p: dict, chart_type=chart_type):
        data = _chart_data(rng)
        label = "مخطّط الصور" if chart_type == "pictograph" else "مخطّط الأعمدة"
        if rng.random() < 0.5:
            cat, val = rng.choice(data)
            word = "كم عدد الفئة" if chart_type == "pictograph" else "ما ارتفاع عمود الفئة"
            return (f"في {label}: {word} «{cat}»؟", _h(val),
                    {"kind": "chart", "mode": "read", "type": chart_type,
                     "data": data, "ask": "count", "cat": cat})
        best = max(data, key=lambda d: d[1])[0]
        word = "أيّ فئة هي الأكثر" if chart_type == "pictograph" else "أيّ فئة عمودها الأطول"
        return (f"في {label}: {word}؟", best,
                {"kind": "chart", "mode": "read", "type": chart_type,
                 "data": data, "ask": "most"})


_make_da1("صور", "pictograph")
_make_da1("أعمدة", "bar")


@register("DA2", "إشارات")
def da2_tally(rng: random.Random, p: dict):
    t = rng.randrange(3, p.get("cap", 10) + 1)
    return (f"سجّل {_h(t)} إشاراتٍ في جدول الإشارات.", _h(t),
            {"kind": "chart", "mode": "build", "type": "tally", "target": t})


@register("DA2", "أعمدة")
def da2_bar(rng: random.Random, p: dict):
    t = rng.randrange(3, p.get("cap", 10) + 1)
    return (f"ارسم عموداً بارتفاع {_h(t)}.", _h(t),
            {"kind": "chart", "mode": "build", "type": "bar", "target": t})


BALL_COLORS = [("red", "حمراء", "أحمر"), ("blue", "زرقاء", "أزرق"),
               ("green", "خضراء", "أخضر"), ("yellow", "صفراء", "أصفر")]


@register("DA3", "حتمية")
def da3_certainty(rng: random.Random, p: dict):
    kind = rng.randrange(3)
    c1, c2 = rng.sample(BALL_COLORS, 2)
    if kind == 0:                                   # only that colour → أكيد
        n = rng.randrange(3, 8)
        return (f"كيس فيه كرات {c1[1]} فقط. سحب كرة {c1[1]} حدثٌ:", "أكيد",
                {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], n]],
                 "ask": "certainty", "event": c1[0]})
    if kind == 1:                                   # other colour only → مستحيل
        n = rng.randrange(3, 8)
        return (f"كيس فيه كرات {c2[1]} فقط. سحب كرة {c1[1]} حدثٌ:", "مستحيل",
                {"kind": "likelihood", "scenario": "bag", "balls": [[c2[0], n]],
                 "ask": "certainty", "event": c1[0]})
    a, b = rng.randrange(2, 7), rng.randrange(2, 7)
    return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. سحب كرة {c1[1]} حدثٌ:", "ممكن",
            {"kind": "likelihood", "scenario": "bag",
             "balls": [[c1[0], a], [c2[0], b]], "ask": "certainty", "event": c1[0]})


@register("DA3", "مقارنة")
def da3_more(rng: random.Random, p: dict):
    c1, c2 = rng.sample(BALL_COLORS, 2)
    a, b = rng.sample(range(2, 9), 2)
    winner = c1 if a > b else c2
    return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. أيّ لون أكثر إمكانية للسحب؟",
            winner[2], {"kind": "likelihood", "scenario": "bag",
                        "balls": [[c1[0], a], [c2[0], b]], "ask": "more"})


# ============================ صف٢ — الكسور ============================


@register("Fr2", "مقارنة")
def fr2_compare(rng: random.Random, p: dict):
    cap = p.get("cap", 6)
    if rng.random() < 0.6:                          # unit fractions: bigger = fewer parts
        a, b = rng.sample(range(2, cap + 1), 2)
        fa, fb = {"parts": a, "shaded": 1}, {"parts": b, "shaded": 1}
        ans = f"١/{_h(min(a, b))}"
    else:                                           # same denominator: bigger numerator
        n = rng.randrange(3, cap + 1)
        k1, k2 = rng.sample(range(1, n), 2)
        fa, fb = {"parts": n, "shaded": k1}, {"parts": n, "shaded": k2}
        ans = f"{_h(max(k1, k2))}/{_h(n)}"
    return ("انقر الكسر الأكبر.", ans,
            {"kind": "fraction", "mode": "compare", "a": fa, "b": fb})


@register("Fr3", "مجموعة")
def fr3_unit_of_set(rng: random.Random, p: dict):
    g = rng.choice([2, 2, 3, 4, 5])
    k = rng.randrange(1, max(2, p.get("cap", 12) // g + 1))
    total = g * k
    if total > p.get("cap", 12):
        total = g
        k = 1
    return (f"ما ١/{_h(g)} من {_h(total)}؟ وزِّعها على {_h(g)} مجموعات وخذ مجموعة.",
            _h(k), {"kind": "groups", "mode": "share", "total": total, "groups": g})


# ============================ صف٢ — القياس والزمن ============================


@register("Q1", "طول")
def q1_length(rng: random.Random, p: dict):
    n = rng.randrange(2, 10)
    return ("كم سنتيمتراً طول هذا الجسم؟ انقر نهايته على المسطرة.", _h(n),
            {"kind": "measure", "mode": "ruler", "length": n, "max": 10})


@register("Q1", "كتلة")
def q1_mass(rng: random.Random, p: dict):
    n = rng.randrange(2, 10)
    return ("كم غراماً كتلة الجسم؟ أضِف أثقالاً حتى يتّزن الميزان.", _h(n),
            {"kind": "measure", "mode": "balance", "mass": n})


@register("Q1", "سعة")
def q1_capacity(rng: random.Random, p: dict):
    n = rng.randrange(2, 7)
    return ("كم كوباً يملأ هذا الإناء؟ اسكب الأكواب حتى يمتلئ.", _h(n),
            {"kind": "measure", "mode": "container", "cups": n})


# the FINITE time bank — declared honestly
TIME_UNITS = ["الدقيقة", "الساعة", "اليوم", "الأسبوع", "الشهر", "السنة"]  # ordered
DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
EVENT_SEQS = [("الاستيقاظُ، الذهابُ للمدرسة، النومُ", "الاستيقاظ", "النوم", "حدثٍ في اليوم"),
              ("الفطورُ، الغداءُ، العشاءُ", "الفطور", "العشاء", "وجبة")]


@register("Q5", "ترتيب")
def q5_time_order(rng: random.Random, p: dict):
    kind = rng.randrange(3)
    if kind == 0:                                   # unit comparison
        i, jx = sorted(rng.sample(range(len(TIME_UNITS)), 2))
        longer = rng.random() < 0.5
        a, b = TIME_UNITS[i], TIME_UNITS[jx]
        first, second = rng.sample([a, b], 2)
        if longer:
            return (f"أيُّ وحدةٍ زمنيةٍ أطول: {first} أم {second}؟ اكتب الأطول.",
                    TIME_UNITS[jx], None)
        return (f"أيُّ وحدةٍ أقصر: {first} أم {second}؟ اكتب الأقصر.", TIME_UNITS[i], None)
    if kind == 1:                                   # daily-events sequence
        seq, first, last, noun = rng.choice(EVENT_SEQS)
        ask_first = rng.random() < 0.5
        return (f"رتّب زمنياً: {seq} — ما {'أوّلُ' if ask_first else 'آخرُ'} {noun}؟",
                first if ask_first else last, None)
    i = rng.randrange(7)                            # week-day succession
    after = rng.random() < 0.5
    ans = DAYS[(i + 1) % 7] if after else DAYS[(i - 1) % 7]
    return (f"أيّامُ الأسبوع: ما اليومُ الذي يأتي {'بعد' if after else 'قبل'} {DAYS[i]}؟",
            ans, None)


# ============================ صف٢ — حل المسائل ============================

# (name, items-plural-3-9, lose-verb, gain-verb, gain-ask) — verbs AND the
# gendered ask fixed per row (the S2 gender catch, applied here too)
S1_BANK = [("سالم", "تفّاحات", "أعطى", "أخذ", "كم لديه الآن؟"),
           ("أحمد", "كرات", "أعطى", "اشترى", "كم لديه الآن؟"),
           ("نورة", "أقلام", "أعطت", "اشترت", "كم لديها الآن؟"),
           ("سارة", "ورود", "أهدت", "قطفت", "كم لديها الآن؟")]


@register("S1", "نمذجة")
def s1_one_step(rng: random.Random, p: dict):
    name, items, lose, gain, gain_ask = rng.choice(S1_BANK)
    a = rng.randrange(4, 10)
    sub = rng.random() < 0.5
    if sub:
        b = rng.randrange(2, a)
        return (f"لدى {name} {_h(a)} {items}، {lose} {_h(b)}. كم بقي؟", _h(a - b), None)
    b = rng.randrange(2, min(10, p.get("cap", 20) - a))
    return (f"لدى {name} {_h(a)} {items}، {gain} {_h(b)}. {gain_ask}", _h(a + b), None)


# (name, items, lose-verb, gain-verb, ask) — the pronoun AND the verbs agree with
# the name's gender inside one row (the S2 gender bug, caught by the visual check),
# and the ask is «كم صار…» (neutral: works whether the steps lost or gained)
S2_BANK = [("نورة", "ريالات", "اشترت بـ", "حصلت على", "كم صار معها؟"),
           ("خالد", "أقلام", "أعطى", "اشترى", "كم صار معه؟"),
           ("سارة", "كرات", "أعطت", "اشترت", "كم صار معها؟")]


@register("S2", "نمذجة")
def s2_two_step(rng: random.Random, p: dict):
    name, items, lose, gain, ask = rng.choice(S2_BANK)
    start = rng.randrange(6, 11)                   # plural nouns: stay in the 3–10 range
    ops = []
    cur = start
    for _ in range(2):
        if rng.random() < 0.5 and cur >= 4:
            d = rng.randrange(2, cur - 1)
            ops.append((lose, -d))
            cur -= d
        else:
            d = rng.randrange(2, 8)
            ops.append((gain, +d))
            cur += d
    if cur > p.get("cap", 30):
        return s2_two_step(rng, p)
    steps = f"{ops[0][0]} {_h(abs(ops[0][1]))} ثم {ops[1][0]} {_h(abs(ops[1][1]))}"
    return (f"مع {name} {_h(start)} {items}، {steps}. {ask}", _h(cur), None)


# ============================ صف٢ — الأنماط والترتيبي ============================

P_SHAPES = ["circle", "square", "triangle"]
P_AR = {"circle": "دائرة", "square": "مربع", "triangle": "مثلث"}


@register("P", "نمط")
def p_pattern(rng: random.Random, p: dict):
    kind = rng.randrange(3)
    if kind == 0:                                   # repeating numbers
        a, b = rng.sample(range(1, 10), 2)
        seq = [a, b, a, b]
        opts = sorted({a, b, a + b if a + b < 10 else a + 1})
        return (f"أكمل النمط المتكرّر: {'، '.join(_h(x) for x in seq)}، ؟", _h(a),
                {"kind": "pattern", "itemType": "number", "seq": seq, "options": opts})
    if kind == 1:                                   # skip-count numbers
        d = rng.choice([2, 3, 5])
        s = rng.randrange(1, 6)
        seq = [s, s + d, s + 2 * d, s + 3 * d]
        ans = s + 4 * d
        opts = sorted({ans, ans - 1, ans + 1})
        return (f"أكمل النمط: {'، '.join(_h(x) for x in seq)}، ؟", _h(ans),
                {"kind": "pattern", "itemType": "number", "seq": seq, "options": opts})
    a, b = rng.sample(P_SHAPES, 2)                  # repeating shapes
    seq = [a, b, a, b, a]
    opts = [{"v": P_AR[a], "shape": a}, {"v": P_AR[b], "shape": b}]
    rng.shuffle(opts)
    return ("أكمل النمط المتكرّر بالأشكال:", P_AR[b],
            {"kind": "pattern", "itemType": "shape", "seq": seq, "options": opts})


ORD_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"]
LETTERS4 = ["أ", "ب", "ج", "د"]
ORD_SHAPES = ["circle", "square", "triangle", "rectangle", "pentagon", "hexagon"]


@register("Ord", "ترتيبي")
def ord_position(rng: random.Random, p: dict):
    count = rng.choice([3, 4])
    pos = rng.randrange(count)
    row = rng.sample(ORD_SHAPES, count)
    opts = [{"v": LETTERS4[i], "shape": row[i]} for i in range(count)]
    return (f"في الصفّ: انقر الشكل {ORD_NAMES[pos]}.", LETTERS4[pos],
            {"kind": "shape-pick", "options": opts})


# ============================ صف٢ — الهندسة ============================

G1_SHAPES = [("circle", "دائرة"), ("square", "مربع"),
             ("rectangle", "مستطيل"), ("triangle", "مثلث")]
G2_SOLIDS = [("cube", "مكعب"), ("sphere", "كرة"), ("cylinder", "أسطوانة"),
             ("cone", "مخروط"), ("pyramid", "هرم")]


def _make_recognize(code, bank, noun):
    @register(code, "تعرّف")
    def recognize(rng: random.Random, p: dict, bank=bank, noun=noun):
        target = rng.choice(bank)
        others = rng.sample([s for s in bank if s != target], rng.choice([1, 2]))
        opts = [{"v": n, "shape": k} for k, n in [target] + others]
        rng.shuffle(opts)
        return (f"ما اسم هذا {noun}؟ انقر الإجابة.", target[1],
                {"kind": "shape-pick", "show": target[0], "options": opts})


_make_recognize("G1", G1_SHAPES, "الشكل")
_make_recognize("G2", G2_SOLIDS, "المجسم")

# the honest finite space: the two SOURCE solids × three elements
G3_SOLID_ELEMENTS = {("cube", "faces"): 6, ("cube", "vertices"): 8, ("cube", "edges"): 12,
                     ("pyramid", "faces"): 5, ("pyramid", "vertices"): 5,
                     ("pyramid", "edges"): 8}
ELEMENT_AR = {"faces": ("أوجه", "وجهاً"), "vertices": ("رؤوس", "رأساً"),
              "edges": ("أحرف", "حرفاً")}


@register("G3", "عدّ")
def g3_elements(rng: random.Random, p: dict):
    (solid, element), n = rng.choice(list(G3_SOLID_ELEMENTS.items()))
    solid_ar = "المكعب" if solid == "cube" else "الهرم"
    pl, sg = ELEMENT_AR[element]
    return (f"انقر {pl} {solid_ar} لتعدّها. كم {sg}؟", _h(n),
            {"kind": "element-count", "solid": solid, "element": element, "n": n})


# ============================ صف٢ — الجمع والطرح (B/A) ============================


@register("A2", "aggregative")
def a2_blocks(rng: random.Random, p: dict):
    m, s = _borrow_pair(rng, p.get("cap", 99))
    return (f"اطرح {_h(s)} من {_h(m)} بالقضبان: الآحاد لا تكفي — افتح قضيباً ثم خذ.",
            _h(m - s), {"kind": "subtract-blocks", "minuend": m, "subtract": s})


@register("A2", "magnitude")
def a2_line(rng: random.Random, p: dict):
    m, s = _borrow_pair(rng, p.get("cap", 99))
    return (f"على الخطّ: ابدأ من {_h(m)}، اقفز {_h(s)} للخلف — انقر الوصول.", _h(m - s),
            {"kind": "number-line", "min": 0, "max": (m // 10 + 1) * 10,
             "start": m, "jump": s, "back": True})


@register("A2", "decompositional")
def a2_place(rng: random.Random, p: dict):
    m, s = _borrow_pair(rng, p.get("cap", 99))
    return (f"اطرح بالخانات (افتح عشرة للاستلاف): {_h(m)} − {_h(s)}", _h(m - s),
            {"kind": "decomposition", "mode": "place-sub", "minuend": m, "subtrahend": s})


def _borrow_pair(rng, cap):
    """minuend/subtrahend that genuinely BORROW (ones(m) < ones(s)), within cap."""
    while True:
        m = rng.randrange(21, cap)
        if m % 10 == 9:
            continue
        s_ones = rng.randrange(m % 10 + 1, 10)
        s_tens = rng.randrange(0, m // 10)
        s = s_tens * 10 + s_ones
        if 0 < s < m:
            return m, s


def _maketen_pair(rng):
    a = rng.randrange(6, 10)
    b = rng.randrange(11 - a, 10)                  # crosses ten: a+b in [11..18]
    return a, b


@register("B2", "aggregative")
def b2_frame(rng: random.Random, p: dict):
    a, b = _maketen_pair(rng)
    return (f"املأ الإطار: أضِف {_h(b)} نقاط إلى {_h(a)}، وشاهد العشرة تكتمل وتفيض.",
            _h(a + b), {"kind": "ten-frame", "start": a, "add": b})


@register("B2", "magnitude")
def b2_line(rng: random.Random, p: dict):
    a, b = _maketen_pair(rng)
    return (f"على الخطّ: ابدأ من {_h(a)}، اقفز {_h(b)} — انقر موضع وصولك.", _h(a + b),
            {"kind": "number-line", "min": 0, "max": 20, "start": a, "jump": b})


@register("B2", "decompositional")
def b2_decomp(rng: random.Random, p: dict):
    a, b = _maketen_pair(rng)
    return (f"فكِّك لتُكمل العشرة: {_h(a)} + {_h(b)} = ١٠ + ؟", _h(a + b - 10),
            {"kind": "decomposition", "a": a, "b": b, "make": 10})


def _through_ten_pair(rng):
    m = rng.randrange(11, 17)
    s = rng.randrange(m % 10 + 1, 10)              # crosses down through ten
    return m, s


@register("B3", "aggregative")
def b3_blocks(rng: random.Random, p: dict):
    m, s = _through_ten_pair(rng)
    return (f"اطرح {_h(s)} من {_h(m)} بالقضبان: افتح العشرة ثم خذ.", _h(m - s),
            {"kind": "subtract-blocks", "minuend": m, "subtract": s})


@register("B3", "magnitude")
def b3_line(rng: random.Random, p: dict):
    m, s = _through_ten_pair(rng)
    return (f"على الخطّ: ابدأ من {_h(m)}، اقفز {_h(s)} للخلف.", _h(m - s),
            {"kind": "number-line", "min": 0, "max": 20, "start": m, "jump": s, "back": True})


@register("B3", "decompositional")
def b3_decomp(rng: random.Random, p: dict):
    m, s = _through_ten_pair(rng)
    return (f"اطرح خلال العشرة: {_h(m)} − {_h(s)}", _h(m - s),
            {"kind": "decomposition", "mode": "place-sub", "minuend": m, "subtrahend": s})


def _no_regroup_pair(rng):
    a_t, b_t = rng.randrange(1, 6), rng.randrange(1, 5)
    a_o = rng.randrange(1, 9)
    b_o = rng.randrange(1, 10 - a_o)
    return a_t * 10 + a_o, b_t * 10 + b_o


@register("B4", "aggregative")
def b4_blocks(rng: random.Random, p: dict):
    a, b = _no_regroup_pair(rng)
    return (f"ابدأ بـ{_h(a)}، أضِف {_h(b)} بالقضبان والمكعّبات (بلا تبديل).", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b})


@register("B4", "magnitude")
def b4_line(rng: random.Random, p: dict):
    a, b = _no_regroup_pair(rng)
    return (f"على الخطّ: ابدأ من {_h(a)}، اقفز {_h(b)} للأمام.", _h(a + b),
            {"kind": "number-line", "min": 0, "max": ((a + b) // 10 + 1) * 10,
             "start": a, "jump": b})


@register("B4", "decompositional")
def b4_place(rng: random.Random, p: dict):
    a, b = _no_regroup_pair(rng)
    return (f"اجمع بالخانات: {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


@register("F12", "decompositional")
def f12_missing(rng: random.Random, p: dict):
    form = rng.randrange(4)
    if form < 2:                                   # addition with a missing part
        c = rng.randrange(8, 19)
        a = rng.randrange(2, c - 1)
        miss_first = form == 0
        shown = c - a
        if miss_first:
            return (f"أوجد العدد المفقود: ؟ + {_h(shown)} = {_h(c)}.", _h(a), None)
        return (f"أوجد العدد المفقود: {_h(shown)} + ؟ = {_h(c)}.", _h(a), None)
    m = rng.randrange(6, 19)                       # subtraction with a missing part
    s = rng.randrange(2, m - 1)
    if form == 2:
        return (f"أوجد المفقود: ؟ − {_h(s)} = {_h(m - s)}.", _h(m), None)
    return (f"أوجد المفقود: {_h(m)} − ؟ = {_h(m - s)}.", _h(s), None)


# ============================ صف١ — الثلاثي ============================

# (story-template with {a}/{b}, fixed verbs+nouns, plural-safe 2–9)
G1ADD_STORIES = ["في الغصن {a} عصافير، حطّت {b} أخرى — املأ الإطار: كم صارت؟",
                 "مع سالم {a} كرات، أعطته أخته {b} — مثِّل على الإطار: كم معه الآن؟",
                 "في السلة {a} تفاحات، أضافت أمي {b} — أكمل الإطار: كم المجموع؟"]


@register("g1ADD", "aggregative")
def g1add_frame(rng: random.Random, p: dict):
    a = rng.randrange(2, 8)
    b = rng.randrange(2, min(9, 11 - a))
    if rng.random() < 0.7:
        story = rng.choice(G1ADD_STORIES).format(a=_h(a), b=_h(b))
    else:
        story = f"املأ الإطار: أضِف {_h(b)} إلى {_h(a)}."
    return (story, _h(a + b), {"kind": "ten-frame", "start": a, "add": b})


@register("g1ADD", "symbolic")
def g1add_symbolic(rng: random.Random, p: dict):
    a = rng.randrange(0, 9)
    b = rng.randrange(0, 10 - a)
    if rng.random() < 0.25:                        # vertical CASE
        return (f"بالشكل الرأسي — العلويّ {_h(a)} والسفليّ {_h(b)}: ما ناتج الجمع؟",
                _h(a + b), None)
    return (f"أكمل: {_h(a)} + {_h(b)} = ؟", _h(a + b), None)


@register("g1HALF", "judge")
def g1half_judge(rng: random.Random, p: dict):
    equal = rng.random() < 0.5
    if equal:
        widths = [1] * rng.choice([2, 3, 4])
    else:
        widths = rng.choice([[2, 1], [1, 2], [1, 1, 2], [3, 1], [1, 3], [2, 1, 1]])
    ans = "متساوية" if equal else "غير متساوية"
    return ("انظر إلى تقسيم الشريط: هل الأجزاء متساوية؟", ans,
            {"kind": "fraction", "mode": "judge", "widths": widths})


@register("g1HALF", "name")
def g1half_name(rng: random.Random, p: dict):
    shaded = rng.choice([1, 1, 2])
    opts = ["٠/٢", "١/٢", "٢/٢"] if rng.random() < 0.5 else ["١/٢", "٢/٢"]
    ans = f"{_h(shaded)}/٢"
    if ans not in opts:
        opts.append(ans)
    return ("ما الكسر الملوّن؟ انقر الإجابة.", ans,
            {"kind": "fraction", "mode": "name", "parts": 2, "shaded": shaded,
             "options": opts})


@register("g1HALF", "shade")
def g1half_shade(rng: random.Random, p: dict):
    prompt = rng.choice(["ظلِّل ١ من ٢ أجزاء متساوية.",
                         "شارِك زميلك بالتساوي: ظلِّل نصيبه — نصف الشريط."])
    return (prompt, "١/٢", {"kind": "fraction", "mode": "shade", "parts": 2, "target": 1})


@register("g1QRT", "name")
def g1qrt_name(rng: random.Random, p: dict):
    parts = rng.choice([4, 4, 3])                  # thirds are CASES (the ratified map)
    shaded = rng.randrange(1, parts)
    opts = [f"{_h(k)}/{_h(parts)}" for k in range(1, parts + 1)]
    return ("ما الكسر الملوّن؟ انقر الإجابة.", f"{_h(shaded)}/{_h(parts)}",
            {"kind": "fraction", "mode": "name", "parts": parts, "shaded": shaded,
             "options": opts})


@register("g1QRT", "shade")
def g1qrt_shade(rng: random.Random, p: dict):
    parts = rng.choice([4, 4, 3])
    target = rng.randrange(1, parts)
    return (f"ظلِّل {_h(target)} من {_h(parts)} أجزاء متساوية.",
            f"{_h(target)}/{_h(parts)}",
            {"kind": "fraction", "mode": "shade", "parts": parts, "target": target})
