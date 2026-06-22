"""Phase-1 content enrichment — the six poorest Grade-1 generators.

Proves two things per skill: (1) variety rose to the new honest level, and (2) the added
SECOND pattern actually appears. No family was added/removed (the gate is untouched) — the
lift comes from wider ranges + extra visual patterns inside existing families."""
import json
import random

from app import gencontent, gencontent_m3, generators  # noqa: F401 — registration side effect


def _guard_distinct(code, draws=50, seed=99):
    """Mirror the variation guard: round-robin the families, count distinct (pr, ans, vis)."""
    rng = random.Random(seed)
    fams = list(generators.REGISTRY[code])
    seen = set()
    for i in range(draws):
        pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
        seen.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
    return len(seen)


# new honest floors (≥ old; capped skills reach their concept ceiling, not 40)
NEW_FLOORS = {"g1N10": 38, "g1N20": 22, "g1REL": 36, "g1ADDSTR": 40, "g1SUBSTR": 36, "g1EST": 38}
OLD_FLOORS = {"g1N10": 25, "g1N20": 13, "g1REL": 30, "g1ADDSTR": 35, "g1SUBSTR": 34, "g1EST": 25}


def test_variety_rose_above_new_floor():
    for code, floor in NEW_FLOORS.items():
        d = _guard_distinct(code)
        assert d >= floor, (code, d, floor)
        assert floor > OLD_FLOORS[code]            # the bar genuinely moved up


def _kinds(code, family, n=200):
    rng = random.Random(7)
    ks = set()
    for _ in range(n):
        _, _, vis = generators.REGISTRY[code][family](rng, {})
        ks.add(vis["kind"] if isinstance(vis, dict) else None)
    return ks


def test_g1rel_gained_a_visual_pattern():
    # was text-only; now a part-whole bar appears (plus the text form still appears)
    for fam in ("inverse", "missing"):
        ks = _kinds("g1REL", fam)
        assert "decomposition" in ks and None in ks, (fam, ks)


def test_g1addstr_derived_gained_ten_frame():
    ks = _kinds("g1ADDSTR", "derived")
    assert "ten-frame" in ks and None in ks, ks


def test_g1substr_derived_gained_subtract_blocks():
    ks = _kinds("g1SUBSTR", "derived")
    assert "subtract-blocks" in ks and None in ks, ks


def test_g1n20_sequence_has_multiple_step_patterns():
    # forward (+1), backward (−1) and skip-by-2 (+2) all occur → richer than the old +1 only
    rng = random.Random(3)
    steps = set()
    for _ in range(200):
        pr, ans, vis = generators.REGISTRY["g1N20"]["sequential"](rng, {})
        t = vis["terms"]
        steps.add(t[1] - t[0])
    assert {1, -1, 2} <= steps, steps


def test_enriched_answers_stay_correct_and_capped():
    # spot re-verification: every draw's answer is a non-negative int within the node cap
    caps = {"g1N10": 10, "g1N20": 20, "g1REL": 12, "g1ADDSTR": 20, "g1SUBSTR": 20, "g1EST": 250}
    W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
    rng = random.Random(2026)
    for code in caps:
        for fam in generators.REGISTRY[code]:
            for _ in range(200):
                pr, ans, vis = generators.REGISTRY[code][fam](rng, {})
                val = int(ans.translate(W))
                assert 0 <= val <= caps[code], (code, fam, ans)
