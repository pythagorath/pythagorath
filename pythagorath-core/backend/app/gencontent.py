"""M1 — live generators for the 22 CRITICAL nodes (the variation-audit list).

Every generator follows the ratified trio: the CONTEXT is sampled (the shown
number/shape/scene varies, so no answer sequence exists to memorise), the OPTION
ORDER is shuffled (kills position memorising), and FINITE rule/scenario families
are declared honestly (an explicit bank, wrapped by computed siblings) — never a
fake infinity. Families MATCH the node's template families exactly (the
understanding gate counts families from the template the instance anchors to).

Range guards live in the PARAM SPACE (defaults here; a template row's
``generator.params`` JSON overrides them — admin-tunable). The independent
verifiers and the per-node variation thresholds live in tests/test_m1_generators.py.

Arabic number agreement: counted nouns come from curated vocabularies that pair
every singular with its 3–10 plural («تفاحات» not «تفاحة») and items are EMOJI
runs counted visually, so no generated sentence inflects a noun after a numeral.
"""
from __future__ import annotations

import random

from app.generators import register

_HD = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")


def _h(n) -> str:
    return str(n).translate(_HD)


def _pick2(rng, good, bad):
    opts = [{"v": good}, {"v": bad}]
    rng.shuffle(opts)
    return {"kind": "shape-pick", "options": opts}


# ============================ صف١ ============================

DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
MONTHS = ["محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
          "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"]


@register("g1CAL", "sequence")
def g1cal_sequence(rng: random.Random, p: dict):
    if rng.random() < 0.7:
        i = rng.randrange(7)
        after = rng.random() < 0.5
        ans = DAYS[(i + 1) % 7] if after else DAYS[(i - 1) % 7]
        wrong = DAYS[(i + (3 if after else -3)) % 7]
        return (f"ما اليوم الذي {'بعد' if after else 'قبل'} {DAYS[i]} مباشرةً؟",
                ans, _pick2(rng, ans, wrong))
    i = rng.randrange(len(MONTHS) - 1)
    ans, wrong = MONTHS[i + 1], MONTHS[(i + 4) % 12]
    return (f"أكمل أشهر السنة: {MONTHS[max(0, i - 1)]}، {MONTHS[i]}، ؟",
            ans, _pick2(rng, ans, wrong))


@register("g1CAL", "calendar")
def g1cal_calendar(rng: random.Random, p: dict):
    start = rng.randrange(7)
    date = rng.randrange(1, p.get("max_date", 28) + 1)
    ans = DAYS[(start + date - 1) % 7]
    wrong = DAYS[(start + date + 1) % 7]
    return (f"شهرٌ أوّلُ أيامه {DAYS[start]}: في أيِّ يومٍ يقع التاريخ {_h(date)}؟",
            ans, _pick2(rng, ans, wrong))


# (emoji, label-with-article) — pre-2018 glyphs only (the Windows-10 tofu rule)
CMPQ_SETS = [("🍎", "التفاح"), ("🍐", "الكمثرى"), ("⚽", "الكرات"), ("🐤", "العصافير"),
             ("🐱", "القطط"), ("🍓", "الفراولة"), ("🍌", "الموز"), ("⭐", "النجوم"),
             ("🚗", "السيارات"), ("🌙", "الأهلّة")]


@register("g1CMPQ", "comparative")
def g1cmpq(rng: random.Random, p: dict):
    cap = p.get("cap", 9)
    (e1, l1), (e2, l2) = rng.sample(CMPQ_SETS, 2)
    kind = rng.choice(["more", "less", "equal"])
    if kind == "equal":
        same = rng.random() < 0.5
        a = rng.randrange(2, cap + 1)
        b = a if same else min(cap, a + rng.choice([-2, -1, 1, 2]) % cap + 1)
        if b == a and not same:
            b = a + 1 if a < cap else a - 1
        ans = "نعم" if a == b else "لا"
        return (f"{e1 * a} مقابل {e2 * b} — هل المجموعتان متكافئتان؟",
                ans, _pick2(rng, ans, "لا" if ans == "نعم" else "نعم"))
    a, b = rng.sample(range(2, cap + 1), 2)
    ask_more = kind == "more"
    ans = (l1 if a > b else l2) if ask_more else (l1 if a < b else l2)
    other = l2 if ans == l1 else l1
    return (f"{e1 * a} ({l1}) مقابل {e2 * b} ({l2}) — انقر {'الأكثر' if ask_more else 'الأقل'}.",
            ans, _pick2(rng, ans, other))


