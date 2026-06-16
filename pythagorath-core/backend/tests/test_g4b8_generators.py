"""G4 batch 8 — born-live patterns/data/probability generators, independently verified.

The closing G4 batch. Sequences re-derived from their own rule; number sentences by
substitution; function tables by computing the rule; data by value×scale; pie/line/
lineplot by reading the data; probability from the bag composition. Registry 179 → 185.
"""
import re
import random

from sqlalchemy import select

from app import gencontent_g4b8, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_COLOR_AR = {"red": "أحمر", "blue": "أزرق", "green": "أخضر", "yellow": "أصفر"}


def _nums(t):
    return [int(m) for m in re.findall(r"\d+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


# ---- g4SEQ ----

def v_seq_extend(pr, ans, vis):
    terms = vis["terms"]
    step = terms[1] - terms[0]
    return _n1(ans) == terms[-1] + step and all(terms[i + 1] - terms[i] == step for i in range(len(terms) - 1))


def v_seq_rule(pr, ans, vis):
    seq = _nums(pr)
    step = seq[1] - seq[0]
    return all(seq[i + 1] - seq[i] == step for i in range(len(seq) - 1)) \
        and _n1(ans) == step and ans in [o["v"] for o in vis["options"]]


def v_seq_shape(pr, ans, vis):
    body = pr.split("النمط:", 1)[1].split("؟", 1)[0].strip()
    s = [ch for ch in body if ch not in (" ",)]
    period = next(p for p in (1, 2, 3, 4) if all(s[i] == s[i % p] for i in range(len(s))))
    return s[len(s) % period] == ans and ans in [o["v"] for o in vis["options"]]


# ---- g4EXPR ----

def v_expr_sentence(pr, ans, vis):
    eq = pr.split(":", 1)[1].replace("؟", str(_n1(ans))).translate(_W)
    m = re.search(r"(\d+)\s*([+\-−×])\s*(\d+)\s*=\s*(\d+)", eq)
    a, op, b, c = int(m[1]), m[2], int(m[3]), int(m[4])
    val = a + b if op == "+" else (a - b if op in "-−" else a * b)
    return val == c


def v_expr_function(pr, ans, vis):
    rule = pr.split("القاعدة:", 1)[1]
    op = "+" if "+" in rule.split("»")[0] else "×"
    k = _nums(rule.split("»")[0])[0]
    x = _nums(pr.split("الدخل", 1)[1])[0]
    return _n1(ans) == (x + k if op == "+" else x * k)


# ---- g4DATA / g4LINEPLOT / g4GRAPH (chart) ----

def _read_value(ans, vis):
    return _n1(ans) == dict((l, v) for l, v in vis["data"])[vis["cat"]]


def _most(ans, vis):
    return ans == max(vis["data"], key=lambda d: d[1])[0]


def v_data_read(pr, ans, vis):
    return _read_value(ans, vis)


def v_data_interpret(pr, ans, vis):
    return _most(ans, vis)


def v_data_create(pr, ans, vis):
    ns = _nums(pr)
    key, value = ns[0], ns[1]
    return _n1(ans) == value // key


def v_graph_pie(pr, ans, vis):
    return vis["type"] == "pie" and _most(ans, vis)


def v_graph_line(pr, ans, vis):
    return vis["type"] == "line" and _read_value(ans, vis)


def v_lineplot_read(pr, ans, vis):
    return vis["type"] == "lineplot" and _read_value(ans, vis)


def v_lineplot_interpret(pr, ans, vis):
    return vis["type"] == "lineplot" and _most(ans, vis)


# ---- g4PROB ----

def v_prob_certainty(pr, ans, vis):
    total = sum(n for _, n in vis["balls"])
    ev = sum(n for c, n in vis["balls"] if c == vis["event"])
    expect = "أكيد" if ev == total else ("مستحيل" if ev == 0 else "ممكن")
    return ans == expect


def v_prob_likely(pr, ans, vis):
    if vis["ask"] == "more":
        col = max(vis["balls"], key=lambda b: b[1])[0]
    else:
        col = min(vis["balls"], key=lambda b: b[1])[0]
    return ans == _COLOR_AR[col]


VERIFIERS = {
    ("g4SEQ", "extend"): v_seq_extend, ("g4SEQ", "rule"): v_seq_rule, ("g4SEQ", "shape"): v_seq_shape,
    ("g4EXPR", "sentence"): v_expr_sentence, ("g4EXPR", "function"): v_expr_function,
    ("g4DATA", "read"): v_data_read, ("g4DATA", "interpret"): v_data_interpret, ("g4DATA", "create"): v_data_create,
    ("g4LINEPLOT", "read"): v_lineplot_read, ("g4LINEPLOT", "interpret"): v_lineplot_interpret,
    ("g4GRAPH", "pie"): v_graph_pie, ("g4GRAPH", "linegraph"): v_graph_line,
    ("g4PROB", "certainty"): v_prob_certainty, ("g4PROB", "likely"): v_prob_likely,
}

CODES = ("g4SEQ", "g4EXPR", "g4DATA", "g4LINEPLOT", "g4GRAPH", "g4PROB")
FLOORS = {"g4SEQ": 24, "g4EXPR": 24, "g4DATA": 24, "g4LINEPLOT": 24, "g4GRAPH": 16, "g4PROB": 16}


def test_batch_registered():
    for code in CODES:
        assert code in generators.REGISTRY


def test_families_match_templates_exactly(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl = set(db.execute(select(Question.family).where(
            Question.skill_id == skill.id, Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl, code


def test_500_samples_verified():
    rng = random.Random(2026)
    for (code, family), check in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        for _ in range(500):
            pr, ans, vis = gen(rng, {})
            assert check(pr, ans, vis), (code, family, pr, ans, vis)


def test_seeded_templates_pass_verifiers(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_new_chart_types_only_for_owners(db):
    """Within G4: pie/line appear ONLY under g4GRAPH; lineplot ONLY under g4LINEPLOT — no
    leak. (lineplot also exists in the grade-2 DA4 node — a different grade, out of scope.)"""
    by = {s.id: s.code for s in db.execute(select(Skill)).scalars().all() if s.code.startswith("g4")}
    for sid, code in by.items():
        for q in db.execute(select(Question).where(Question.skill_id == sid)).scalars():
            t = (q.visual or {}).get("type")
            if t in ("pie", "line"):
                assert code == "g4GRAPH", (code, t, q.prompt)
            if t == "lineplot":
                assert code == "g4LINEPLOT", (code, t, q.prompt)


def test_variation_guard():
    import json
    rng = random.Random(99)
    for code in CODES:
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(90):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= FLOORS[code], (code, len(draws))
