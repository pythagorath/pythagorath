"""G3 batch 10 — data & probability (the FINAL batch), born live.

Reading-with-scale recomputed as symbols×key; symbol-count as value÷key (exact
divisibility forced); probability against a transcribed fact bank (a one-colour
bag → certain; the absent colour → impossible; a majority colour → more likely).
The chart `scale` extension makes «read via the key» a real act (visually
verified). g3PROB rides the existing likelihood widget (G2-DA3's), the cross-
grade pair — not a new act.
"""
from __future__ import annotations

import random

from app.generators import register
from app.gencontent import _h, _pick2

CATS = ["أ", "ب", "ج"]


# ============================ g3DATAR ============================

@register("g3DATAR", "read")
def datar_read(rng: random.Random, p: dict):
    if rng.random() < 0.7:                           # pictograph WITH a key
        scale = rng.choice([2, 5, 10])
        data = [[c, rng.randrange(1, 6) * scale] for c in CATS]
        cat, val = rng.choice(data)
        return (f"في مخطّط الصور (كل رمز = {_h(scale)}): كم عدد الفئة «{cat}»؟", _h(val),
                {"kind": "chart", "mode": "read", "type": "pictograph",
                 "data": data, "scale": scale, "ask": "count", "cat": cat})
    data = [[c, rng.randrange(2, 10)] for c in CATS]  # plain bar reading
    cat, val = rng.choice(data)
    return (f"في مخطّط الأعمدة: ما ارتفاع عمود الفئة «{cat}»؟", _h(val),
            {"kind": "chart", "mode": "read", "type": "bar",
             "data": data, "ask": "count", "cat": cat})


@register("g3DATAR", "interpret")
def datar_interpret(rng: random.Random, p: dict):
    form = rng.randrange(3)
    vals = rng.sample(range(2, 10), 3)
    data = [[c, v] for c, v in zip(CATS, vals)]
    if form == 0:                                    # most
        best = max(data, key=lambda d: d[1])[0]
        return ("أيُّ فئةٍ هي الأكثر؟", best,
                {"kind": "chart", "mode": "read", "type": "bar", "data": data, "ask": "most"})
    if form == 1:                                    # difference (text)
        a, b = rng.sample(range(2, 10), 2)
        hi, lo = max(a, b), min(a, b)
        return (f"بكم تزيد فئةٌ قيمتها {_h(hi)} على فئةٍ قيمتها {_h(lo)}؟", _h(hi - lo), None)
    a, b = rng.randrange(2, 9), rng.randrange(2, 9)   # sum (text)
    return (f"كم مجموعُ فئتين قيمتاهما {_h(a)} و{_h(b)}؟", _h(a + b), None)


# ============================ g3DATAB ============================

@register("g3DATAB", "symbols")
def datab_symbols(rng: random.Random, p: dict):
    key = rng.choice([2, 3, 4, 5, 10])              # widened scale set
    n = rng.randrange(2, min(9, 60 // key + 1))     # keep value = key·n ≤ 60 (cap)
    value = key * n
    return (f"كلُّ رمزٍ يمثّل {_h(key)} — كم رمزاً تحتاج لتمثيل القيمة {_h(value)}؟",
            _h(n), None)


@register("g3DATAB", "choose")
def datab_choose(rng: random.Random, p: dict):
    if rng.random() < 0.75:
        key = rng.choice([2, 3, 4, 5, 10])          # widened scale set
        start = rng.randrange(1, 4)                  # vary which multiples are listed
        vals = "، ".join(_h(key * i) for i in range(start, start + 4))
        good = f"مضاعفات {_h(key)}"
        bad = "آحاد" if key > 2 else f"مضاعفات {_h(key + 3)}"
        return (f"لتمثيل القيم {vals} — أيُّ تدريجٍ أنسب؟", good, _pick2(rng, good, bad))
    return ("لماذا نختار تدريجاً بمضاعفاتٍ أكبر عند القيم الكبيرة؟", "ليتّسع المخطّط",
            _pick2(rng, "ليتّسع المخطّط", "ليكبر العدد"))


# ============================ g3PROB ============================

COLORS = [("red", "حمراء", "أحمر"), ("blue", "زرقاء", "أزرق"),
          ("green", "خضراء", "أخضر"), ("yellow", "صفراء", "أصفر")]


@register("g3PROB", "certainty")
def prob_certainty(rng: random.Random, p: dict):
    kind = rng.randrange(3)
    c1, c2 = rng.sample(COLORS, 2)
    if kind == 0:                                    # only that colour → certain
        return (f"كيس فيه كرات {c1[1]} فقط. سحب كرة {c1[1]} حدثٌ:", "أكيد",
                {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], rng.randrange(3, 8)]],
                 "ask": "certainty", "event": c1[0]})
    if kind == 1:                                    # absent colour → impossible
        return (f"كيس فيه كرات {c2[1]} فقط. سحب كرة {c1[1]} حدثٌ:", "مستحيل",
                {"kind": "likelihood", "scenario": "bag", "balls": [[c2[0], rng.randrange(3, 8)]],
                 "ask": "certainty", "event": c1[0]})
    a, b = rng.randrange(2, 7), rng.randrange(2, 7)   # mixed → possible
    return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. سحب كرة {c1[1]} حدثٌ:", "ممكن",
            {"kind": "likelihood", "scenario": "bag", "balls": [[c1[0], a], [c2[0], b]],
             "ask": "certainty", "event": c1[0]})


@register("g3PROB", "likely")
def prob_likely(rng: random.Random, p: dict):
    c1, c2 = rng.sample(COLORS, 2)
    a, b = rng.sample(range(2, 9), 2)
    more = rng.random() < 0.6
    if more:
        winner = c1 if a > b else c2
        return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. أيُّ لونٍ أكثر احتمالاً للسحب؟",
                winner[2], {"kind": "likelihood", "scenario": "bag",
                            "balls": [[c1[0], a], [c2[0], b]], "ask": "more"})
    loser = c1 if a < b else c2
    return (f"كيس فيه {_h(a)} {c1[1]} و{_h(b)} {c2[1]}. أيُّ لونٍ أقلُّ احتمالاً؟",
            loser[2], {"kind": "likelihood", "scenario": "bag",
                       "balls": [[c1[0], a], [c2[0], b]], "ask": "less"})