EST_EMOJI = ["🍎", "⭐", "🐤", "⚽", "🌙", "🌸", "🐠", "🎈", "🦋", "🍪"]
# the FINITE reasonableness bank — declared honestly (scenario, good, absurd)
EST_SCENES = [("عدد تلاميذ صفّك", 20, 200), ("عدد أصابع يديك", 10, 100),
              ("عدد عجلات السيارة", 4, 40), ("عدد كتب حقيبتك", 6, 60),
              ("عدد أرجل القطة", 4, 44), ("عدد أيام الأسبوع", 7, 70),
              ("عدد أبواب الصف", 2, 20), ("عدد عيون الإنسان", 2, 22),
              ("عدد لاعبي فريق كرة القدم", 11, 90), ("عدد أشهر السنة", 12, 120),
              ("عدد ألوان قوس قزح", 7, 77), ("عدد نوافذ بيتك", 8, 80),
              ("عدد أصابع يدٍ واحدة", 5, 50), ("عدد فصول السنة", 4, 40)]


@register("g1EST", "estimation")
def g1est_estimation(rng: random.Random, p: dict):
    n = rng.randrange(6, p.get("cap", 28) + 1)
    # the distractor stays PERCEPTUALLY far (≥10 away) — for small n the downward
    # distractor would collapse toward n (the verifier caught this), so go up
    far = n + rng.randrange(10, 16) if n < 16 else n + rng.choice([-1, 1]) * rng.randrange(10, 16)
    prompt = rng.choice(["قدِّر دون عدّ: كم تقريباً؟",
                         "بنظرةٍ سريعة دون عدّ: كم العدد تقريباً؟",
                         "خمِّن العدد تقريباً (دون أن تعدّ):"])
    return (prompt, _h(n),
            {"kind": "element-count", "objects": rng.choice(EST_EMOJI), "n": n,
             "notap": True, "options": rng.sample([_h(n), _h(far)], 2)})


@register("g1EST", "reasonableness")
def g1est_reason(rng: random.Random, p: dict):
    scene, good, absurd = rng.choice(EST_SCENES)
    return (f"{scene} — أيُّ تقديرٍ معقول؟", _h(good), _pick2(rng, _h(good), _h(absurd)))


@register("g1ESTR", "rounding")
def g1estr_round(rng: random.Random, p: dict):
    cap = p.get("cap", 99)
    sub = rng.random() < 0.5
    r = lambda x: (x + 5) // 10 * 10
    while True:
        a = rng.randrange(11, cap - 10)
        b = rng.randrange(11, cap - 10)
        if a % 10 in (0,) or b % 10 in (0,):
            continue                                   # keep real rounding work
        if sub and r(a) - r(b) >= 10 and a > b:
            return (f"قرِّب لأقرب عشرة ثم اطرح: {_h(a)} − {_h(b)} ≈ {_h(r(a))} − {_h(r(b))} = ؟",
                    _h(r(a) - r(b)), None)
        if not sub and r(a) + r(b) <= cap + 1:
            return (f"قرِّب لأقرب عشرة ثم اجمع: {_h(a)} + {_h(b)} ≈ {_h(r(a))} + {_h(r(b))} = ؟",
                    _h(r(a) + r(b)), None)


@register("g1ESTR", "plausibility")
def g1estr_plaus(rng: random.Random, p: dict):
    cap = p.get("cap", 99)
    sub = rng.random() < 0.5
    r = lambda x: (x + 5) // 10 * 10
    while True:
        a = rng.randrange(11, cap - 10)
        b = rng.randrange(11, cap - 10)
        real = a - b if sub else a + b
        if (sub and a > b + 10 or not sub and real <= cap) and real > 15:
            break
    good = r(real)
    bad = good + rng.choice([-1, 1]) * rng.choice([30, 40])
    if bad <= 0 or bad > cap:                       # stay inside the node's range
        bad = good - 30 if good > 40 else good + 30
    return (f"{_h(a)} {'−' if sub else '+'} {_h(b)}: أيُّ الناتجين أقرب؟",
            _h(good), _pick2(rng, _h(good), _h(bad)))


