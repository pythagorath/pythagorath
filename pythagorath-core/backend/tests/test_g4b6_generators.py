"""G4 batch 6 — born-live measurement generators, independently verified.

All integer (no floats). Conversion factors are TRANSCRIBED INDEPENDENTLY here
(the cross-check): metric scale to mm/g/mL base. Perimeter 2(l+w)/4s and its
inverse; area l×w and the composite sum; elapsed time a minute difference; volume
l×w×h. Registry grows 168 → 173. ZERO new widgets (measure + clock reused).
"""
import re
import random

from sqlalchemy import select

from app import gencontent_g4b6, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(text):
    return [int(m) for m in re.findall(r"\d+", str(text).translate(_W))]


# ---------- g4METRIC ----------
# independent transcription of the metric scale (base = mm / g / mL)
_SCALE = {"mm": 1, "cm": 10, "m": 1000, "km": 1_000_000, "g": 1, "kg": 1000, "mL": 1, "L": 1000}


def _unit_of(t):
    # specific compounds first; «أمتار» (plural of متر) doesn't contain the substring «متر»
    for stem, u in (("كيلومتر", "km"), ("سنتيمتر", "cm"), ("ملمتر", "mm"),
                    ("كيلوغرام", "kg"), ("مللتر", "mL"),
                    ("أمتار", "m"), ("متر", "m"), ("غرام", "g"), ("لتر", "L")):
        if stem in t:
            return u
    return None


def v_convert(pr, ans, vis):
    left, right = pr.split("=", 1)
    u_from, u_to = _unit_of(left), _unit_of(right)
    v = _nums(left)[0]
    num = v * _SCALE[u_from]
    return num % _SCALE[u_to] == 0 and num // _SCALE[u_to] == _nums(ans)[0]


_CHOOSE_KEY = {"طول الملعب": "متر", "طول القلم": "سنتيمتر", "كتلة التفاحة": "غرام",
               "كتلة الطالب": "كيلوغرام", "سعة كوب الماء": "مللتر", "سعة الخزّان": "لتر",
               "المسافة بين مدينتين": "كيلومتر"}


def v_choose(pr, ans, vis):
    obj = pr.split("لقياس", 1)[1].rsplit("؟", 1)[0].strip()
    return _CHOOSE_KEY[obj] == ans


def v_measure(pr, ans, vis):
    return vis["mode"] == "ruler" and vis["length"] == _nums(ans)[0] and vis["length"] <= vis["max"]


# ---------- g4PERIM ----------

def v_compute(pr, ans, vis):
    ns = _nums(pr)
    expect = 2 * (ns[0] + ns[1]) if "مستطيل" in pr else 4 * ns[0]
    return _nums(ans)[0] == expect


def v_inverse(pr, ans, vis):
    P, l = _nums(pr)[0], _nums(pr)[1]
    return P % 2 == 0 and _nums(ans)[0] == P // 2 - l and P // 2 - l > 0


# ---------- g4AREA ----------

def v_multiply(pr, ans, vis):
    ns = _nums(pr)
    expect = ns[0] * ns[1] if "مستطيل" in pr else ns[0] * ns[0]
    return _nums(ans)[0] == expect


def v_composite(pr, ans, vis):
    a, b, c, d = _nums(pr)[:4]
    return _nums(ans)[0] == a * b + c * d


# ---------- g4TIME ----------

def v_read(pr, ans, vis):
    a = str(ans).translate(_W)
    return a == f"{vis['hour']}:{vis['minute']:02d}" and a in [str(o).translate(_W) for o in vis["options"]]


def v_elapsed(pr, ans, vis):
    t = str(pr).translate(_W)
    times = [(int(h), int(m)) for h, m in re.findall(r"(\d+):(\d+)", t)]
    (h1, m1), (h2, m2) = times[0], times[1]
    return _nums(ans)[0] == (h2 * 60 + m2) - (h1 * 60 + m1)


# ---------- g4VOL ----------

def v_volume(pr, ans, vis):
    a, b, c = _nums(pr)[:3]
    return _nums(ans)[0] == a * b * c


VERIFIERS = {
    ("g4METRIC", "convert"): v_convert, ("g4METRIC", "choose"): v_choose,
    ("g4METRIC", "measure"): v_measure,
    ("g4PERIM", "compute"): v_compute, ("g4PERIM", "inverse"): v_inverse,
    ("g4AREA", "multiply"): v_multiply, ("g4AREA", "composite"): v_composite,
    ("g4TIME", "read"): v_read, ("g4TIME", "elapsed"): v_elapsed,
    ("g4VOL", "estimate"): v_volume, ("g4VOL", "prism"): v_volume,
}

CODES = ("g4METRIC", "g4PERIM", "g4AREA", "g4TIME", "g4VOL")
# integer ceilings per node (every served numeral stays inside)
CAP = {"g4METRIC": 9000, "g4PERIM": 300, "g4AREA": 400, "g4TIME": 60, "g4VOL": 1000}
FLOORS = {c: 24 for c in CODES}


def test_batch_registered():
    for code in CODES:
        assert code in generators.REGISTRY


def test_families_match_templates_exactly(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl = set(db.execute(select(Question.family).where(
            Question.skill_id == skill.id, Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl, code


def test_500_samples_verified_and_range_capped():
    rng = random.Random(2026)
    for (code, family), check in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        for _ in range(500):
            pr, ans, vis = gen(rng, {})
            assert check(pr, ans, vis), (code, family, pr, ans, vis)
            # every integer in prompt+answer stays inside the node's ceiling
            for n in _nums(pr) + _nums(ans):
                assert n <= CAP[code], (code, family, pr, n)


def test_seeded_templates_pass_verifiers(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_area_is_root_uses_only_small_factors():
    """g4AREA is a ROOT (Oman has no G4 multiplication node) — its factors stay within
    multiplication facts (≤ 15) so an Oman child can answer from facts, not an algorithm."""
    rng = random.Random(7)
    for fam in ("multiply", "composite"):
        for _ in range(300):
            pr, ans, vis = generators.REGISTRY["g4AREA"][fam](rng, {})
            assert all(n <= 15 for n in _nums(pr)), (fam, pr)


def test_perimeter_inverse_is_exact():
    rng = random.Random(11)
    for _ in range(300):
        pr, ans, vis = generators.REGISTRY["g4PERIM"]["inverse"](rng, {})
        P, l = _nums(pr)[0], _nums(pr)[1]
        assert P % 2 == 0 and P // 2 - l == _nums(ans)[0] and _nums(ans)[0] > 0, pr


def test_metric_conversions_are_exact_integers():
    rng = random.Random(13)
    for _ in range(400):
        pr, ans, vis = generators.REGISTRY["g4METRIC"]["convert"](rng, {})
        left, right = pr.split("=", 1)
        num = _nums(left)[0] * _SCALE[_unit_of(left)]
        assert num % _SCALE[_unit_of(right)] == 0, pr           # no fractional metric result


def test_variation_guard():
    import json
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(80):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
