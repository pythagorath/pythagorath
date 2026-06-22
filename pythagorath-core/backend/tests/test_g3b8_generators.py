"""G3 batch 8 — measurement, born live, independently verified.

The conversion table is TRANSCRIBED here (the cross-check against the generator's
own table); elapsed time is recomputed as a minute difference; change as a
subtraction; estimate confirmed against an order-of-magnitude bank.
"""
import json
import re
import random

from sqlalchemy import select

from app import gencontent_g3b8, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"[0-9]+", str(t).translate(_W))]


def _n1(t):
    return _nums(t)[0]


def v_len_measure(pr, ans, vis):
    return _n1(ans) == vis["length"] and vis["mode"] == "ruler"


# transcribed INDEPENDENTLY (different literal table than the generator)
LEN_FACTOR = {("أمتار", "سنتيمتراً"): 100, ("سنتيمترات", "ملمتراً"): 10,
              ("متر", "ملمتراً"): 1000, ("سنتيمتر", "متراً"): -100,
              ("ملمتر", "سنتيمتراً"): -10}
CM_FACTOR = {("كيلوغرام", "غراماً"): 1000, ("لتر", "مللتراً"): 1000,
             ("غرام", "كيلوغراماً"): -1000, ("مللتر", "لتراً"): -1000}


def _check_convert(pr, ans, table):
    m = re.match(r"حوّل: (\S+) (\S+) = ؟ (\S+)", pr)
    v = _n1(pr)
    u_from, u_to = m.group(2), m.group(3)
    f = table[(u_from, u_to)]
    expect = v * f if f > 0 else v // (-f)
    return _n1(ans) == expect


def v_len_convert(pr, ans, vis):
    return _check_convert(pr, ans, LEN_FACTOR)


EST_GOOD = {"كتلة البطيخة": "٣ كغم", "سعة الكوب": "٢٠٠ مل", "كتلة التفاحة": "١٠٠ غم",
            "سعة الدلو": "٨ لترات", "كتلة القلم": "١٠ غم", "سعة الملعقة": "٥ مل",
            "كتلة الكتاب": "٥٠٠ غم", "سعة زجاجة الماء": "١ لتر",
            "كتلة الفيل": "٣٠٠٠ كغم", "سعة حوض الاستحمام": "١٥٠ لتراً",
            "كتلة الموزة": "١٢٠ غم", "سعة قارورة العطر": "٣٠ مل",
            "كتلة الدرّاجة": "١٢ كغم", "سعة إبريق الشاي": "١ لتر",
            "كتلة الريشة": "١ غم", "سعة ملعقة الدواء": "١٠ مل"}


def v_capmass_estimate(pr, ans, vis):
    obj = pr.split("قدِّر ")[1].split(" —")[0]
    return ans == EST_GOOD[obj]


def v_capmass_measure(pr, ans, vis):
    if vis["mode"] == "balance":
        return _n1(ans) == vis["mass"]
    return _n1(ans) == vis["cups"]


def v_capmass_convert(pr, ans, vis):
    return _check_convert(pr, ans, CM_FACTOR)


def v_time_read(pr, ans, vis):
    h, m = vis["hour"], vis["minute"]
    want = f"{str(h).translate(str.maketrans('0123456789','٠١٢٣٤٥٦٧٨٩'))}:" + \
           ("٠" + str(m).translate(str.maketrans('0123456789','٠١٢٣٤٥٦٧٨٩')) if m < 10
            else str(m).translate(str.maketrans('0123456789','٠١٢٣٤٥٦٧٨٩')))
    return ans == want and ans in vis["options"]


def v_time_elapsed(pr, ans, vis):
    times = re.findall(r"([0-9٠-٩]+):([0-9٠-٩]+)", pr)
    (h1, m1), (h2, m2) = [(int(a.translate(_W)), int(b.translate(_W))) for a, b in times]
    elapsed = (h2 * 60 + m2) - (h1 * 60 + m1)
    return _n1(ans) == elapsed and 0 < elapsed <= 60


def v_money_total(pr, ans, vis):
    if vis and vis.get("kind") == "money":
        return _n1(ans) == sum(vis["coins"])
    a, b = _nums(pr)[:2]
    return _n1(ans) == a + b


def v_money_change(pr, ans, vis):
    # the two amounts appear in DIFFERENT orders per form: «ثمن price… دفعتَ paid»
    # vs «معك paid… اشتريتَ بـprice» — disambiguate by keyword, never by position
    a, b = _nums(pr)[:2]
    if pr.startswith("معك"):
        paid, price = a, b
    else:
        price, paid = a, b
    return _n1(ans) == paid - price and paid > price


VERIFIERS = {
    ("g3LEN", "measure"): v_len_measure, ("g3LEN", "convert"): v_len_convert,
    ("g3CAPMASS", "estimate"): v_capmass_estimate, ("g3CAPMASS", "measure"): v_capmass_measure,
    ("g3CAPMASS", "convert"): v_capmass_convert,
    ("g3TIME3", "read"): v_time_read, ("g3TIME3", "elapsed"): v_time_elapsed,
    ("g3MONEY3", "total"): v_money_total, ("g3MONEY3", "change"): v_money_change,
}

CAPS = {"g3LEN": 1000, "g3CAPMASS": 3000, "g3TIME3": 60, "g3MONEY3": 6000}
FLOORS = {"g3LEN": 30, "g3CAPMASS": 30, "g3TIME3": 35, "g3MONEY3": 35}   # CAPMASS raised (phase-1 enrichment)


def test_batch8_registered():
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


def test_conversion_independent_400():
    # every length AND mass/capacity conversion satisfies the transcribed table
    rng = random.Random(13)
    for code, table in (("g3LEN", LEN_FACTOR), ("g3CAPMASS", CM_FACTOR)):
        for _ in range(200):
            pr, ans, vis = generators.REGISTRY[code]["convert"](rng, {})
            assert _check_convert(pr, ans, table)


def test_elapsed_minute_difference_300():
    rng = random.Random(17)
    for _ in range(300):
        pr, ans, vis = generators.REGISTRY["g3TIME3"]["elapsed"](rng, {})
        assert v_time_elapsed(pr, ans, vis)


def test_options_order_is_shuffled():
    rng = random.Random(7)
    for (code, family), _ in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        positions = set()
        for _ in range(80):
            pr, ans, vis = gen(rng, {})
            if vis and vis.get("kind") in ("shape-pick", "clock") and ans in [
                    o["v"] if isinstance(o, dict) else o for o in vis.get("options", [])]:
                opts = [o["v"] if isinstance(o, dict) else o for o in vis["options"]]
                positions.add(opts.index(ans))
        if positions:
            assert len(positions) >= 2, (code, family)


def test_variation_guard_batch8():
    rng = random.Random(99)
    for code, floor in FLOORS.items():
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(50):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= floor, (code, len(draws))