EVEN_EMOJI = ["🧦", "🍎", "⭐", "🐤", "⚽"]


@register("g1EVEN", "pairing")
def g1even_pairing(rng: random.Random, p: dict):
    n = rng.randrange(3, p.get("cap", 12) + 1)
    ans = "فردي" if n % 2 else "زوجي"
    return (f"{rng.choice(EVEN_EMOJI) * n} ({_h(n)}) — زاوِجها اثنين اثنين: أيبقى واحدٌ بلا زوج؟",
            ans, _pick2(rng, ans, "زوجي" if ans == "فردي" else "فردي"))


@register("g1EVEN", "rule")
def g1even_rule(rng: random.Random, p: dict):
    n = rng.randrange(10, p.get("cap_rule", 20) + 1)
    ans = "فردي" if n % 2 else "زوجي"
    return (f"العدد {_h(n)} — انظر إلى آحاده: زوجيٌّ أم فرديّ؟",
            ans, _pick2(rng, ans, "زوجي" if ans == "فردي" else "فردي"))


FRSET_SETS = [("🍎", "التفاحات الحمراء"), ("🔵", "الكرات الزرقاء"),
              ("🌹", "الورود الحمراء"), ("🐦", "العصافير")]


@register("g1FRSET", "express")
def g1frset_express(rng: random.Random, p: dict):
    n = rng.randrange(2, p.get("cap", 8) + 1)
    k = rng.randrange(1, n)
    emoji, label = rng.choice(FRSET_SETS)
    ans = f"{_h(k)} من {_h(n)}"
    wrong = f"{_h(n - k)} من {_h(n)}" if n - k != k else f"{_h(k)} من {_h(n + 1)}"
    return (f"{emoji * k}{'⚪' * (n - k)} — ما جزء {label} من المجموعة؟ (بصيغة «كذا من كذا»)",
            ans, _pick2(rng, ans, wrong))


