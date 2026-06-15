"""G4 batch 5 — born-live decimal generators, independently verified from birth.

The maths is re-derived in HUNDREDTHS integer space (×100) — never a float:
grid by conversion (shaded/10 or /100), compare by ×100, convert by cross-
multiplication (a/b = H/100 ⇔ a·100 = H·b), round/add/subtract by integer
arithmetic. Range law: ≤ 2 decimal places (no thousandths), denominators ∈ {10,100};
g4DEC < 1, g4DECLINE < 2, g4DECADD operands/results < 100. Registry grows 165 → 168.
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g4b5, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩٫", "0123456789.")


def parse_h(s):
    """Arabic decimal / integer string → integer hundredths (independent of formatting)."""
    t = str(s).translate(_W).strip()
    m = re.search(r"-?\d+\.\d+|-?\d+", t)
    tok = m.group(0)
    neg = tok.startswith("-")
    tok = tok.lstrip("-")
    if "." in tok:
        whole, frac = tok.split(".")
        val = int(whole or 0) * 100 + int((frac + "00")[:2])
    else:
        val = int(tok) * 100
    return -val if neg else val


def _decs_in(text):
    return [parse_h(m) for m in re.findall(r"\d+\.\d+", str(text).translate(_W))]


def _fracs_in(text):
    return [(int(a), int(b)) for a, b in re.findall(r"(\d+)/(\d+)", str(text).translate(_W))]


# ---------- g4DEC ----------

def v_grid(pr, ans, vis):
    total = vis["rows"] * vis["cols"]                 # 10 (tenths) or 100 (hundredths)
    expected = vis["shaded"] * (100 // total)         # → hundredths
    return parse_h(ans) == expected and ans in vis["options"] and vis["cols"] == 10


def v_compare(pr, ans, vis):
    nums = _decs_in(pr)                               # the two decimals shown in the prompt
    return len(nums) == 2 and parse_h(ans) == max(nums)


def v_convert(pr, ans, vis):
    blob = pr + " " + ans
    (a, b) = _fracs_in(blob)[0]                       # the single common fraction
    H = _decs_in(blob)[0]                             # the single decimal
    return a * 100 == H * b                           # cross-multiplication, in /100 space


# ---------- g4DECLINE ----------

def v_place(pr, ans, vis):
    H = parse_h(ans)
    return (vis["den"] == 10 and vis.get("dec") is True and H % 10 == 0
            and 0 < H < vis["maxWhole"] * 100)


def v_read(pr, ans, vis):
    return (vis["den"] == 10 and vis.get("dec") is True
            and parse_h(ans) == vis["mark"] * 10 and ans in vis["options"])


# ---------- g4DECADD ----------

def v_round(pr, ans, vis):
    H = _decs_in(pr)[0]
    if "صحيح" in pr:
        expected = ((H + 50) // 100) * 100
    else:                                             # «أقرب جزء من عشرة»
        expected = ((H + 5) // 10) * 10
    return parse_h(ans) == expected


def v_add(pr, ans, vis):
    a, b = _decs_in(pr)[:2]
    return parse_h(ans) == a + b


def v_subtract(pr, ans, vis):
    a, b = _decs_in(pr)[:2]
    return parse_h(ans) == a - b and a - b > 0


VERIFIERS = {
    ("g4DEC", "grid"): v_grid, ("g4DEC", "compare"): v_compare, ("g4DEC", "convert"): v_convert,
    ("g4DECLINE", "place"): v_place, ("g4DECLINE", "read"): v_read,
    ("g4DECADD", "round"): v_round, ("g4DECADD", "add"): v_add,
    ("g4DECADD", "subtract"): v_subtract,
}

CODES = ("g4DEC", "g4DECLINE", "g4DECADD")
VALUE_CAP = {"g4DEC": 100, "g4DECLINE": 200, "g4DECADD": 10000}   # hundredths ceilings
FLOORS = {c: 30 for c in CODES}


def _places_ok(blob):
    """No thousandths — every decimal token has ≤ 2 fractional digits."""
    return all(len(f) <= 2 for f in re.findall(r"\d+\.(\d+)", blob.translate(_W)))


# decimal place value is tenths/hundredths (/10, /100); the convert family additionally
# links to the standard terminating-decimal common fractions (halves/quarters/fifths/tenths)
_ALLOWED_DENS = {2, 4, 5, 10, 100}


def _dens_ok(blob):
    return all(int(b) in _ALLOWED_DENS for _, b in re.findall(r"(\d+)/(\d+)", blob.translate(_W)))


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
            blob = pr + " " + ans + (" " + json.dumps(vis, ensure_ascii=False) if vis else "")
            assert _places_ok(blob), (code, family, pr)          # no thousandths
            assert _dens_ok(blob), (code, family, pr)            # dens ∈ {10,100}
            # value law: the authored quantity (prompt+answer) stays in the node's range
            for h in _decs_in(pr + " " + ans):
                assert 0 <= h < VALUE_CAP[code], (code, family, pr, h)


def test_seeded_templates_pass_verifiers(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_compare_includes_the_place_value_trap():
    """The tenths↔hundredths misconception (٠٫٧ > ٠٫٤٥) must actually be generated."""
    rng = random.Random(5)
    trap = False
    for _ in range(300):
        pr, ans, vis = generators.REGISTRY["g4DEC"]["compare"](rng, {})
        a, b = _decs_in(pr)
        hi, lo = max(a, b), min(a, b)
        # the misconception: the LARGER value displays with FEWER frac digits (a tenth,
        # e.g. ٠٫٧) while the smaller shows two (e.g. ٠٫٤٥) — naive «45 > 7» picks wrong
        if hi % 10 == 0 and lo % 10 != 0:
            trap = True
            break
    assert trap


def test_add_subtract_no_float_drift():
    """Sums/differences are exact in /100 space (the alignment law) across many draws."""
    rng = random.Random(7)
    for fam, op in (("add", 1), ("subtract", -1)):
        for _ in range(300):
            pr, ans, vis = generators.REGISTRY["g4DECADD"][fam](rng, {})
            a, b = _decs_in(pr)[:2]
            assert parse_h(ans) == a + op * b, (fam, pr, ans)
            assert 0 < parse_h(ans) < 10000, (fam, pr)


def test_variation_guard():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(80):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
