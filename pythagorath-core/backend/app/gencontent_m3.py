"""M3 — live generators for the remaining 74 nodes (the structural tier).

Semi-mechanical conversion: most of these are WIDGET-PARAMETRIC (the payload is
the question), so shared FACTORIES sample the payload per node-range. The same
ratified trio everywhere: sampled context, shuffled options, honest finite banks.
g1SHP2's «compose» family had G6's zero-decision disease (the drag widget always
emits «نعم») — converted with the owner-approved G6 pattern (composition
JUDGMENT + pick-the-set as cases inside the family), declared in the report.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

# ---------------- shared factories ----------------


def seq_node(code, family, make):
    """sequence widget: complete the next term."""
    @register(code, family)
    def gen(rng: random.Random, p: dict, make=make):
        terms, ans, label = make(rng)
        return (f"أكمل {label}: " + "، ".join(_h(t) for t in terms) + "، ؟",
                _h(ans), {"kind": "sequence", "terms": terms})


def build_node(code, family, lo, hi, prompt):
    """base-ten-blocks: build the target number."""
    @register(code, family)
    def gen(rng: random.Random, p: dict):
        t = rng.randrange(lo, hi + 1)
        return (prompt.format(n=_h(t)), _h(t), {"kind": "base-ten-blocks", "target": t})


def locate_node(code, family, step, mx, prompt):
    """number-line locate: tap the nearest step-multiple."""
    @register(code, family)
    def gen(rng: random.Random, p: dict):
        while True:
            t = rng.randrange(step // 2, mx - step // 2)
            if t % step:
                break
        ans = (t + step // 2) // step * step
        return (prompt.format(n=_h(t)), _h(ans),
                {"kind": "number-line", "min": 0, "max": mx, "step": step, "target": t})


def jump_node(code, family, make, back=False):
    """number-line jump: start ± jump, exact landing."""
    @register(code, family)
    def gen(rng: random.Random, p: dict, make=make, back=back):
        start, jump, mx, label = make(rng)
        ans = start - jump if back else start + jump
        v = {"kind": "number-line", "min": 0, "max": mx, "start": start, "jump": jump}
        if back:
            v["back"] = True
        word = "للخلف" if back else "للأمام"
        return (f"على الخطّ: ابدأ من {_h(start)}، اقفز {_h(jump)} {word}{label}. أين تقف؟",
                _h(ans), v)


# ---------------- صف٢: العمود الفقري العددي ----------------

seq_node("E1", "sequential", lambda r: (lambda s: ([s, s + 1, s + 2], s + 3, "التتابع"))(r.randrange(5, 96)))
seq_node("E2", "sequential", lambda r: (lambda s: ([s, s - 1], s - 2, "التنازل"))(r.randrange(5, 99)))
seq_node("C4", "sequential", lambda r: (lambda s: ([s, s + 10, s + 20], s + 30, "التتابع"))(r.randrange(1, 8) * 10))
build_node("C4", "aggregative", 10, 90, "ابنِ {n} بقضبان العشرات، وشاهد القيمة تتسلّق بالعشرات.")
build_node("C1", "aggregative", 21, 99, "ابنِ العدد {n} بالقضبان (عشرات) والمكعّبات (آحاد).")
locate_node("C1", "magnitude", 10, 100, "على خطّ ٠..١٠٠، انقر أقرب عقد إلى {n}.")
locate_node("C5", "magnitude", 100, 1000, "على خطّ ٠..١٠٠٠، انقر أقرب مئة إلى {n}.")
locate_node("N11", "magnitude", 10, 100, "على خطّ ٠..١٠٠، انقر أقرب عقد (عشرة) إلى {n}.")
build_node("C5", "aggregative", 102, 987, "ابنِ العدد {n} بالألواح (مئات) والقضبان (عشرات) والمكعّبات (آحاد).")


@register("C1", "decompositional")
def c1_expand(rng: random.Random, p: dict):
    n = rng.randrange(21, 99)
    if n % 10 == 0:
        n += rng.randrange(1, 9)
    tens = n // 10 * 10
    return (f"فكِّك إلى عشرات وآحاد: {_h(n)} = {_h(tens)} + ؟", _h(n - tens),
            {"kind": "decomposition", "mode": "expand", "whole": n, "tens": tens})


@register("C5", "decompositional")
def c5_expand3(rng: random.Random, p: dict):
    h, t, o = rng.randrange(1, 10), rng.randrange(0, 10), rng.randrange(0, 10)
    parts = [h * 100, t * 10, o]
    blank = rng.randrange(3)
    names = ["المئات", "العشرات", "الآحاد"]
    shown = ["؟" if i == blank else _h(parts[i]) for i in range(3)]
    whole = sum(parts)
    return (f"فكّك {_h(whole)} = {shown[0]} + {shown[1]} + {shown[2]} — أدخِل قيمة {names[blank]}.",
            _h(parts[blank]), {"kind": "decomposition", "mode": "expand3",
                               "parts": parts, "blank": blank})


@register("C3", "aggregative")
def c3_bundle(rng: random.Random, p: dict):
    cubes = rng.randrange(1, 10) * 10
    return (f"لديك {_h(cubes)} مكعّباً مفرداً، اربط كلَّ ١٠ في قضيب. كم قضيب عشرة؟",
            _h(cubes // 10), {"kind": "regroup-blocks", "rods": 0, "cubes": cubes, "ask": "tens"})


@register("C3", "decompositional")
def c3_convert(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        q = rng.randrange(1, 10)
        return (f"{_h(q)} عشرات = ؟ آحاد", _h(q * 10),
                {"kind": "decomposition", "mode": "unit-convert", "qty": q,
                 "from": "عشرات", "to": "آحاد", "answer": q * 10})
    q = rng.randrange(1, 10) * 10
    return (f"{_h(q)} آحاد = ؟ عشرات", _h(q // 10),
            {"kind": "decomposition", "mode": "unit-convert", "qty": q,
             "from": "آحاد", "to": "عشرات", "answer": q // 10})


@register("B1", "aggregative")
def b1_open(rng: random.Random, p: dict):
    rods, cubes = rng.randrange(2, 9), rng.randrange(1, 9)
    n = rods * 10 + cubes
    return (f"{_h(n)}: افتح قضيباً إلى ١٠ آحاد (القيمة تبقى {_h(n)}). كم الآحاد الآن؟",
            _h(cubes + 10), {"kind": "regroup-blocks", "rods": rods, "cubes": cubes, "ask": "ones"})


@register("B1", "decompositional")
def b1_nonstd(rng: random.Random, p: dict):
    rods, cubes = rng.randrange(2, 9), rng.randrange(1, 9)
    n = rods * 10 + cubes
    tens = (rods - 1) * 10
    return (f"تفكيك غير قياسي: {_h(n)} = {_h(tens)} + ؟", _h(n - tens),
            {"kind": "decomposition", "mode": "expand", "whole": n, "tens": tens})


def _carry_pair2(rng):
    a = rng.randrange(15, 89)
    if a % 10 == 0:
        a += rng.randrange(1, 9)
    b_ones = rng.randrange(10 - a % 10, 10)
    b = rng.choice([0, 10, 20]) + b_ones
    if a + b > 99 or b == 0:
        return _carry_pair2(rng)
    return a, b


@register("A1", "aggregative")
def a1_blocks(rng: random.Random, p: dict):
    a, b = _carry_pair2(rng)
    return (f"ابنِ {_h(a)}، أضِف {_h(b)} (اجمع الآحاد ← اربط عشرة). المجموع؟", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b, "carry": True})


jump_node("A1", "magnitude",
          lambda r: (lambda d: (d * 10 - r.randrange(1, 5), r.randrange(5, 9), 100, f" (تعبر {_h(d*10)})"))(r.randrange(2, 9)))


@register("A1", "decompositional")
def a1_place(rng: random.Random, p: dict):
    a, b = _carry_pair2(rng)
    return (f"اجمع بالخانات (بحمل): {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


def _carry_pair3(rng):
    a = rng.randrange(125, 700)
    b = rng.randrange(85, 299)
    if (a % 10) + (b % 10) >= 10 and a + b <= 999:
        return a, b
    return _carry_pair3(rng)


@register("A3", "aggregative")
def a3_blocks(rng: random.Random, p: dict):
    a, b = _carry_pair3(rng)
    return (f"ابنِ {_h(a)}، أضِف {_h(b)} (حمل الآحاد ثم العشرات). المجموع؟", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b, "carry": True})


jump_node("A3", "magnitude",
          lambda r: (lambda h: (h * 100 - r.randrange(1, 5), r.randrange(5, 9), 1000, f" (تعبر {_h(h*100)})"))(r.randrange(2, 9)))


@register("A3", "decompositional")
def a3_place(rng: random.Random, p: dict):
    a, b = _carry_pair3(rng)
    return (f"اجمع بالخانات (بحمل): {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


def _borrow_pair3(rng):
    m = rng.randrange(210, 980)
    s_ones = rng.randrange(m % 10 + 1, 10) if m % 10 < 9 else 9
    s = rng.randrange(1, m // 100) * 100 + rng.randrange(0, 10) * 10 + s_ones
    if 0 < s < m and (m % 10) < (s % 10):
        return m, s
    return _borrow_pair3(rng)


@register("A4", "aggregative")
def a4_blocks(rng: random.Random, p: dict):
    m, s = _borrow_pair3(rng)
    return (f"اطرح {_h(s)} من {_h(m)} بالألواح والقضبان (افتح للاستلاف). الباقي؟",
            _h(m - s), {"kind": "subtract-blocks", "minuend": m, "subtract": s})


jump_node("A4", "magnitude",
          lambda r: (lambda h: (h * 100 + r.randrange(1, 5), r.randrange(5, 9), 1000, f" (تعبر {_h(h*100)})"))(r.randrange(2, 9)), back=True)


@register("A4", "decompositional")
def a4_place(rng: random.Random, p: dict):
    m, s = _borrow_pair3(rng)
    return (f"اطرح بالخانات: {_h(m)} − {_h(s)}", _h(m - s),
            {"kind": "decomposition", "mode": "place-sub", "minuend": m, "subtrahend": s})


def _nb_pair2(rng):
    m_t, s_t = rng.randrange(3, 10), 0
    m_o = rng.randrange(2, 10)
    s_t = rng.randrange(1, m_t)
    s_o = rng.randrange(1, m_o + 1)
    return m_t * 10 + m_o, s_t * 10 + s_o


@register("B5", "aggregative")
def b5_blocks(rng: random.Random, p: dict):
    m, s = _nb_pair2(rng)
    return (f"اطرح {_h(s)} من {_h(m)} بالقضبان (الآحاد تكفي — لا تحتاج فتحاً).",
            _h(m - s), {"kind": "subtract-blocks", "minuend": m, "subtract": s})


jump_node("B5", "magnitude", lambda r: (lambda m, s: (m, s, 100, ""))(*_nb_pair2(r)), back=True)


@register("B5", "decompositional")
def b5_place(rng: random.Random, p: dict):
    m, s = _nb_pair2(rng)
    return (f"اطرح بالخانات: {_h(m)} − {_h(s)}", _h(m - s),
            {"kind": "decomposition", "mode": "place-sub", "minuend": m, "subtrahend": s})


jump_node("D1", "magnitude", lambda r: (lambda s: (s, r.randrange(2, 7), 20, ""))(r.randrange(6, 14)))
jump_node("D2", "magnitude", lambda r: (lambda s: (s, r.randrange(2, 7), 20, ""))(r.randrange(8, 19)), back=True)

seq_node("N4", "sequential", lambda r: (lambda d: (lambda s: ([s, s + d, s + 2 * d], s + 3 * d, f"العدّ بالقفز {_h(d)}"))(d * r.randrange(1, 3)))(r.choice([2, 5])))
jump_node("N4", "magnitude", lambda r: (lambda d: (r.randrange(1, 4) * d, d, 25, ""))(r.choice([2, 5])))


@register("N9", "decompositional")
def n9_compare(rng: random.Random, p: dict):
    a = rng.randrange(12, 99)
    if rng.random() < 0.5:
        b = (a % 10) * 10 + a // 10                  # digit swap (the tens insight)
        if b == a or not 10 <= b <= 99:
            d = rng.randrange(3, 20)
            b = a - d if a + d > 99 else a + d       # stay inside the node's cap
        hint = " (قارن العشرات)"
    else:
        b = a // 10 * 10 + (a + rng.randrange(1, 5)) % 10
        if b == a:
            b = a + 1
        hint = " (العشرات متساوية — قارن الآحاد)" if b // 10 == a // 10 else ""
    big = rng.random() < 0.5
    ans = (max if big else min)(a, b)
    return (f"أيّهما {'أكبر' if big else 'أصغر'}: {_h(a)} أم {_h(b)}؟{hint} اكتب {'الأكبر' if big else 'الأصغر'}.",
            _h(ans), None)


@register("N10", "decompositional")
def n10_order(rng: random.Random, p: dict):
    nums = rng.sample(range(12, 99), 3)
    big = rng.random() < 0.5
    ans = max(nums) if big else min(nums)
    return (f"رتّب تصاعدياً: " + "، ".join(_h(n) for n in nums)
            + f" — ما العدد {'الأكبر' if big else 'الأصغر'}؟", _h(ans), None)


# ---------------- صف٢: F/T (الحقائق والاستراتيجيات) ----------------


@register("F1", "decompositional")
def f1_props(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        a, b = rng.randrange(2, 10), rng.randrange(2, 10)
        return (f"إذا كان {_h(a)} + {_h(b)} = {_h(a + b)}، فكم يساوي {_h(b)} + {_h(a)}؟ (التبديل)",
                _h(a + b), None)
    a = rng.randrange(1, 5)
    b = 10 - a
    c = rng.randrange(2, 10)
    return (f"استعمل التجميع: ({_h(a)} + {_h(b)}) + {_h(c)} = ؟", _h(10 + c), None)


@register("F11", "decompositional")
def f11_relation(rng: random.Random, p: dict):
    a, b = rng.randrange(3, 10), rng.randrange(3, 10)
    c = a + b
    take_a = rng.random() < 0.5
    t = a if take_a else b
    return (f"إذا كان {_h(a)} + {_h(b)} = {_h(c)}، فكم يساوي {_h(c)} − {_h(t)}؟ (فكّر بالجمع)",
            _h(c - t), None)


@register("F13", "decompositional")
def f13_family(rng: random.Random, p: dict):
    a, b = rng.randrange(2, 9), rng.randrange(2, 9)
    if a == b:
        b += 1
    c = a + b
    take_a = rng.random() < 0.5
    t, ans = (a, b) if take_a else (b, a)
    return (f"من العائلة ({_h(min(a,b))}، {_h(max(a,b))}، {_h(c)}): أكمل {_h(c)} − {_h(t)} = ؟",
            _h(ans), None)


@register("F4", "aggregative")
def f4_frame(rng: random.Random, p: dict):
    n = rng.randrange(2, 10)
    return (f"املأ الإطار: ضِعف {_h(n)} ({_h(n)} + {_h(n)}).", _h(2 * n),
            {"kind": "ten-frame", "start": n, "add": n})


jump_node("F4", "magnitude", lambda r: (lambda n: (n, n, 20, f" (ضِعف {_h(n)})"))(r.randrange(2, 10)))


@register("F5", "aggregative")
def f5_frame(rng: random.Random, p: dict):
    n = rng.randrange(2, 9)
    return (f"املأ الإطار: {_h(n)} + {_h(n + 1)} (ضِعف {_h(n)} زائد ١).", _h(2 * n + 1),
            {"kind": "ten-frame", "start": n, "add": n + 1})


@register("F5", "decompositional")
def f5_decomp(rng: random.Random, p: dict):
    n = rng.randrange(2, 9)
    return (f"قرّب المضاعفات: {_h(n)} + {_h(n + 1)} = ({_h(n)} + {_h(n)}) + ١ = ؟",
            _h(2 * n + 1), {"kind": "decomposition", "mode": "place-add", "a": n, "b": n + 1})


@register("F7", "decompositional")
def f7_three(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        a = rng.randrange(1, 9)
        b = 10 - a
        c = rng.randrange(2, 10)
        order = [a, b, c] if rng.random() < 0.5 else [a, c, b]
        return ("اجمع (ابحث عن العشرة): " + " + ".join(_h(x) for x in order) + " = ؟",
                _h(10 + c), None)
    d = rng.randrange(2, 8)
    c = rng.randrange(2, min(9, 21 - 2 * d))       # keep the three-addend sum ≤ 20
    if c == d:
        c = c + 1 if c + 1 < min(9, 21 - 2 * d) else c - 1
    return (f"اجمع (ابحث عن الضِعف): {_h(d)} + {_h(d)} + {_h(c)} = ؟", _h(2 * d + c), None)


@register("F9", "aggregative")
def f9_blocks(rng: random.Random, p: dict):
    n = rng.randrange(3, 10)
    return (f"اطرح بالقضبان مستعيناً بالضِعف: {_h(2 * n)} − {_h(n)}.", _h(n),
            {"kind": "subtract-blocks", "minuend": 2 * n, "subtract": n})


jump_node("F9", "magnitude", lambda r: (lambda n: (2 * n, n, 20, f" (ضِعف {_h(n)})"))(r.randrange(3, 10)), back=True)


@register("T1", "aggregative")
def t1_blocks(rng: random.Random, p: dict):
    a = rng.randrange(2, 8) * 10
    b = rng.randrange(1, (100 - a) // 10 + 1) * 10
    return (f"ابدأ بـ{_h(a)}، أضِف {_h(b)} بقضبان العشرات.", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b})


@register("T1", "decompositional")
def t1_place(rng: random.Random, p: dict):
    a = rng.randrange(2, 8) * 10
    b = rng.randrange(1, (100 - a) // 10 + 1) * 10
    return (f"اجمع العشرات بالخانات: {_h(a)} + {_h(b)}.", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


@register("T5", "decompositional")
def t5_three(rng: random.Random, p: dict):
    while True:
        nums = [rng.randrange(11, 35) for _ in range(3)]
        if sum(nums) <= 99:
            break
    carry = (nums[0] % 10 + nums[1] % 10 + nums[2] % 10) >= 10
    return (f"اجمع ({'مع حمل' if carry else 'بلا حمل'}): "
            + " + ".join(_h(n) for n in nums) + " = ؟", _h(sum(nums)), None)


def _round_op_node(code, sub):
    @register(code, "decompositional")
    def gen(rng: random.Random, p: dict, sub=sub):
        r = lambda x: (x + 5) // 10 * 10
        while True:
            a, b = rng.randrange(13, 88), rng.randrange(13, 88)
            if a % 10 == 0 or b % 10 == 0:
                continue
            if sub and a > b + 10 and r(a) - r(b) >= 10:
                return (f"قرّب كلّ عدد لأقرب عشرة ثم اطرح: {_h(a)} − {_h(b)} ≈ ؟",
                        _h(r(a) - r(b)), None)
            if not sub and r(a) + r(b) <= 110:
                return (f"قرّب كلّ عدد لأقرب عشرة ثم اجمع: {_h(a)} + {_h(b)} ≈ ؟",
                        _h(r(a) + r(b)), None)


_round_op_node("T6", sub=False)
_round_op_node("T10", sub=True)


# ---------------- صف٢: الكسور والقياس والبيانات ----------------


@register("Fr1", "تسمية")
def fr1_name(rng: random.Random, p: dict):
    parts = rng.choice([2, 3, 4])
    shaded = rng.randrange(1, parts + 1)
    opts = [f"{_h(k)}/{_h(parts)}" for k in range(1, parts + 1)]
    return ("ما الكسر الملوّن؟ انقر الإجابة.", f"{_h(shaded)}/{_h(parts)}",
            {"kind": "fraction", "mode": "name", "parts": parts, "shaded": shaded,
             "options": opts})


@register("Fr1", "تجزئة")
def fr1_shade(rng: random.Random, p: dict):
    parts = rng.choice([2, 3, 4])
    target = rng.randrange(1, parts)
    return (f"ظلِّل {_h(target)} من {_h(parts)} أجزاء متساوية.",
            f"{_h(target)}/{_h(parts)}",
            {"kind": "fraction", "mode": "shade", "parts": parts, "target": target})


HOUR_NAMES = ["الواحدة", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة",
              "السابعة", "الثامنة", "التاسعة", "العاشرة", "الحادية عشرة", "الثانية عشرة"]


def _clock_node(code, family, minutes, digital):
    @register(code, family)
    def gen(rng: random.Random, p: dict, minutes=minutes, digital=digital):
        h = rng.randrange(1, 13)
        m = rng.choice(minutes)
        if digital:
            ans = f"{_h(h)}:{'٣٠' if m else '٠٠'}"
            others = [f"{_h(x)}:{'٣٠' if m else '٠٠'}" for x in [h % 12 + 1, (h + 10) % 12 + 1]]
            prompt = "أيُّ وقتٍ رقميٍّ يطابق القرص؟"
        else:
            suffix = " والنصف" if m else " تماماً"
            ans = HOUR_NAMES[h - 1] + suffix
            others = [HOUR_NAMES[h % 12] + suffix, HOUR_NAMES[(h + 10) % 12] + suffix]
            prompt = "انظر إلى عقربَي الساعة: كم الساعة؟" if code != "Q2" else "كم الساعة؟ اقرأ القرص واختر."
        opts = [ans] + others
        rng.shuffle(opts)
        return (prompt, ans, {"kind": "clock", "hour": h, "minute": m, "options": opts})


_clock_node("Q2", "قراءة", [0, 30], digital=False)
_clock_node("g1CLK", "dial", [0], digital=False)
_clock_node("g1CLK", "digital", [0], digital=True)
_clock_node("g1HALFH", "dial", [30], digital=False)
_clock_node("g1HALFH", "digital", [30], digital=True)

Q3_COINS = [5, 10, 25, 50, 100]


@register("Q3", "تعرّف")
def q3_identify(rng: random.Random, p: dict):
    coin = rng.choice(Q3_COINS)
    others = rng.sample([c for c in Q3_COINS if c != coin], 2)
    return ("ما قيمة هذه العملة؟ (بالبيسة)", _h(coin),
            {"kind": "money", "mode": "identify", "coin": coin, "options": sorted(others + [coin])})


@register("Q3", "إجمالي")
def q3_total(rng: random.Random, p: dict):
    coins = [rng.choice(Q3_COINS[:4]) for _ in range(rng.choice([2, 2, 3]))]
    return ("اجمع قيمة هذه العملات (بالبيسة).", _h(sum(coins)),
            {"kind": "money", "mode": "total", "coins": coins})


@register("Q4", "مساحة")
def q4_area(rng: random.Random, p: dict):
    r, c = rng.randrange(2, 6), rng.randrange(2, 7)
    return ("كم مربّع وحدةٍ يغطّي هذا المستطيل؟ عُدّ المربّعات.", _h(r * c),
            {"kind": "array", "rows": r, "cols": c, "square": True})


DA4_VALUES = ["١", "٢", "٣", "٤", "٥"]


@register("DA4", "نقاط")
def da4_lineplot(rng: random.Random, p: dict):
    cats = rng.sample(DA4_VALUES, 4)
    cats.sort()
    counts = rng.sample(range(1, 7), 4)
    data = [[c, n] for c, n in zip(cats, counts)]
    if rng.random() < 0.5:
        cat, val = rng.choice(data)
        return (f"في التمثيل بالنقاط: كم عددُ النقاط عند القيمة «{cat}»؟", _h(val),
                {"kind": "chart", "mode": "read", "type": "lineplot", "data": data,
                 "ask": "count", "cat": cat})
    best = max(data, key=lambda d: d[1])[0]
    return ("في التمثيل بالنقاط: أيُّ قيمةٍ لها أكثرُ النقاط؟", best,
            {"kind": "chart", "mode": "read", "type": "lineplot", "data": data, "ask": "most"})


# ---------------- صف١ ----------------

N10_EMOJI = [("🍎", "التفاحات"), ("🐤", "العصافير"), ("⭐", "النجوم"), ("⚽", "الكرات")]
NUM_WORDS = ["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"]


@register("g1N10", "aggregative")
def g1n10_count(rng: random.Random, p: dict):
    n = rng.randrange(2, 10)
    e, label = rng.choice(N10_EMOJI)
    return (f"عُدَّ {label} بالنقر على كلٍّ منها: كم عددها؟", _h(n),
            {"kind": "element-count", "objects": e, "label": label, "n": n})


@register("g1N10", "symbolic")
def g1n10_symbol(rng: random.Random, p: dict):
    n = rng.randrange(0, 11)
    return (f"اكتب رمز العدد: «{NUM_WORDS[n]}»", _h(n), None)


@register("g1N10", "comparative")
def g1n10_compare(rng: random.Random, p: dict):
    a, b = rng.sample(range(1, 11), 2)
    big = rng.random() < 0.5
    ans = (max if big else min)(a, b)
    return (f"اكتب العدد {'الأكبر' if big else 'الأصغر'}: {_h(a)} أم {_h(b)}؟", _h(ans), None)


@register("g1N20", "aggregative")
def g1n20_frame(rng: random.Random, p: dict):
    k = rng.randrange(1, 10)
    return (f"املأ الإطار: أضِف {_h(k)} إلى ١٠.", _h(10 + k),
            {"kind": "ten-frame", "start": 10, "add": k})


seq_node("g1N20", "sequential", lambda r: (lambda s: ([s, s + 1, s + 2], s + 3, "التتابع"))(r.randrange(11, 18)))
seq_node("g1N100", "sequential", lambda r: (lambda s: ([s, s + 1, s + 2], s + 3, "التتابع"))(r.randrange(21, 96)))
seq_node("g1N120", "sequential", lambda r: (lambda s: ([s, s + 1, s + 2], s + 3, "التتابع"))(r.randrange(96, 117)))
seq_node("g1SKIP", "sequential", lambda r: (lambda d: (lambda s: ([s, s + d, s + 2 * d], s + 3 * d, f"العدّ بالقفز {_h(d)}"))(d * r.randrange(1, 3)))(r.choice([2, 5, 10])))


@register("g1N100", "comparative")
def g1n100_compare(rng: random.Random, p: dict):
    a, b = rng.sample(range(21, 99), 2)
    big = rng.random() < 0.5
    ans = (max if big else min)(a, b)
    return (f"اكتب العدد {'الأكبر' if big else 'الأصغر'}: {_h(a)} أم {_h(b)}؟", _h(ans), None)


HUNDRED_WORDS = {100: "مئة", 105: "مئة وخمسة", 110: "مئة وعشرة", 111: "مئة وأحد عشر",
                 115: "مئة وخمسة عشر", 118: "مئة وثمانية عشر", 120: "مئة وعشرون"}


@register("g1N120", "symbolic")
def g1n120_symbol(rng: random.Random, p: dict):
    n, word = rng.choice(list(HUNDRED_WORDS.items()))
    return (f"اكتب رمز العدد: «{word}»", _h(n), None)


@register("g1SKIP", "aggregative")
def g1skip_groups(rng: random.Random, p: dict):
    per = rng.choice([2, 5])
    k = rng.randrange(2, 5)
    label = "أزواج جوارب" if per == 2 else "قطع من فئة ٥ فلوس"
    return (f"عُدّ بالقفز: {_h(k)} {label} في كلٍّ منها {_h(per)} — كم المجموع؟",
            _h(k * per), {"kind": "array", "rows": k, "cols": per})


@register("g1SUB", "aggregative")
def g1sub_blocks(rng: random.Random, p: dict):
    m = rng.randrange(4, 11)
    s = rng.randrange(1, m)
    return (f"خُذ {_h(s)} من {_h(m)} مكعّبات: كم الباقي؟", _h(m - s),
            {"kind": "subtract-blocks", "minuend": m, "subtract": s})


@register("g1SUB", "symbolic")
def g1sub_symbol(rng: random.Random, p: dict):
    m = rng.randrange(3, 11)
    s = rng.choice([0, rng.randrange(1, m + 1)])
    return (f"أكمل: {_h(m)} − {_h(s)} = ؟", _h(m - s), None)


@register("g1SUB", "decompositional")
def g1sub_pw(rng: random.Random, p: dict):
    whole = rng.randrange(5, 11)
    part = rng.randrange(1, whole)
    return (f"الكلُّ {_h(whole)}، وأحد الجزأين {_h(part)} — فما الجزء الآخر؟",
            _h(whole - part), {"kind": "decomposition", "mode": "part-whole",
                               "whole": whole, "part": part})


@register("g1BOND", "aggregative")
def g1bond_frame(rng: random.Random, p: dict):
    target = rng.randrange(5, 11)
    start = rng.randrange(2, target)
    return (f"في الإطار {_h(start)} ملوّنة — املأ حتى يصير المجموع {_h(target)}: كم أضفت؟",
            _h(target - start), {"kind": "ten-frame", "start": start, "ask": "added"})


@register("g1BOND", "decompositional")
def g1bond_complete(rng: random.Random, p: dict):
    whole = rng.randrange(5, 11)
    part = rng.randrange(1, whole)
    return (f"أكمل: {_h(whole)} = {_h(part)} + ؟", _h(whole - part), None)


@register("g1REL", "inverse")
def g1rel_inverse(rng: random.Random, p: dict):
    a, b = rng.randrange(2, 7), rng.randrange(2, 7)
    c = a + b
    return (f"بما أنّ {_h(a)} + {_h(b)} = {_h(c)}، فما ناتج {_h(c)} − {_h(b)}؟", _h(a), None)


@register("g1REL", "family")
def g1rel_family(rng: random.Random, p: dict):
    a, b = rng.randrange(2, 6), rng.randrange(2, 6)
    if a == b:
        b += 1
    c = a + b
    return (f"عائلة الحقائق ({_h(a)}، {_h(b)}، {_h(c)}): {_h(a)} + {_h(b)} = {_h(c)} · "
            f"{_h(b)} + {_h(a)} = {_h(c)} · {_h(c)} − {_h(a)} = {_h(b)} · {_h(c)} − {_h(b)} = ؟",
            _h(a), None)


@register("g1REL", "missing")
def g1rel_missing(rng: random.Random, p: dict):
    c = rng.randrange(6, 11)
    a = rng.randrange(2, c - 1)
    first = rng.random() < 0.5
    if first:
        return (f"أوجد الحدّ المفقود: ؟ + {_h(a)} = {_h(c)}", _h(c - a), None)
    return (f"أوجد الحدّ المفقود: {_h(a)} + ؟ = {_h(c)}", _h(c - a), None)


# strategy nodes — each family keeps its ACT, sampled
@register("g1ADDSTR", "counting")
def g1addstr_count(rng: random.Random, p: dict):
    a = rng.randrange(7, 15)
    b = rng.randrange(2, 5)
    if rng.random() < 0.5:
        return (f"على الخطّ: ابدأ من {_h(a)} وعُدّ {_h(b)} للأمام.", _h(a + b),
                {"kind": "number-line", "min": 0, "max": 20, "start": a, "jump": b})
    return (f"ابدأ من الأكبر وعُدّ تصاعدياً: {_h(a)} + {_h(b)} = ؟ ({_h(a+1)}، {_h(a+2)}، ...)",
            _h(a + b), None)


@register("g1ADDSTR", "bridging")
def g1addstr_bridge(rng: random.Random, p: dict):
    a = rng.randrange(6, 10)
    b = rng.randrange(11 - a, 10)
    if rng.random() < 0.5:
        return (f"جسرُ العشرة: أكمل {_h(a)} إلى عشرة ثم زد الباقي — {_h(a)} + {_h(b)} = ؟ (مثِّل على الإطار)",
                _h(a + b), {"kind": "ten-frame", "start": a, "add": b})
    rest = a + b - 10
    return (f"فكِّك لتعبر العشرة: {_h(a)} + {_h(b)} = {_h(a)} + {_h(10-a)} + {_h(rest)} = ١٠ + {_h(rest)} = ؟",
            _h(a + b), None)


@register("g1ADDSTR", "derived")
def g1addstr_derived(rng: random.Random, p: dict):
    n = rng.randrange(4, 10)
    if rng.random() < 0.5:
        return (f"الشفع: {_h(n)} + {_h(n)} = ؟", _h(2 * n), None)
    return (f"بما أنّ {_h(n)} + {_h(n)} = {_h(2*n)}، فما {_h(n)} + {_h(n+1)}؟", _h(2 * n + 1), None)


@register("g1ADDSTR", "property")
def g1addstr_property(rng: random.Random, p: dict):
    a, b = rng.sample(range(2, 10), 2)
    if rng.random() < 0.5:
        return (f"إن كان {_h(a)} + {_h(b)} = {_h(a+b)}، فما {_h(b)} + {_h(a)}؟", _h(a + b), None)
    c = 10 - a
    d = rng.randrange(2, 10)
    return (f"أعد الترتيب لتسهّل: {_h(a)} + {_h(d)} + {_h(c)} = ({_h(a)} + {_h(c)}) + {_h(d)} = ؟",
            _h(10 + d), None)


@register("g1SUBSTR", "counting")
def g1substr_count(rng: random.Random, p: dict):
    m = rng.randrange(9, 18)
    s = rng.randrange(2, 4)
    if rng.random() < 0.5:
        return (f"على الخطّ: ابدأ من {_h(m)} وعُدّ {_h(s)} للخلف.", _h(m - s),
                {"kind": "number-line", "min": 0, "max": 20, "start": m, "jump": s, "back": True})
    return (f"عُدّ تنازلياً: {_h(m)} − {_h(s)} = ؟ ({_h(m-1)}، {_h(m-2)}، ...)", _h(m - s), None)


@register("g1SUBSTR", "bridging")
def g1substr_bridge(rng: random.Random, p: dict):
    m = rng.randrange(11, 16)
    s = rng.randrange(m % 10 + 1, 10)
    return (f"الإنقاصُ من العشرة: آحادك لا تكفي — افتح العشرة لتطرح. {_h(m)} − {_h(s)} = ؟",
            _h(m - s), {"kind": "subtract-blocks", "minuend": m, "subtract": s})


@register("g1SUBSTR", "derived")
def g1substr_derived(rng: random.Random, p: dict):
    n = rng.randrange(5, 10)
    return (f"بما أنّ {_h(n)} + {_h(n)} = {_h(2*n)}، فما {_h(2*n)} − {_h(n)}؟", _h(n), None)


@register("g1SUBSTR", "inverse")
def g1substr_inverse(rng: random.Random, p: dict):
    m = rng.randrange(7, 16)
    s = rng.randrange(3, min(m - 1, 10))
    return (f"اطرح بالتفكير جمعاً: {_h(m)} − {_h(s)} = ؟ (فكّر: {_h(s)} + ؟ = {_h(m)})",
            _h(m - s), None)


build_node("g1PV", "aggregative", 21, 99, "ابنِ العدد {n} بالقضبان والمكعّبات.")


@register("g1PV", "decompositional")
def g1pv_tens(rng: random.Random, p: dict):
    n = rng.randrange(21, 99)
    if n % 10 == 0:
        n += 1
    return (f"{_h(n)} = ؟ عشرات و{_h(n % 10)} آحاد — كم العشرات؟", _h(n // 10), None)


@register("g1TENS", "aggregative")
def g1tens_blocks(rng: random.Random, p: dict):
    a = rng.randrange(1, 6) * 10
    b = rng.randrange(1, min(5, (100 - a) // 10) + 1) * 10
    return (f"بالقضبان: {_h(a)} + {_h(b)} = ؟", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b})


@register("g1TENS", "decompositional")
def g1tens_units(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        a, b = rng.randrange(1, 6), rng.randrange(1, 5)
        return (f"{_h(a)} عشرات + {_h(b)} عشرات = ؟ (اكتب العدد)", _h((a + b) * 10), None)
    a = rng.randrange(3, 10)
    b = rng.randrange(1, a)
    return (f"{_h(a)} عشرات − {_h(b)} عشرات = ؟ (اكتب العدد)", _h((a - b) * 10), None)


@register("g1DIG2", "aggregative")
def g1dig2_blocks(rng: random.Random, p: dict):
    a = rng.randrange(21, 76)
    b_o = rng.randrange(1, 10 - a % 10) if a % 10 < 9 else 1
    b = rng.choice([0, 10, 20]) + b_o
    if a % 10 + b % 10 > 9 or a + b > 99:
        return g1dig2_blocks(rng, p)
    return (f"ابدأ بـ{_h(a)}، أضِف {_h(b)} بالقضبان.", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b})


@register("g1DIG2", "decompositional")
def g1dig2_place(rng: random.Random, p: dict):
    a = rng.randrange(21, 76)
    b_o = rng.randrange(1, 10 - a % 10) if a % 10 < 9 else 1
    b = rng.choice([0, 10, 20]) + b_o
    if a % 10 + b % 10 > 9 or a + b > 99:
        return g1dig2_place(rng, p)
    return (f"اجمع بالخانات: {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


def _regr_pair(rng):
    # the SOURCE-RANGE law (UAE u6-L5): real carry, small addend, sum ≤ 35
    while True:
        a = rng.randrange(5, 20)
        b = rng.randrange(3, 14)
        if (a % 10) + (b % 10) >= 10 and min(a, b) <= 13 and a + b <= 35:
            return a, b


@register("g1REGR", "aggregative")
def g1regr_blocks(rng: random.Random, p: dict):
    a, b = _regr_pair(rng)
    return (f"ابدأ بـ{_h(a)}، أضِف {_h(b)} بالقضبان.", _h(a + b),
            {"kind": "base-ten-blocks", "start": a, "add": b, "carry": True})


@register("g1REGR", "decompositional")
def g1regr_place(rng: random.Random, p: dict):
    a, b = _regr_pair(rng)
    return (f"اجمع بالخانات (بحمل): {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


ORD_SHAPES = ["circle", "square", "triangle", "rectangle"]
ORD_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"]
LETTERS4 = ["أ", "ب", "ج", "د"]


@register("g1ORDINAL", "identify")
def g1ord_identify(rng: random.Random, p: dict):
    count = rng.choice([3, 4])
    pos = rng.randrange(count)
    row = rng.sample(ORD_SHAPES, count)
    opts = [{"v": LETTERS4[i], "shape": row[i]} for i in range(count)]
    return (f"في الصفّ: انقر الشكل {ORD_NAMES[pos]}.", LETTERS4[pos],
            {"kind": "shape-pick", "options": opts})


ORD_STORY = [("في الطابور: سالم يقف بعد {n} مباشرةً — ما ترتيبه؟ اكتب الرقم.", 1),
             ("في الطابور: نورة تقف قبل {n} مباشرةً — ما ترتيبها؟ اكتب الرقم.", -1)]
ORD_WORD = {1: "الأول", 2: "الثاني", 3: "الثالث", 4: "الرابع", 5: "الخامس"}


@register("g1ORDINAL", "name")
def g1ord_name(rng: random.Random, p: dict):
    tpl, d = rng.choice(ORD_STORY)
    base = rng.randrange(2, 5)
    return (tpl.format(n=ORD_WORD[base]), _h(base + d), None)


# g1SHP2 — recognize / elements / compose (the G6-pattern fix for compose)
SHP2 = [("circle", "دائرة"), ("square", "مربع"), ("rectangle", "مستطيل"), ("triangle", "مثلث")]
SHP2_N = {"square": 4, "rectangle": 4, "triangle": 3}
SHP2_VALID = {("مثلثين متطابقين", "مربعاً"), ("مربعين متطابقين", "مستطيلاً"),
              ("٤ مربعات صغيرة", "مربعاً أكبر"), ("مثلثين", "مستطيلاً")}
SHP2_INVALID = {("دائرتين", "مربعاً"), ("دائرتين", "مستطيلاً"), ("دائرة ومثلث", "مربعاً")}


@register("g1SHP2", "recognize")
def g1shp2_recognize(rng: random.Random, p: dict):
    target = rng.choice(SHP2)
    others = rng.sample([s for s in SHP2 if s != target], 2)
    opts = [{"v": n, "shape": k} for k, n in [target] + others]
    rng.shuffle(opts)
    return ("ما اسم هذا الشكل؟ انقر الإجابة.", target[1],
            {"kind": "shape-pick", "show": target[0], "options": opts})


@register("g1SHP2", "elements")
def g1shp2_elements(rng: random.Random, p: dict):
    key, n = rng.choice(list(SHP2_N.items()))
    element = rng.choice(["sides", "vertices"])
    word = "ضلعاً" if element == "sides" else "رأساً"
    pl = "أضلاع" if element == "sides" else "رؤوس"
    return (f"انقر {pl} الشكل لتعدّها. كم {word}؟", _h(n),
            {"kind": "element-count", "shape": key, "element": element, "n": n})


@register("g1SHP2", "compose")
def g1shp2_compose(rng: random.Random, p: dict):
    # the owner-approved G6 pattern: a composition DECISION, not a free drag
    if rng.random() < 0.5:
        pieces, target = rng.choice(sorted(SHP2_VALID))
        ans = "نعم"
    else:
        pieces, target = rng.choice(sorted(SHP2_INVALID))
        ans = "لا"
    return (f"أيمكن تركيب {target} من {pieces}؟", ans,
            _pick2(rng, ans, "لا" if ans == "نعم" else "نعم"))


# measurement: compare-pairs banks (bigger drawn bigger) + unit measuring
LEN_PAIRS = [("القلم", "المسطرة"), ("الخيط", "الحبل"), ("العود", "العصا")]
CAP_PAIRS = [("الكوب", "الإبريق"), ("الفنجان", "القارورة"), ("الملعقة", "الوعاء")]


def _compare_node(code, pairs, ask_big, ask_small, dims):
    @register(code, "compare")
    def gen(rng: random.Random, p: dict, pairs=pairs):
        small, big = rng.choice(pairs)
        want_big = rng.random() < 0.5
        ans = big if want_big else small
        (sw, sh), (bw, bh) = dims(rng)
        items = [{"v": small, "w": sw, "h": sh}, {"v": big, "w": bw, "h": bh}]
        rng.shuffle(items)
        return (f"انقر {ask_big if want_big else ask_small}.", ans,
                {"kind": "measure", "mode": "compare", "items": items})


_compare_node("g1LEN", LEN_PAIRS, "الأطول", "الأقصر",
              lambda r: ((r.randrange(70, 120), 16), (r.randrange(160, 220), 16)))
_compare_node("g1CAP", CAP_PAIRS, "الأكثر سعةً", "الأقلّ سعةً",
              lambda r: ((r.randrange(30, 45), r.randrange(35, 55)), (r.randrange(50, 70), r.randrange(100, 140))))


@register("g1LEN", "measure")
def g1len_measure(rng: random.Random, p: dict):
    n = rng.randrange(2, 9)
    return (f"قِس الجسم: كم مشبكاً يبلغ طوله؟", _h(n),
            {"kind": "measure", "mode": "ruler", "length": n, "max": n + 2, "unit": "مشبك"})


@register("g1CAP", "measure")
def g1cap_measure(rng: random.Random, p: dict):
    n = rng.randrange(2, 7)
    return ("املأ الإناء بالأكواب: كم كوباً يملؤه؟", _h(n), {"kind": "measure", "cups": n})


MASS_PAIRS = [(("التفاحة", "🍎"), ("البطيخة", "🍉")), (("البالون", "🎈"), ("الكتاب", "📚")),
              (("الريشة", "🪶"), ("الحجر", "🪨"))]


@register("g1MASS", "compare")
def g1mass_compare(rng: random.Random, p: dict):
    light, heavy = rng.choice(MASS_PAIRS)
    heavier_left = rng.random() < 0.5
    left, right = (heavy, light) if heavier_left else (light, heavy)
    return ("انظر إلى ميل الميزان: انقر الأثقل.", heavy[0],
            {"kind": "measure", "mode": "heavier",
             "left": {"v": left[0], "e": left[1]}, "right": {"v": right[0], "e": right[1]},
             "heavier": "left" if heavier_left else "right"})


@register("g1MASS", "measure")
def g1mass_measure(rng: random.Random, p: dict):
    n = rng.randrange(2, 8)
    return ("زِنِ الجسم: أضف مكعّبات حتى يتّزن الميزان — كم مكعّباً؟", _h(n),
            {"kind": "measure", "mode": "balance", "mass": n, "unit": "مكعب", "unitOne": "مكعباً"})


AREA_PAIRS = [("المنديل", "السجادة"), ("النافذة", "الباب"), ("الطابع", "الظرف")]


@register("g1AREA", "coverage")
def g1area_coverage(rng: random.Random, p: dict):
    small, big = rng.choice(AREA_PAIRS)
    items = [{"v": small, "w": rng.randrange(40, 70), "h": rng.randrange(35, 60)},
             {"v": big, "w": rng.randrange(120, 170), "h": rng.randrange(80, 170)}]
    rng.shuffle(items)
    return ("انقر ما يغطّي مساحةً أكبر.", big,
            {"kind": "measure", "mode": "compare", "items": items})


# position / classification / data (G1)
POS_SCENES = [("🌳", "الشجرة"), ("🪑", "الكرسي"), ("📦", "الصندوق")]
POS_OBJECTS = [("العصفور", "🐦"), ("القطة", "🐱"), ("الكرة", "⚽"), ("الأرنب", "🐰"), ("القبعة", "🎩")]
POS_AXIS = [("above", "فوق"), ("below", "تحت")]
POS_TOPO = [("inside", "داخل"), ("outside", "خارج")]


def _pos_node(family, rels):
    @register("g1POS", family)
    def gen(rng: random.Random, p: dict, rels=rels):
        anchor_e, anchor_n = rng.choice(POS_SCENES)
        (o1, e1), (o2, e2) = rng.sample(POS_OBJECTS, 2)
        a_rel, b_rel = rels                       # o1 at the first relation, o2 opposite
        ask_first = rng.random() < 0.5            # asking BOTH sides (the R2 guard)
        ans = o1 if ask_first else o2
        ask_word = a_rel[1] if ask_first else b_rel[1]
        return (f"انقر ما هو {ask_word} {anchor_n}.", ans,
                {"kind": "position-scene", "anchor": anchor_e,
                 "objects": [{"v": o1, "e": e1, "pos": a_rel[0]},
                             {"v": o2, "e": e2, "pos": b_rel[0]}]})


_pos_node("axis", POS_AXIS)
_pos_node("topology", POS_TOPO)

CLS_BANKS = [("أحمر", "أزرق", [("🍎", 0), ("🍓", 0), ("🔵", 1), ("💙", 1)]),
             ("حيوانات", "فواكه", [("🐱", 0), ("🐰", 0), ("🍌", 1), ("🍎", 1)])]
CLS_RULES = [("🍎 🍓 🌹", "كلّها حمراء", "كلّها طعام"), ("🐦 🦋 ✈️", "كلّها تطير", "كلّها حيوانات"),
             ("⚽ 🔵 🌑", "كلّها مستديرة", "كلّها زرقاء"), ("🍌 🌟 🌙", "كلّها صفراء", "كلّها فواكه")]


@register("g1CLS", "sorting")
def g1cls_sort(rng: random.Random, p: dict):
    b1, b2, items = rng.choice(CLS_BANKS)
    items = list(items)
    rng.shuffle(items)
    return (f"افرز العناصر في السلّتين: {b1} / {b2}.", "نعم",
            {"kind": "sort-bins", "bins": [b1, b2],
             "items": [{"e": e, "bin": b} for e, b in items]})


@register("g1CLS", "rule")
def g1cls_rule(rng: random.Random, p: dict):
    group, good, bad = rng.choice(CLS_RULES)
    return (f"المجموعة: {group} — ما قاعدتها؟", good, _pick2(rng, good, bad))


DATA_CATS = [("تفاح", "موز", "عنب"), ("قطط", "عصافير", "أسماك")]


@register("g1DATA", "organize")
def g1data_organize(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        b1, b2, items = rng.choice(CLS_BANKS)
        items = list(items)
        rng.shuffle(items)
        return (f"نظِّم البيانات: افرز العناصر في فئتَي «{b1}/{b2}».", "نعم",
                {"kind": "sort-bins", "bins": [b1, b2],
                 "items": [{"e": e, "bin": b} for e, b in items]})
    t = rng.randrange(3, 10)
    return (f"عُدَّ العناصر وسجِّل بعلامات العدّ: {_h(t)}.", _h(t),
            {"kind": "chart", "mode": "build", "type": "tally", "target": t})


@register("g1DATA", "read")
def g1data_read(rng: random.Random, p: dict):
    cats = rng.choice(DATA_CATS)
    vals = rng.sample(range(2, 9), 3)
    data = [[c, v] for c, v in zip(cats, vals)]
    cat, val = rng.choice(data)
    return (f"من الجدول: كم عدد فئة «{cat}»؟", _h(val),
            {"kind": "chart", "mode": "read", "type": "pictograph", "data": data,
             "ask": "count", "cat": cat})


@register("g1PICT", "read")
def g1pict_read(rng: random.Random, p: dict):
    cats = rng.choice(DATA_CATS)
    vals = rng.sample(range(2, 9), 3)
    data = [[c, v] for c, v in zip(cats, vals)]
    if rng.random() < 0.5:
        cat, val = rng.choice(data)
        return (f"في مخطّط الصور: كم عدد فئة «{cat}»؟", _h(val),
                {"kind": "chart", "mode": "read", "type": "pictograph", "data": data,
                 "ask": "count", "cat": cat})
    best = max(data, key=lambda d: d[1])[0]
    return ("في مخطّط الصور: أيُّ فئةٍ هي الأكثر؟", best,
            {"kind": "chart", "mode": "read", "type": "pictograph", "data": data, "ask": "most"})


@register("g1PICT", "build")
def g1pict_build(rng: random.Random, p: dict):
    cat = rng.choice(["التفاحات", "العصافير", "الكرات"])
    t = rng.randrange(3, 9)
    return (f"ابنِ التمثيل: {cat} = {_h(t)}.", _h(t),
            {"kind": "chart", "mode": "build", "type": "tally", "target": t})


# ---------------- صف٣ (المولّدات الذاتية — رفع مباشر) ----------------

PLACE_NAMES = [("آحاد", 1), ("عشرات", 10), ("مئات", 100), ("آلاف", 1000),
               ("عشرات ألوف", 10000), ("مئات ألوف", 100000)]
PLACE_OF = {1: "الآحاد", 10: "العشرات", 100: "المئات", 1000: "الآلاف",
            10000: "عشرات الألوف", 100000: "مئات الألوف"}


def _compose_prompt(n, top):
    parts = []
    for name, v in reversed(PLACE_NAMES[:top]):
        d = (n // v) % 10
        if d:
            parts.append(f"{_h(d)} {name}")
    return "كوِّن العدد: " + " و".join(parts) + "."


def _pv_node(code, lo, hi, top, with_pattern=False):
    @register(code, "compose")
    def compose(rng: random.Random, p: dict):
        n = rng.randrange(lo, hi)
        if n % 10 == 0:
            n += rng.randrange(1, 9)
        return (_compose_prompt(n, top), _h(n), None)

    @register(code, "place")
    def place(rng: random.Random, p: dict):
        n = rng.randrange(lo, hi)
        digits = [(i, int(d)) for i, d in enumerate(str(n)[::-1]) if d != "0"]
        i, d = rng.choice(digits)
        # repeated digits would make the question ambiguous — resample
        if str(n).count(str(d)) > 1:
            return place(rng, p)
        return (f"ما قيمة الرقم {_h(d)} في العدد {_h(n)}؟", _h(d * 10 ** i), None)

    if with_pattern:
        @register(code, "pattern")
        def pattern(rng: random.Random, p: dict):
            step = rng.choice([100, 1000])
            s = rng.randrange(lo, hi - 3 * step)
            seq = [s, s + step, s + 2 * step]
            return ("أكمل النمط: " + "، ".join(_h(x) for x in seq) + "، ؟",
                    _h(s + 3 * step), None)


_pv_node("g3PV", 1002, 9900, 4, with_pattern=True)
_pv_node("g3PV5", 10002, 99000, 5)
_pv_node("g3BIG", 100002, 999000, 6)


def _round_node(code, refs, lo, hi, labels):
    @register(code, "rounding")
    def direct(rng: random.Random, p: dict):
        ref = rng.choice(refs)
        n = rng.randrange(lo, hi)
        if n % ref == 0:
            n += rng.randrange(1, min(ref, 9))
        ans = (n + ref // 2) // ref * ref
        vis = ({"kind": "number-line", "min": 0, "max": hi, "step": ref, "target": n}
               if rng.random() < 0.5 else None)
        return (f"قرِّب {_h(n)} إلى أقرب {labels[ref]}.", _h(ans), vis)

    @register(code, "inverse")
    def inverse(rng: random.Random, p: dict):
        ref = rng.choice(refs)
        target = rng.randrange(max(2, lo // ref + 1), hi // ref - 1) * ref
        good = target + rng.choice([-1, 1]) * rng.randrange(1, ref // 2)
        bad1 = target + ref // 2 + rng.randrange(0, ref // 3)
        bad2 = target - ref // 2 - rng.randrange(1, ref // 3 + 1)  # 5-and-up rounds UP: stay below half
        opts = [_h(good), _h(bad1), _h(bad2)]
        rng.shuffle(opts)
        return (f"أيُّ الأعداد يؤول إلى {_h(target)} عند تقريبه إلى أقرب {labels[ref]}؟",
                _h(good), {"kind": "shape-pick", "options": [{"v": o} for o in opts]})


_round_node("g3ROUND", [10, 100], 30, 990, {10: "عشرة", 100: "مئة"})
_round_node("g3ROUND4", [1000], 1100, 9400, {1000: "ألف"})


def _add3_pair(rng, lo, hi, sub=False):
    while True:
        a, b = rng.randrange(lo, hi), rng.randrange(lo, hi)
        if sub and a > b + 50 and (a % 10) < (b % 10):
            return a, b
        if not sub and (a % 10) + (b % 10) >= 10 and a + b < hi * 2 and a + b <= 999:
            return a, b


@register("g3ADD3", "algorithm")
def g3add3_algo(rng: random.Random, p: dict):
    sub = rng.random() < 0.5
    a, b = _add3_pair(rng, 125, 800, sub)
    if sub:
        return (f"اطرح عمودياً (بإعادة التجميع): {_h(a)} − {_h(b)} = ؟", _h(a - b), None)
    return (f"اجمع عمودياً (بإعادة التجميع): {_h(a)} + {_h(b)} = ؟", _h(a + b), None)


@register("g3ADD3", "partial")
def g3add3_partial(rng: random.Random, p: dict):
    a, b = _add3_pair(rng, 125, 490)
    return (f"اجمع بالخانات (نواتج جزئية): {_h(a)} + {_h(b)}", _h(a + b),
            {"kind": "decomposition", "mode": "place-add", "a": a, "b": b})


@register("g3ADD3", "multi")
def g3add3_multi(rng: random.Random, p: dict):
    while True:
        nums = [rng.randrange(105, 350) for _ in range(3)]
        if sum(nums) <= 999:
            break
    return ("اجمع الأعداد الثلاثة: " + " + ".join(_h(n) for n in nums) + " = ؟",
            _h(sum(nums)), None)


@register("g3OPS4", "algorithm")
def g3ops4_algo(rng: random.Random, p: dict):
    sub = rng.random() < 0.5
    if sub:
        m = rng.randrange(2100, 9800)
        s = rng.randrange(1050, m - 100)
        if (m % 10) >= (s % 10):
            s = s // 10 * 10 + min(9, m % 10 + 1)
        if s >= m:
            return g3ops4_algo(rng, p)
        return (f"اطرح عمودياً (بإعادة التجميع): {_h(m)} − {_h(s)} = ؟", _h(m - s), None)
    a = rng.randrange(1050, 4900)
    b = rng.randrange(1050, 4900)
    if (a % 10) + (b % 10) < 10:
        b = b // 10 * 10 + (10 - a % 10) + rng.randrange(0, min(9 - (10 - a % 10), 5) + 1) if a % 10 else b + 5
    if a + b > 9999 or (a % 10) + (b % 10) < 10:
        return g3ops4_algo(rng, p)
    return (f"اجمع عمودياً (بإعادة التجميع): {_h(a)} + {_h(b)} = ؟", _h(a + b), None)


@register("g3OPS4", "partial")
def g3ops4_partial(rng: random.Random, p: dict):
    a = rng.randrange(1111, 4800)
    b = rng.randrange(1111, 4800)
    if a + b > 9999:
        return g3ops4_partial(rng, p)
    pa = " + ".join(f"({_h(a // v % 10 * v)}+{_h(b // v % 10 * v)})" for v in (1000, 100, 10, 1))
    return (f"حلّل ثم اجمع: {_h(a)} + {_h(b)} = {pa} = ؟", _h(a + b), None)


@register("g3PROPS", "property")
def g3props_property(rng: random.Random, p: dict):
    if rng.random() < 0.4:
        a, b = rng.randrange(12, 90), rng.randrange(12, 90)
        return (f"بخاصية الإبدال (الترتيب): {_h(a)} + {_h(b)} = {_h(b)} + ؟", _h(a), None)
    if rng.random() < 0.7:
        a, b, c = rng.randrange(11, 30), rng.randrange(11, 30), rng.randrange(11, 30)
        return (f"بخاصية التجميع: ({_h(a)} + {_h(b)}) + {_h(c)} = {_h(a)} + ({_h(b)} + ؟)",
                _h(c), None)
    a = rng.randrange(11, 99)
    return (f"العنصر المحايد: {_h(a)} + ؟ = {_h(a)}", "٠", None)


@register("g3PROPS", "mental")
def g3props_mental(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        n = rng.randrange(11, 95)
        if n % 10 == 0:
            n += 3
        return (f"متمِّم المئة: {_h(n)} + ؟ = ١٠٠", _h(100 - n), None)
    n = rng.randrange(105, 195)
    return (f"ذهنياً بمتمّمات المئة: ٢٠٠ − {_h(n)} = ؟", _h(200 - n), None)


@register("g3PROPS", "relation")
def g3props_relation(rng: random.Random, p: dict):
    if rng.random() < 0.5:
        a, b = rng.randrange(15, 60), rng.randrange(15, 40)
        return (f"إذا كان {_h(a)} + {_h(b)} = {_h(a+b)} فإنَّ {_h(a+b)} − {_h(b)} = ؟",
                _h(a), None)
    b, c = rng.randrange(15, 50), rng.randrange(20, 60)
    return (f"المعادلة الناقصة: ؟ − {_h(b)} = {_h(c)}", _h(b + c), None)


@register("g3MUL", "repeated")
def g3mul_repeated(rng: random.Random, p: dict):
    k, n = rng.randrange(2, 7), rng.randrange(2, 9)
    if rng.random() < 0.5:
        return (f"كوِّن {_h(k)} مجموعاتٍ في كلٍّ منها {_h(n)} — كم الإجمالي؟", _h(k * n),
                {"kind": "groups", "mode": "form", "groups": k, "per": n})
    return (f"اكتبها جمعاً متكرراً ثم احسب: {_h(k)} × {_h(n)} = "
            + " + ".join([_h(n)] * k) + " = ؟", _h(k * n), None)


@register("g3MUL", "array")
def g3mul_array(rng: random.Random, p: dict):
    r, c = rng.randrange(2, 6), rng.randrange(2, 9)
    if rng.random() < 0.5:
        return (f"صُفَّ مصفوفة: {_h(r)} صفوف × {_h(c)} أعمدة — كم الإجمالي؟", _h(r * c),
                {"kind": "array", "rows": r, "cols": c})
    return (f"بالإبدال (اقلب المصفوفة): إذا كان {_h(c)} × {_h(r)} = {_h(r*c)} فكم {_h(r)} × {_h(c)}؟",
            _h(r * c), None)


MUL_STORIES = [("{k} أطباقٍ في كلِّ طبقٍ {n} تمرات", "أطباق"),
               ("{k} سلالٍ في كلِّ سلةٍ {n} تفاحات", "سلال"),
               ("{k} علبٍ في كلِّ علبةٍ {n} أقلام", "علب")]


@register("g3MUL", "modeling")
def g3mul_modeling(rng: random.Random, p: dict):
    k, n = rng.randrange(3, 8), rng.randrange(3, 8)
    tpl, _ = rng.choice(MUL_STORIES)
    story = tpl.format(k=_h(k), n=_h(n))
    good = f"{_h(k)} × {_h(n)}"
    bad = f"{_h(k)} + {_h(n)}"
    return (f"أيُّ جملةٍ تمثِّل: «{story}»؟", good, _pick2(rng, good, bad))


@register("g3MULF1", "skip")
def g3mulf1_skip(rng: random.Random, p: dict):
    f = rng.choice([2, 5, 10])
    k = rng.randrange(2, 10)
    hint = {2: "بقفز الاثنين", 5: "بنمط الخمسة (٥، ١٠، ١٥، ...)", 10: "بنمط العشرة"}[f]
    return (f"{hint}: {_h(k)} × {_h(f)} = ؟", _h(k * f), None)


@register("g3MULF1", "zero-one")
def g3mulf1_zeroone(rng: random.Random, p: dict):
    n = rng.randrange(2, 10)
    if rng.random() < 0.5:
        return (f"{_h(n)} × ١ = ؟", _h(n), None)
    return (f"٠ × {_h(n)} = ؟", "٠", None)


@register("g3MULF1", "nine")
def g3mulf1_nine(rng: random.Random, p: dict):
    k = rng.randrange(2, 10)
    if rng.random() < 0.5:
        return (f"نمط التسعة: ٩ × {_h(k)} = (١٠ × {_h(k)}) − {_h(k)} = ؟", _h(9 * k), None)
    return (f"٩ × {_h(k)} = ؟ (لاحظ: رقما الناتج يجمعان إلى ٩)", _h(9 * k), None)


@register("g3MULF2", "distribute")
def g3mulf2_distribute(rng: random.Random, p: dict):
    a = rng.randrange(3, 10)
    b = rng.choice([6, 7, 8])
    s1 = 5
    s2 = b - 5
    return (f"اشتق بالتوزيع: {_h(a)} × {_h(b)} = ({_h(a)} × {_h(s1)}) + ({_h(a)} × {_h(s2)}) = ؟",
            _h(a * b), None)


@register("g3MULF2", "double")
def g3mulf2_double(rng: random.Random, p: dict):
    a = rng.randrange(3, 10)
    b = rng.choice([4, 6, 8])
    return (f"الضعف المضاعف: {_h(a)} × {_h(b)} = ضِعف ({_h(a)} × {_h(b // 2)}) = ؟",
            _h(a * b), None)


@register("g3MULF2", "associate")
def g3mulf2_associate(rng: random.Random, p: dict):
    a, b, c = rng.randrange(2, 5), rng.randrange(2, 5), rng.randrange(2, 6)
    if a * b * c > 100:
        return g3mulf2_associate(rng, p)
    return (f"بالتجميع: ({_h(a)} × {_h(b)}) × {_h(c)} = {_h(a)} × ({_h(b)} × {_h(c)}) = ؟",
            _h(a * b * c), None)


@register("g3MULF2", "pattern")
def g3mulf2_pattern(rng: random.Random, p: dict):
    f = rng.choice([3, 4, 6, 7, 8])
    k = rng.randrange(1, 5)
    seq = [f * k, f * (k + 1), f * (k + 2)]
    return (f"في جدول الضرب، صفُّ {_h(f)}: " + "، ".join(_h(x) for x in seq) + "، ؟",
            _h(f * (k + 3)), None)


@register("g3F12", "eleven")
def g3f12_eleven(rng: random.Random, p: dict):
    k = rng.randrange(2, 10)
    return (f"نمط الأحد عشر (الرقم يتكرر): {_h(k)} × ١١ = ؟", _h(11 * k), None)


@register("g3F12", "distribute")
def g3f12_distribute(rng: random.Random, p: dict):
    k = rng.randrange(3, 13)
    return (f"بالتوزيع: {_h(k)} × ١٢ = ({_h(k)} × ١٠) + ({_h(k)} × ٢) = ؟", _h(12 * k), None)


OM_TABLES = [3, 4, 5, 6, 9, 10]


@register("g3FACTOM", "dual")
def g3factom_dual(rng: random.Random, p: dict):
    f = rng.choice(OM_TABLES)
    k = rng.randrange(2, 11)
    if rng.random() < 0.5:
        return (f"{_h(f)} × {_h(k)} = {_h(f*k)} — فما {_h(f*k)} ÷ {_h(f)}؟", _h(k), None)
    return (f"من جدول {'الـ' + _h(f)}: {_h(f*k)} ÷ {_h(f)} = ؟", _h(k), None)


@register("g3FACTOM", "open-array")
def g3factom_open(rng: random.Random, p: dict):
    t = rng.randrange(11, 20)
    f = rng.choice([3, 4, 5, 6])
    if t * f > 120:
        return g3factom_open(rng, p)
    ones = t - 10
    return (f"المصفوفة المفتوحة: {_h(t)} × {_h(f)} = (١٠ × {_h(f)}) + ({_h(ones)} × {_h(f)}) = ؟",
            _h(t * f), None)


@register("g3FACTOM", "missing")
def g3factom_missing(rng: random.Random, p: dict):
    f = rng.choice(OM_TABLES)
    k = rng.randrange(2, 11)
    if rng.random() < 0.5:
        return (f"؟ × {_h(f)} = {_h(f*k)} — ما العدد؟", _h(k), None)
    return (f"ما العدد الذي إذا ضُرِب في {_h(f)} كان الناتج {_h(f*k)}؟", _h(k), None)


@register("g3DIV", "share")
def g3div_share(rng: random.Random, p: dict):
    g = rng.randrange(2, 7)
    per = rng.randrange(3, 10)
    total = g * per
    return (f"وزِّع {_h(total)} بالتساوي على {_h(g)} مجموعات — كم في كلِّ مجموعة؟",
            _h(per), {"kind": "groups", "mode": "share", "total": total, "groups": g})


@register("g3DIV", "measure")
def g3div_measure(rng: random.Random, p: dict):
    per = rng.randrange(3, 9)
    k = rng.randrange(3, 9)
    total = per * k
    return (f"كم مجموعةً من {_h(per)} في {_h(total)}؟ (اطرح {_h(per)} متكرِّراً وعُدَّ المجموعات)",
            _h(k), {"kind": "groups", "mode": "measure", "total": total, "per": per})


@register("g3DIV", "inverse")
def g3div_inverse(rng: random.Random, p: dict):
    a, b = rng.randrange(3, 10), rng.randrange(3, 10)
    return (f"إذا كان {_h(a)} × {_h(b)} = {_h(a*b)} فإنَّ {_h(a*b)} ÷ {_h(a)} = ؟", _h(b), None)


@register("g3DIVF", "think-mul")
def g3divf_think(rng: random.Random, p: dict):
    f = rng.randrange(2, 10)
    k = rng.randrange(3, 10)
    return (f"{_h(f*k)} ÷ {_h(f)} = ؟ (فكِّر: {_h(f)} × ؟ = {_h(f*k)})", _h(k), None)


@register("g3DIVF", "family")
def g3divf_family(rng: random.Random, p: dict):
    a, b = rng.randrange(3, 10), rng.randrange(3, 10)
    if a == b:
        b += 1
    prod = a * b
    if rng.random() < 0.5:
        good = f"{_h(prod)} ÷ {_h(b)} = {_h(a)}"
        bad = f"{_h(prod)} − {_h(b)} = {_h(prod - b)}"
        return (f"أكمل الحقيقة الرابعة في العائلة: {_h(a)}×{_h(b)}={_h(prod)}، "
                f"{_h(b)}×{_h(a)}={_h(prod)}، {_h(prod)}÷{_h(a)}={_h(b)}، ؟",
                good, _pick2(rng, good, bad))
    return (f"العدد الناقص في جدول الضرب: {_h(a)} × ؟ = {_h(prod)}", _h(b), None)


@register("g3DIVF", "rules")
def g3divf_rules(rng: random.Random, p: dict):
    n = rng.randrange(2, 10)
    form = rng.randrange(3)
    if form == 0:
        return (f"{_h(n)} ÷ ١ = ؟", _h(n), None)
    if form == 1:
        return (f"٠ ÷ {_h(n)} = ؟", "٠", None)
    return (f"{_h(n)} ÷ {_h(n)} = ؟", "١", None)