@register("g1FRSET", "take")
def g1frset_take(rng: random.Random, p: dict):
    g = rng.choice([2, 2, 4])                          # halves twice as common (source weight)
    total = g * rng.randrange(1, (p.get("cap", 8) // g) + 1)
    if total < g:
        total = g
    return (f"ما ١/{_h(g)} من {_h(total)}؟ وزِّعها على {_h(g)} مجموعات وخذ مجموعة.",
            _h(total // g), {"kind": "groups", "mode": "share", "total": total, "groups": g})


COINS = [5, 10, 25, 50]                                 # the source fils denominations


@register("g1MONEY", "identify")
def g1money_identify(rng: random.Random, p: dict):
    coin = rng.choice(COINS)
    others = [c for c in COINS if c != coin]
    opts = sorted(rng.sample(others, 2) + [coin])
    return ("ما قيمة هذه القطعة؟", _h(coin),
            {"kind": "money", "mode": "identify", "coin": coin, "options": opts})


@register("g1MONEY", "count")
def g1money_count(rng: random.Random, p: dict):
    if rng.random() < 0.7:
        coins = [rng.choice(COINS) for _ in range(rng.choice([2, 2, 3]))]
        while sum(coins) > p.get("cap", 99):
            coins = coins[:-1]
        return ("اجمع قيم القطع: كم المجموع؟", _h(sum(coins)),
                {"kind": "money", "mode": "total", "coins": coins})
    have = [rng.choice(COINS), rng.choice([5, 10])]
    price = sum(have) + rng.choice([-3, -1, 2, 5])
    ans = "نعم" if sum(have) >= price else "لا"
    return (f"ثمن اللعبة {_h(price)} — معك قطعتا {_h(have[0])} و{_h(have[1])}: هل تكفي؟",
            ans, _pick2(rng, ans, "لا" if ans == "نعم" else "نعم"))


PAT_SHAPES = [("circle", "دائرة"), ("square", "مربع"), ("triangle", "مثلث")]
PAT_EMOJI = ["🔴", "🔵", "⭐", "🌙"]
POS_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"]
# the FINITE symmetry bank (object, symmetric?) — declared honestly
SYM_BANK = [("🦋 الفراشة", True), ("🧤 قفّازٌ واحد", False), ("⭕ الحلقة", True),
            ("🔺 المثلث المتساوي", True), ("🌙 الهلال", False), ("⬛ المربع", True),
            ("👞 حذاءٌ واحد", False), ("➰ الوشاح الملتفّ", False)]


@register("g1PAT", "extend")
def g1pat_extend(rng: random.Random, p: dict):
    a, b = rng.sample(PAT_SHAPES, 2)
    unit = rng.choice([[a, b], [a, a, b], [a, b, b]])
    seq = (unit * 3)[:rng.choice([4, 5, 6])]
    nxt = unit[len(seq) % len(unit)]
    opts = [{"v": a[1], "shape": a[0]}, {"v": b[1], "shape": b[0]}]
    rng.shuffle(opts)
    return ("أكمل النمط المتكرّر بالأشكال:", nxt[1],
            {"kind": "pattern", "itemType": "shape",
             "seq": [s[0] for s in seq], "options": opts})


@register("g1PAT", "structure")
def g1pat_structure(rng: random.Random, p: dict):
    def periodic(s):
        return any(all(s[i] == s[i % L] for i in range(len(s))) for L in (2, 3))
    while True:
        a, b = rng.sample(PAT_EMOJI, 2)
        unit = rng.choice([[a, b], [a, b, b]])
        seq = (unit * 3)[:rng.choice([5, 6])]          # ≥5: short breaks can be re-readable
        pos = rng.randrange(1, len(seq))               # never break the anchor item
        seq[pos] = b if seq[pos] == a else a
        # the broken sequence must NOT be readable as a valid 2/3-unit pattern, AND
        # exactly ONE flip may restore one — otherwise a thinking child could
        # legitimately pick the «wrong» option (verifier catch, hardened)
        def flips(s):
            out = 0
            for j in range(len(s)):
                t = list(s)
                t[j] = b if t[j] == a else a
                if periodic(t):
                    out += 1
            return out
        if not periodic(seq) and flips(seq) == 1:
            break
    ans = POS_NAMES[pos]
    wrong = POS_NAMES[(pos + 2) % len(seq)]
    return (" ".join(seq) + " — أيُّ موضعٍ كسر النمط؟", ans, _pick2(rng, ans, wrong))


@register("g1PAT", "symmetry")
def g1pat_symmetry(rng: random.Random, p: dict):
    obj, sym = rng.choice(SYM_BANK)
    ans = "نعم" if sym else "لا"
    return (f"{obj}: هل نصفاه متماثلان بالطيّ؟", ans,
            _pick2(rng, ans, "لا" if ans == "نعم" else "نعم"))


SOLIDS = [("cube", "مكعب"), ("sphere", "كرة"), ("cylinder", "أسطوانة"),
          ("cone", "مخروط"), ("pyramid", "هرم")]
ROLLERS = {"sphere", "cylinder", "cone"}


@register("g1SHP3", "recognize")
def g1shp3_recognize(rng: random.Random, p: dict):
    (key, name), (k2, wrong) = rng.sample(SOLIDS, 2)
    opts = [{"v": name}, {"v": wrong}]
    rng.shuffle(opts)
    return ("ما اسم هذا المجسم؟ انقر الإجابة.", name,
            {"kind": "shape-pick", "show": key, "options": opts})


@register("g1SHP3", "classify")
def g1shp3_classify(rng: random.Random, p: dict):
    roll = rng.random() < 0.5
    roller = rng.choice([s for s in SOLIDS if s[0] in ROLLERS])
    flat = rng.choice([s for s in SOLIDS if s[0] not in ROLLERS])
    ans = roller[1] if roll else flat[1]
    opts = [{"v": roller[1], "shape": roller[0]}, {"v": flat[1], "shape": flat[0]}]
    rng.shuffle(opts)
    return (f"أيُّ المجسّمين {'يتدحرج' if roll else 'لا يتدحرج'}؟", ans,
            {"kind": "shape-pick", "options": opts})


@register("g1SHP3", "compose")
def g1shp3_compose(rng: random.Random, p: dict):
    (k1, bottom), (k2, top) = rng.sample(SOLIDS, 2)
    ans = f"{bottom}ٍ فوقه {top}"
    wrong = f"{top}ٍ فوقه {bottom}"
    return (f"جسمٌ مركّبٌ من {ans} — أيُّ وصفٍ صحيح؟", ans, _pick2(rng, ans, wrong))


# ============================ صف٢ ============================

POLYGONS = [("triangle", "المثلث", 3), ("square", "المربع", 4),
            ("rectangle", "المستطيل", 4), ("pentagon", "المخمّس", 5),
            ("hexagon", "المسدّس", 6)]


@register("G4", "عدّ")
def g4_count(rng: random.Random, p: dict):
    key, name, n = rng.choice(POLYGONS)
    element = rng.choice(["sides", "corners"])
    word = "ضلعاً" if element == "sides" else "زاوية"
    return (f"انقر {'أضلاع' if element == 'sides' else 'زوايا'} {name} لتعدّها. كم {word}؟",
            _h(n), {"kind": "element-count", "shape": key, "element": element, "n": n})


SHAPES2D = [("circle", "دائرة"), ("square", "مربع"), ("rectangle", "مستطيل"),
            ("triangle", "مثلث"), ("pentagon", "مخمّس"), ("hexagon", "مسدّس")]
LETTERS = ["أ", "ب", "ج"]


@register("G5", "تحقّق")
def g5_check(rng: random.Random, p: dict):
    same = rng.random() < 0.5
    s1 = rng.choice(SHAPES2D)
    s2 = s1 if same else rng.choice([s for s in SHAPES2D if s != s1])
    ans = "نعم" if same else "لا"
    v = _pick2(rng, ans, "لا" if ans == "نعم" else "نعم")
    v["pair"] = [s1[0], s2[0]]
    return ("هل الشكلان متطابقان (نفس الشكل والحجم)؟", ans, v)


@register("G5", "بحث")
def g5_search(rng: random.Random, p: dict):
    target = rng.choice(SHAPES2D)
    others = rng.sample([s for s in SHAPES2D if s != target], 2)
    pos = rng.randrange(3)
    row = others[:pos] + [target] + others[pos:]
    opts = [{"v": LETTERS[i], "shape": row[i][0]} for i in range(3)]
    return ("انقر الشكل المطابق للشكل المعروض.", LETTERS[pos],
            {"kind": "shape-pick", "show": target[0], "options": opts})


# G6 — the owner-approved redesign: the answer is a COMPOSITION DECISION.
# (the drag widget is retired from generated serving — visual_debt.md)
G6_VALID = [("مثلثان قائمان متطابقان", "مربعاً"), ("٤ مربعات صغيرة", "مربعاً أكبر"),
            ("مربعان متطابقان", "مستطيلاً"), ("٣ مربعات متجاورة", "مستطيلاً"),
            ("مثلثان متطابقان", "مستطيلاً"), ("٤ مثلثات", "مربعاً")]
G6_INVALID = [("دائرتان", "مربعاً"), ("٣ دوائر", "مستطيلاً"),
              ("دائرة ومثلث", "مستطيلاً"), ("دائرتان", "مثلثاً")]


@register("G6", "تركيب")
def g6_compose(rng: random.Random, p: dict):
    case = rng.random()
    if case < 0.4:                                     # (أ) عدّ القطع — الوِحدنة
        n, m = rng.randrange(2, 5), rng.randrange(2, 5)
        if rng.random() < 0.6:
            return (f"شبكة مستطيلٍ {_h(n)} صفوف × {_h(m)} أعمدة — انقر المربعات لتعدّ كم مربعاً يكوّنه.",
                    _h(n * m), {"kind": "array", "rows": n, "cols": m})
        return (f"كلُّ مربعٍ يُبنى من مثلثين — كم مثلثاً يلزم لشبكة {_h(n)} × {_h(m)} مربعات؟",
                _h(2 * n * m), None)
    if case < 0.7:                                     # (ب) اختيار المجموعة الصانعة
        good, target = rng.choice(G6_VALID)
        bad = rng.choice([g for g, t in G6_INVALID])
        return (f"أيُّ المجموعتين تكوّن {target}؟", good, _pick2(rng, good, bad))
    if rng.random() < 0.5:                             # (ج) حكم الإمكان
        pieces, target = rng.choice(G6_VALID)
        ans = "نعم"
    else:
        pieces, target = rng.choice(G6_INVALID)
        ans = "لا"
    return (f"أيمكن تكوين {target} من {pieces}؟", ans,
            _pick2(rng, ans, "لا" if ans == "نعم" else "نعم"))


# G7 — symmetry with a REAL «لا» (the new no-symmetry glyphs)
G7_BANK = [("circle", True), ("square", True), ("rectangle", True),
           ("triangle-iso", True), ("triangle", True),
           ("l-shape", False), ("triangle-scalene", False)]


@register("G7", "تماثل")
def g7_symmetry(rng: random.Random, p: dict):
    if rng.random() < 0.75:
        shape, sym = rng.choice(G7_BANK)
        ans = "نعم" if sym else "لا"
        prompt = rng.choice(["هل لهذا الشكل خطّ تماثل؟",
                             "أيمكن طيُّ هذا الشكل نصفين متطابقين؟"])
        v = _pick2(rng, ans, "لا" if ans == "نعم" else "نعم")
        v["show"] = shape
        return (prompt, ans, v)
    v = _pick2(rng, "عمودي", "أفقي")
    v["show"] = "triangle-iso"
    return ("انقر خطّ التماثل الصحيح لهذا المثلث المتساوي الساقين.", "عمودي", v)


CURVES = ["line-curved", "line-curved-s"]            # visual variants, one classification
LETTERS4 = ["أ", "ب", "ج", "د"]


@register("G8", "تمييز")
def g8_lines(rng: random.Random, p: dict):
    # the honest space of two line KINDS is tiny — widen it with a varying option
    # count (2–4) and a second curved glyph, never a new classification
    straight = rng.random() < 0.5
    count = rng.choice([2, 3, 3, 4])
    pos = rng.randrange(count)
    kinds = []
    for i in range(count):
        if i == pos:
            kinds.append("line-straight" if straight else rng.choice(CURVES))
        else:
            kinds.append(rng.choice(CURVES) if straight else "line-straight")
    opts = [{"v": LETTERS4[i], "shape": kinds[i]} for i in range(count)]
    return (f"انقر الخطّ {'المستقيم' if straight else 'المنحني'}.", LETTERS4[pos],
            {"kind": "shape-pick", "options": opts})


R1_POOL = SHAPES2D + [("cube", "مكعب"), ("sphere", "كرة"), ("cone", "مخروط")]


@register("R1", "فرز")
def r1_sort(rng: random.Random, p: dict):
    base = rng.choice(R1_POOL)
    odd = rng.choice([s for s in R1_POOL if s != base])
    pos = rng.randrange(3)
    row = [base, base, base]
    row[pos] = odd
    opts = [{"v": LETTERS[i], "shape": row[i][0]} for i in range(3)]
    return ("انقر الشكل المختلف (لا ينتمي).", LETTERS[pos],
            {"kind": "shape-pick", "options": opts})


R2_OBJECTS = ["المربع", "الدائرة", "القلم", "الكتاب", "الكرة", "الصندوق",
              "الطائر", "الشجرة", "السيارة", "البيت"]
# (relation, ask-for-subject, ask-for-OTHER-object) — asking BOTH sides kills the
# «الجواب أول اسمٍ في الجملة» linguistic shortcut (caught during m1 authoring)
R2_RELS = [("فوق", "في الأعلى", "في الأسفل"), ("تحت", "في الأسفل", "في الأعلى"),
           ("يمين", "على اليمين", "على اليسار"), ("يسار", "على اليسار", "على اليمين"),
           ("أمام", "في الأمام", "في الخلف"), ("خلف", "في الخلف", "في الأمام")]


@register("R2", "تموضع")
def r2_position(rng: random.Random, p: dict):
    a, b = rng.sample(R2_OBJECTS, 2)
    rel, ask_a, ask_b = rng.choice(R2_RELS)
    if rng.random() < 0.5:
        return (f"{a} {rel} {b}. ما الذي {ask_a}؟", a, _pick2(rng, a, b))
    return (f"{a} {rel} {b}. ما الذي {ask_b}؟", b, _pick2(rng, b, a))


@register("V4", "علاقة")
def v4_relation(rng: random.Random, p: dict):
    a = rng.randrange(2, p.get("cap_factor", 9) + 1)
    b = rng.randrange(2, p.get("cap_factor", 9) + 1)
    prod = a * b
    form = rng.randrange(3)
    if form == 0:
        return (f"إذا كان {_h(a)} × {_h(b)} = {_h(prod)}، فكم {_h(prod)} ÷ {_h(b)}؟",
                _h(a), None)
    if form == 1:
        return (f"أكمل العدد المجهول: ؟ × {_h(b)} = {_h(prod)}", _h(a), None)
    return (f"أكمل العدد المجهول: {_h(a)} × ؟ = {_h(prod)}", _h(b), None)


@register("Z", "تصنيف")
def z_classify(rng: random.Random, p: dict):
    n = rng.randrange(1, p.get("cap", 20) + 1)
    ans = "فردي" if n % 2 else "زوجي"
    prompt = rng.choice([f"هل العدد {_h(n)} زوجيّ أم فرديّ؟",
                         f"العدد {_h(n)}: صنِّفه — زوجيٌّ أم فرديّ؟"])
    return (prompt, ans, _pick2(rng, ans, "زوجي" if ans == "فردي" else "فردي"))


# ============================ صف٣ ============================

def _cmp_pair(rng, lo, hi):
    """Two CLOSE numbers (often same leading digits — real comparison work)."""
    a = rng.randrange(lo, hi)
    delta = rng.choice([1, 2, 5, 9, 10, 30, 90, 100])
    b = a + rng.choice([-1, 1]) * delta
    if not (lo <= b < hi) or b == a:
        b = a - delta if a - delta >= lo else a + delta
    return a, b


def _make_cmp(code: str, lo: int, hi: int):
    @register(code, "compare")
    def compare(rng: random.Random, p: dict, lo=lo, hi=hi):
        a, b = _cmp_pair(rng, p.get("lo", lo), p.get("hi", hi))
        if rng.random() < 0.5:
            bigger = rng.random() < 0.5
            ans = max(a, b) if bigger else min(a, b)
            return (f"انقر العدد {'الأكبر' if bigger else 'الأصغر'}.", _h(ans),
                    {"kind": "shape-pick",
                     "options": [{"v": _h(x)} for x in rng.sample([a, b], 2)]})
        ans = ">" if a > b else "<"
        return (f"أيُّ علامةٍ تصحّ: {_h(a)} ؟ {_h(b)}", ans,
                _pick2(rng, ans, "<" if ans == ">" else ">"))

    @register(code, "order")
    def order(rng: random.Random, p: dict, lo=lo, hi=hi):
        lo, hi = p.get("lo", lo), p.get("hi", hi)
        if rng.random() < 0.5:
            nums = rng.sample(range(lo, hi), 3)
            return ("رتّب من الأصغر إلى الأكبر واكتب الأوسط: "
                    + "، ".join(_h(n) for n in nums), _h(sorted(nums)[1]), None)
        nums = rng.sample(range(lo, hi), 4)
        asc = rng.random() < 0.5
        ans = min(nums) if asc else max(nums)
        return (f"رتّب {'تصاعدياً' if asc else 'تنازلياً'} واكتب الأوّل: "
                + "، ".join(_h(n) for n in nums), _h(ans), None)


_make_cmp("g3CMP4", 1000, 10000)
_make_cmp("g3CMP10", 100, 1000)


@register("g3EST3", "estimate")
def g3est3_estimate(rng: random.Random, p: dict):
    r100 = lambda x: (x + 50) // 100 * 100
    r10 = lambda x: (x + 5) // 10 * 10
    if rng.random() < 0.7:
        while True:
            a, b = rng.randrange(120, 880), rng.randrange(120, 880)
            sub = rng.random() < 0.5
            if a % 100 == 0 or b % 100 == 0:
                continue
            if sub and r100(a) - r100(b) >= 100:
                return (f"قدِّر بالتقريب لأقرب مئة: {_h(a)} − {_h(b)} ≈ ؟",
                        _h(r100(a) - r100(b)), None)
            if not sub and r100(a) + r100(b) <= 1000:
                return (f"قدِّر بالتقريب لأقرب مئة: {_h(a)} + {_h(b)} ≈ ؟",
                        _h(r100(a) + r100(b)), None)
    while True:
        a, b = rng.randrange(15, 85), rng.randrange(15, 85)
        if a % 10 and b % 10 and r10(a) + r10(b) <= 200:
            return (f"قدِّر بالتقريب لأقرب عشرة: {_h(a)} + {_h(b)} ≈ ؟",
                    _h(r10(a) + r10(b)), None)


@register("g3EST3", "plausibility")
def g3est3_plaus(rng: random.Random, p: dict):
    r100 = lambda x: (x + 50) // 100 * 100
    while True:
        a, b = rng.randrange(120, 880), rng.randrange(120, 880)
        sub = rng.random() < 0.5
        real = a - b if sub else a + b
        if 150 < real <= 950:
            break
    good = r100(real)
    bad = good + rng.choice([-1, 1]) * rng.choice([200, 300])
    if bad <= 0 or bad > 1000:
        bad = good - 200 if good > 250 else good + 200
    if rng.random() < 0.7:
        return (f"{_h(a)} {'−' if sub else '+'} {_h(b)} — أيُّ الناتجين معقول؟",
                _h(good), _pick2(rng, _h(good), _h(bad)))
    # the claimed-result form must carry the SAME operation it was computed with —
    # a «+» surface over a «−» computation made the false claim accidentally true
    # (verifier catch #3)
    verb = "طرح سالم" if sub else "جمع سالم"
    op = "−" if sub else "+"
    return (f"{verb} {_h(a)} {op} {_h(b)} فقال: الناتج {_h(bad)} — أمعقول؟",
            "غير معقول", _pick2(rng, "غير معقول", "معقول"))


# the FINITE decision bank (scenario template, needs-exact?) — numbers sampled in
DEC_BANK = [("أيكفي معك {m} ريالٍ لغرضين بـ {x} و{y}؟ — ماذا يلزمك لتجيب؟", False),
            ("كم بقي معك بالضبط بعد شراءٍ بـ {x} من {m}؟ — ماذا يلزمك لتجيب؟", True),
            ("أيُّهما أرخص تقريباً: غرضٌ بـ {x} أم غرضان بـ {y} و{z}؟ — ماذا يلزمك لتجيب؟", False),
            ("ما المجموع الصحيح تماماً لفاتورتين بـ {x} و{y}؟ — ماذا يلزمك لتجيب؟", True)]


@register("g3EST3", "decision")
def g3est3_decision(rng: random.Random, p: dict):
    tpl, exact = rng.choice(DEC_BANK)
    nums = dict(m=_h(rng.choice([100, 200, 500])), x=_h(rng.randrange(31, 95)),
                y=_h(rng.randrange(31, 95)), z=_h(rng.randrange(31, 95)))
    ans = "جوابٌ دقيق" if exact else "يكفي التقدير"
    return (tpl.format(**nums), ans,
            _pick2(rng, ans, "يكفي التقدير" if exact else "جوابٌ دقيق"))


@register("g3EVENM", "classify")
def g3evenm_classify(rng: random.Random, p: dict):
    n = rng.randrange(10, p.get("cap", 99) + 1)
    even = n % 2 == 0
    ans = "زوجي" if even else "فردي"
    form = rng.randrange(2)
    if form == 0 and even:
        return (f"{_h(n)} = ٢ × {_h(n // 2)} — أزوجيٌّ هو أم فردي؟",
                ans, _pick2(rng, ans, "فردي"))
    return (f"هل يقبل {_h(n)} القسمةَ على ٢ بلا باقٍ؟ فما هو؟",
            ans, _pick2(rng, ans, "زوجي" if ans == "فردي" else "فردي"))


# the FINITE multiplicative-parity rule bank — declared honestly
EVENM_RULES = [("ضاعفتُ عدداً فردياً — ماذا يكون الناتج دائماً؟", "زوجياً دائماً", "فردياً دائماً"),
               ("حاصل ضرب أيِّ عددٍ في ٢ يكون…", "زوجياً", "فردياً"),
               ("جميع الأعداد في جدول ضرب الأربعة…", "زوجية", "فردية"),
               ("جميع الأعداد في جدول ضرب الستة…", "زوجية", "فردية"),
               ("فرديٌّ × فرديٌّ يكون الناتج…", "فردياً", "زوجياً"),
               ("زوجيٌّ × زوجيٌّ يكون الناتج…", "زوجياً", "فردياً"),
               ("أيُّ جدولٍ تكون كلُّ نواتجه زوجية؟", "جدول ٨", "جدول ٧"),
               ("أيُّ جدولٍ تتناوب نواتجه زوجياً وفردياً؟", "جدول ٥", "جدول ٦")]


@register("g3EVENM", "rule")
def g3evenm_rule(rng: random.Random, p: dict):
    prompt, good, bad = rng.choice(EVENM_RULES)
    return (prompt, good, _pick2(rng, good, bad))
