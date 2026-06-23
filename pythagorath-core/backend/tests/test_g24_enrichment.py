"""Phase-1 enrichment — Grade-2 & Grade-4 closing batch (the least-poor grades).

Most G2/G4 thin nodes are concept- or widget-CAP-bounded (small numbers, finite shapes,
build targets ≤10) and are accepted at their honest ceiling. The genuinely generator-narrow
ones — M1 (self-capped at 30 < its 49 ceiling), g4ANGLE (14-angle list), g4METRIC (7-item
choose bank) — are widened here. No family/gate change; answers stay correct within CAPS."""
import json
import random

from app import gencontent_g4b6, gencontent_g4b7, gencontent_m2, generators  # noqa: F401


def _guard_distinct(code, draws=50, seed=99):
    rng = random.Random(seed)
    fams = list(generators.REGISTRY[code])
    seen = set()
    for i in range(draws):
        pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
        seen.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
    return len(seen)


NEW_FLOORS = {"M1": 35, "g4ANGLE": 28, "g4METRIC": 38}
OLD_FLOORS = {"M1": 26, "g4ANGLE": 24, "g4METRIC": 24}


def test_variety_rose_above_new_floor():
    for code, floor in NEW_FLOORS.items():
        d = _guard_distinct(code)
        assert d >= floor, (code, d, floor)
        assert floor > OLD_FLOORS[code]


def test_g4angle_uses_more_angles():
    rng = random.Random(5)
    seen = set()
    for fam in ("measure", "draw"):
        for _ in range(300):
            _, ans, _ = generators.REGISTRY["g4ANGLE"][fam](rng, {})
            seen.add(ans)
    assert len(seen) >= 16, len(seen)            # was 14 distinct angles (now 17, ×10 only)


def test_g4metric_choose_bank_widened():
    rng = random.Random(5)
    seen = set()
    for _ in range(400):
        pr, _, _ = generators.REGISTRY["g4METRIC"]["choose"](rng, {})
        seen.add(pr)
    assert len(seen) >= 13, len(seen)            # was 7 scenarios


def test_m1_reaches_higher_products():
    rng = random.Random(5)
    mx = 0
    for fam in ("خطّي", "مصفوفة"):
        for _ in range(300):
            _, ans, _ = generators.REGISTRY["M1"][fam](rng, {})
            mx = max(mx, int(ans.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))))
    assert mx > 30, mx                           # was self-capped at 30; now up to 49


def test_enriched_answers_stay_correct_and_capped():
    import re
    caps = {"M1": 49, "g4ANGLE": 180, "g4METRIC": 9000}
    W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
    rng = random.Random(2026)
    for code, cap in caps.items():
        for fam in generators.REGISTRY[code]:
            for _ in range(200):
                pr, ans, vis = generators.REGISTRY[code][fam](rng, {})
                blob = pr + " " + ans + " " + (json.dumps(vis, ensure_ascii=False) if vis else "")
                nums = [int(x) for x in re.findall(r"[0-9]+", blob.translate(W))]
                assert not nums or max(nums) <= cap, (code, fam, max(nums), pr)
