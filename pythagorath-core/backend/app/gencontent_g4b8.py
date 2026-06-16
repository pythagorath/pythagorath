"""G4 batch 8 — patterns/algebra + data/probability (the FINAL G4 batch), born live.

Reuses widgets: sequence (g4SEQ extend), chart (g4DATA bar/pictograph; g4LINEPLOT
lineplot — already supported; g4GRAPH pie+line — the b8 chart extension), likelihood
(g4PROB). g4EXPR is text. Chart-read answers are _h(value) (Hindi) or the category
label (for «most») — the proven G3 convention. All arithmetic integer.

Nodes (body checks 2026-06-15):
  • g4SEQ (extend/rule/shape) — QA/AE/BH/SA. Number/shape sequences + rules. SEQ-KW/OM
    OUT (their patterns are embedded in the operations units, not a standalone act).
  • g4EXPR (sentence/function) — SA/BH. Number sentences + function tables. NEW (algebra).
  • g4DATA (read/interpret/create) — SIX. Scale-based bar/pictograph. Pair ↔ g3DATAR/g3DATAB.
  • g4LINEPLOT (read/interpret) — QA. Line plot («البيانات بالنقاط», و١٠). NEW representation.
  • g4GRAPH (pie/linegraph) — SA/BH. Pie + line graph («قطاعات/خطوط»). NEW representations.
  • g4PROB (certainty/likely) — SA. Probability. Pair ↔ g3PROB (Bahrain-single → Saudi).
All ROOTS (data/patterns are independent strands, as in G2/G3 — no edges).
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

_CATS = ["أ", "ب", "ج", "د"]
_SHAPES = ["🔺", "🔵", "🟩", "⭐"]


# ============================ g4SEQ (QA/AE/BH/SA) ============================

@register("g4SEQ", "extend")
def seq_extend(rng, p):
    start = rng.randrange(1, 12)
    step = rng.choice([2, 3, 4, 5, 10])
    terms = [start + step * i for i in range(4)]
    return ("أكمل المتتالية: اضبط الحدّ التالي.", _h(terms[-1] + step),
            {"kind": "sequence", "terms": terms})


@register("g4SEQ", "rule")
def seq_rule(rng, p):
    step = rng.choice([2, 3, 4, 5, 10])
    start = rng.randrange(1, 9)
    terms = "، ".join(_h(start + step * i) for i in range(4))
    good = f"+{_h(step)}"
    bad = f"+{_h(step + rng.choice([1, 2]))}"
    return (f"ما قاعدة المتتالية: {terms} ؟", good, _pick2(rng, good, bad))


@register("g4SEQ", "shape")
def seq_shape(rng, p):
    period = rng.choice([2, 3])
    pat = rng.sample(_SHAPES, period)
    seq = "".join(pat[i % period] for i in range(5))
    good = pat[5 % period]
    bad = rng.choice([s for s in pat if s != good]) if period > 1 else pat[0]
    return (f"ما الشكل التالي في النمط: {seq} ؟", good, _pick2(rng, good, bad))


# ============================ g4EXPR (SA/BH — NEW) ============================

@register("g4EXPR", "sentence")
def expr_sentence(rng, p):
    op = rng.choice(["+", "−", "×"])
    if op == "+":
        a, ans = rng.randrange(2, 20), rng.randrange(2, 20)
        return (f"أكمل الجملة العددية: {_h(a)} + ؟ = {_h(a + ans)}", _h(ans), None)
    if op == "−":
        ans, b = rng.randrange(2, 20), rng.randrange(2, 12)
        return (f"أكمل الجملة العددية: ؟ − {_h(b)} = {_h(ans)}", _h(ans + b), None)
    a, ans = rng.randrange(2, 10), rng.randrange(2, 10)
    return (f"أكمل الجملة العددية: {_h(a)} × ؟ = {_h(a * ans)}", _h(ans), None)


@register("g4EXPR", "function")
def expr_function(rng, p):
    op, k = rng.choice([("+", rng.randrange(2, 10)), ("×", rng.randrange(2, 6))])
    x = rng.randrange(2, 10)
    out = x + k if op == "+" else x * k
    rule = f"س {op} {_h(k)}"
    return (f"جدول دالّة، القاعدة: «{rule}». إذا كان الدخل {_h(x)} فما الخرج؟", _h(out), None)


# ============================ g4DATA (six) — bar/pictograph by scale ============================

@register("g4DATA", "read")
def data_read(rng, p):
    cats = _CATS[:3]
    if rng.random() < 0.5:                              # pictograph with a key
        scale = rng.choice([2, 5, 10])
        data = [[c, scale * rng.randrange(1, 6)] for c in cats]
        cat = rng.choice(cats)
        val = dict(data)[cat]
        return (f"في مخطّط الصور (كل رمز = {_h(scale)}): كم عدد الفئة «{cat}»؟", _h(val),
                {"kind": "chart", "mode": "read", "type": "pictograph",
                 "data": data, "scale": scale, "ask": "count", "cat": cat})
    data = [[c, rng.randrange(1, 9)] for c in cats]     # bar
    cat = rng.choice(cats)
    val = dict(data)[cat]
    return (f"في مخطّط الأعمدة: ما ارتفاع عمود الفئة «{cat}»؟", _h(val),
            {"kind": "chart", "mode": "read", "type": "bar",
             "data": data, "ask": "count", "cat": cat})


@register("g4DATA", "interpret")
def data_interpret(rng, p):
    cats = _CATS[:3]
    vals = rng.sample(range(2, 10), 3)
    data = [[c, v] for c, v in zip(cats, vals)]
    top = max(data, key=lambda d: d[1])[0]
    return ("في المخطّط: أيُّ فئةٍ هي الأكثر؟", top,
            {"kind": "chart", "mode": "read", "type": "bar", "data": data, "ask": "most"})


@register("g4DATA", "create")
def data_create(rng, p):
    key = rng.choice([2, 5, 10])
    value = key * rng.randrange(2, 6)
    return (f"كلُّ رمزٍ يمثّل {_h(key)} — كم رمزاً تحتاج لتمثيل القيمة {_h(value)}؟",
            _h(value // key), None)


# ============================ g4LINEPLOT (QA — line plot) ============================

@register("g4LINEPLOT", "read")
def lineplot_read(rng, p):
    cats = [_h(x) for x in rng.sample(range(1, 9), 3)]
    data = [[c, rng.randrange(1, 6)] for c in cats]
    cat = rng.choice(cats)
    val = dict(data)[cat]
    return (f"في الخطّ بالنقاط: كم عدد العلامات فوق القيمة «{cat}»؟", _h(val),
            {"kind": "chart", "mode": "read", "type": "lineplot",
             "data": data, "ask": "count", "cat": cat})


@register("g4LINEPLOT", "interpret")
def lineplot_interpret(rng, p):
    cats = [_h(x) for x in rng.sample(range(1, 9), 3)]
    vals = rng.sample(range(1, 7), 3)
    data = [[c, v] for c, v in zip(cats, vals)]
    top = max(data, key=lambda d: d[1])[0]
    return ("في الخطّ بالنقاط: أيُّ قيمةٍ لها أكثر العلامات؟", top,
            {"kind": "chart", "mode": "read", "type": "lineplot", "data": data, "ask": "most"})


# ============================ g4GRAPH (SA/BH — pie + line graph) ============================

@register("g4GRAPH", "pie")
def graph_pie(rng, p):
    cats = _CATS[:3]
    vals = rng.sample([1, 2, 3, 4, 6], 3)
    data = [[c, v] for c, v in zip(cats, vals)]
    top = max(data, key=lambda d: d[1])[0]
    return ("في القطاع الدائري: أيُّ فئةٍ نصيبها الأكبر؟", top,
            {"kind": "chart", "mode": "read", "type": "pie", "data": data, "ask": "most"})


@register("g4GRAPH", "linegraph")
def graph_line(rng, p):
    cats = _CATS[:4]
    data = [[c, rng.randrange(1, 8)] for c in cats]
    cat = rng.choice(cats)
    val = dict(data)[cat]
    return (f"في التمثيل بالخطوط: ما قيمة النقطة عند «{cat}»؟", _h(val),
            {"kind": "chart", "mode": "read", "type": "line",
             "data": data, "ask": "count", "cat": cat})


# ============================ g4PROB (SA) — probability ============================

# (code, feminine form for the prompt «كرات حمراء», masculine form the widget emits as answer)
_COL = [("red", "حمراء", "أحمر"), ("blue", "زرقاء", "أزرق"),
        ("green", "خضراء", "أخضر"), ("yellow", "صفراء", "أصفر")]


@register("g4PROB", "certainty")
def prob_certainty(rng, p):
    c1, c2 = rng.sample(_COL, 2)
    r = rng.random()
    if r < 0.34:                                        # only c1 → certain c1 / impossible c2
        return (f"كيس فيه كرات {c1[1]} فقط. سحب كرة {c1[1]} حدثٌ:", "أكيد",
                {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], 5]],
                 "ask": "certainty", "event": c1[0]})
    if r < 0.67:
        return (f"كيس فيه كرات {c1[1]} فقط. سحب كرة {c2[1]} حدثٌ:", "مستحيل",
                {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], 5]],
                 "ask": "certainty", "event": c2[0]})
    a, b = rng.randrange(2, 6), rng.randrange(2, 6)
    return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. سحب كرة {c1[1]} حدثٌ:", "ممكن",
            {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], a], [c2[0], b]],
             "ask": "certainty", "event": c1[0]})


@register("g4PROB", "likely")
def prob_likely(rng, p):
    c1, c2 = rng.sample(_COL, 2)
    a, b = rng.sample(range(2, 9), 2)
    if rng.random() < 0.5:                              # answer = the masculine colour (widget emit)
        good = c1[2] if a > b else c2[2]
        return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. أيُّ لونٍ أكثر احتمالاً للسحب؟", good,
                {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], a], [c2[0], b]], "ask": "more"})
    good = c1[2] if a < b else c2[2]
    return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. أيُّ لونٍ أقلُّ احتمالاً للسحب؟", good,
            {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], a], [c2[0], b]], "ask": "less"})
