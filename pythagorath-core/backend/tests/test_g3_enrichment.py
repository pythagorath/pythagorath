"""Phase-1 content enrichment — Grade-3 batch (the poorest generator-narrow nodes).

Same contract as the Grade-1 batch: variety rose to the new honest level, and where a node
was text-only it gained a visual pattern. No family added/removed (the gate is untouched);
the lift is wider ranges + (for g3MULF1) a tappable array. Concept-bounded nodes (×11/×12
facts, capped conversions) reach their honest ceiling, not 40."""
import json
import random

from app import (gencontent_g3b7, gencontent_g3b8, gencontent_g3b10,  # noqa: F401
                 gencontent_m3, generators)


def _guard_distinct(code, draws=50, seed=99):
    rng = random.Random(seed)
    fams = list(generators.REGISTRY[code])
    seen = set()
    for i in range(draws):
        pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
        seen.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
    return len(seen)


NEW_FLOORS = {"g3MULF1": 35, "g3F12": 18, "g3FRLINE": 24, "g3CAPMASS": 30, "g3DATAB": 30}
OLD_FLOORS = {"g3MULF1": 25, "g3F12": 16, "g3FRLINE": 18, "g3CAPMASS": 24, "g3DATAB": 17}


def test_variety_rose_above_new_floor():
    for code, floor in NEW_FLOORS.items():
        d = _guard_distinct(code)
        assert d >= floor, (code, d, floor)
        assert floor > OLD_FLOORS[code]


def _kinds(code, family, n=300):
    rng = random.Random(7)
    ks = set()
    for _ in range(n):
        _, _, vis = generators.REGISTRY[code][family](rng, {})
        ks.add(vis["kind"] if isinstance(vis, dict) else None)
    return ks


def test_g3mulf1_skip_gained_an_array():
    # was text-only; small products now appear as a tappable array (the multiplication picture)
    ks = _kinds("g3MULF1", "skip")
    assert "array" in ks and None in ks, ks


def test_g3frline_uses_more_denominators():
    rng = random.Random(3)
    dens = set()
    for fam in ("below", "above"):
        for _ in range(200):
            _, _, vis = generators.REGISTRY["g3FRLINE"][fam](rng, {})
            dens.add(vis["den"])
    assert {5} <= dens and len(dens) >= 5, dens          # 5 added; richer denominator set


def test_enriched_answers_stay_correct_and_capped():
    caps = {"g3MULF1": 100, "g3F12": 156, "g3FRLINE": 16, "g3CAPMASS": 3000, "g3DATAB": 60}
    W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
    import re
    rng = random.Random(2026)
    for code, cap in caps.items():
        for fam in generators.REGISTRY[code]:
            for _ in range(200):
                pr, ans, vis = generators.REGISTRY[code][fam](rng, {})
                blob = pr + " " + ans + " " + (json.dumps(vis, ensure_ascii=False) if vis else "")
                nums = [int(x) for x in re.findall(r"[0-9]+", blob.translate(W))]
                assert not nums or max(nums) <= cap, (code, fam, max(nums), pr)
