"""Phase-3 — visual/contextual enrichment of LIMITED-CONCEPT skills. The answer space is
unchanged (نعم/لا، the right fraction، the heavier/bigger object); only the scenes/objects/
shapes vary, so each question looks fresh. Pure presentation — gate.py / mastery untouched."""
import random

from app import gencontent_m2, gencontent_m3, gencontent_g3b9, generators  # noqa: F401
from app.gencontent_g3b9 import SYM_SHAPES


def _draws(code, family, n=400, seed=1):
    rng = random.Random(seed)
    return [generators.REGISTRY[code][family](rng, {}) for _ in range(n)]


# ----------------------------- variety rose -----------------------------
def test_mass_compare_more_objects():
    sigs = {frozenset((v["left"]["e"], v["right"]["e"])) for _, _, v in _draws("g1MASS", "compare")}
    assert len(sigs) >= 7                          # was 3 pairs


def test_area_coverage_more_objects():
    sigs = {frozenset(i["v"] for i in v["items"]) for _, _, v in _draws("g1AREA", "coverage")}
    assert len(sigs) >= 7                          # was 3 pairs


def test_position_more_scenes():
    sigs = set()
    for fam in ("axis", "topology"):
        for _, _, v in _draws("g1POS", fam):
            sigs.add((v["anchor"], tuple(sorted(o["v"] for o in v["objects"]))))
    assert len(sigs) >= 15                         # was a handful


def test_half_quarter_more_contexts():
    half = {pr for pr, _, _ in _draws("g1HALF", "shade")}
    qrt = {pr for pr, _, _ in _draws("g1QRT", "shade")}
    assert len(half) >= 10 and len(qrt) >= 10      # was ~2


def test_symmetry_more_shapes():
    shapes = {v["show"] for _, _, v in _draws("g3SYMM", "symmetry")}
    assert len(shapes) >= 10                       # was 6


# ----------------------------- answers stay correct -----------------------------
def test_answers_remain_correct_after_enrichment():
    for _, ans, v in _draws("g1MASS", "compare"):
        assert ans == v[v["heavier"]]["v"]         # heavier side is the answer
    for _, ans, v in _draws("g1AREA", "coverage"):
        big = max(v["items"], key=lambda i: i["w"] * i["h"])["v"]
        assert ans == big                          # the larger-area object
    for _, ans, v in _draws("g3SYMM", "symmetry"):
        assert ans == ("نعم" if SYM_SHAPES[v["show"]] else "لا")
    for _, ans, v in _draws("g1HALF", "shade"):
        assert ans == "١/٢"                        # the concept answer is fixed
    for _, ans, v in _draws("g1QRT", "shade"):
        assert ans == f"{'٠١٢٣٤٥٦٧٨٩'[v['target']]}/{'٠١٢٣٤٥٦٧٨٩'[v['parts']]}"
