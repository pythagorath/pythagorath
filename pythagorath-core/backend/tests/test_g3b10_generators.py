"""G3 batch 10 — data & probability (the FINAL batch), independently verified.

Reading-with-scale recomputed as symbols×key (the chart's data carries the FULL
count; the scale only changes the drawing); symbol-count as value÷key with exact
divisibility; probability against a transcribed bank. g3PROB rides the existing
likelihood widget (its certainty label is «أكيد», matching G2-DA3 — verified).
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g3b10, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def v_datar_read(pr, ans, vis):
    data = dict((c, n) for c, n in vis["data"])
    val = data[vis["cat"]]
    if vis.get("scale"):                             # value must be a whole number of symbols
        return _n1(ans) == val and val % vis["scale"] == 0
    return _n1(ans) == val


def v_datar_interpret(pr, ans, vis):
    if vis and vis.get("ask") == "most":
        data = dict((c, n) for c, n in vis["data"])
        return ans == max(data, key=data.get) and list(data.values()).count(max(data.values())) == 1
    ns = _nums(pr)
    if "تزيد" in pr:
        return _n1(ans) == max(ns[:2]) - min(ns[:2])
    return _n1(ans) == ns[0] + ns[1]                 # sum


def v_datab_symbols(pr, ans, vis):
    key, value = _nums(pr)[:2]
    return value % key == 0 and _n1(ans) == value // key


def v_datab_choose(pr, ans, vis):
    if "لماذا" in pr:
        return ans == "ليتّسع المخطّط"
    # the chosen scale is «مضاعفات k» where k divides all listed values
    vals = _nums(pr)
    k = _n1(ans)
    return all(v % k == 0 for v in vals)


def v_prob_certainty(pr, ans, vis):
    balls = dict((c, n) for c, n in vis["balls"])
    ev = vis["event"]
    if set(balls) == {ev}:
        return ans == "أكيد"
    if ev not in balls:
        return ans == "مستحيل"
    return ans == "ممكن"


COLOR_AR = {"red": "أحمر", "blue": "أزرق", "green": "أخضر", "yellow": "أصفر"}


def v_prob_likely(pr, ans, vis):
    balls = vis["balls"]
    if "أكثر" in pr:
        target = max(balls, key=lambda b: b[1])[0]
    else:
        target = min(balls, key=lambda b: b[1])[0]
    return ans == COLOR_AR[target] and balls[0][1] != balls[1][1]


VERIFIERS = {
    ("g3DATAR", "read"): v_datar_read, ("g3DATAR", "interpret"): v_datar_interpret,
    ("g3DATAB", "symbols"): v_datab_symbols, ("g3DATAB", "choose"): v_datab_choose,
    ("g3PROB", "certainty"): v_prob_certainty, ("g3PROB", "likely"): v_prob_likely,
}

CAPS = {"g3DATAR": 50, "g3DATAB": 60, "g3PROB": 9}
FLOORS = {"g3DATAR": 35, "g3DATAB": 30, "g3PROB": 30}


def test_batch10_registered():
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


def test_scale_reading_symbols_times_key_400():
    # the grade-new act: the drawn symbols × key must equal the graded count
    rng = random.Random(13)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g3DATAR"]["read"](rng, {})
        if vis.get("scale"):
            val = dict((c, n) for c, n in vis["data"])[vis["cat"]]
            assert _n1(ans) == val and val % vis["scale"] == 0


def test_certainty_label_matches_widget():
    # the widget emits «أكيد» (not «مؤكّد») — the answer must match, or grading fails
    rng = random.Random(5)
    for _ in range(200):
        pr, ans, vis = generators.REGISTRY["g3PROB"]["certainty"](rng, {})
        assert ans in ("أكيد", "ممكن", "مستحيل")


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


def test_variation_guard_batch10():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
