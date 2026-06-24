"""Phase-4 (extension) — drag-to-order applied to FRACTIONS, on g3FREQ («الكسور المتكافئة
ومقارنتها»). The order is by VALUE (k/n), not appearance; verified independently with
fractions.Fraction. Same flow/grading as N10 — gate.py / mastery untouched."""
import random
from fractions import Fraction
from types import SimpleNamespace

from app import gate, generators, gencontent_g3b7  # noqa: F401 — registration side effect

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _sample(seed=0):
    rng = random.Random(seed)
    for _ in range(200):
        pr, ans, vis = generators.REGISTRY["g3FREQ"]["rulecmp"](rng, {})
        if isinstance(vis, dict) and vis.get("kind") == "drag-order":
            return pr, ans, vis
    raise AssertionError("drag-order branch never produced")


def _frac(s):
    k, n = [int(x) for x in s.translate(_W).split("/")]
    return Fraction(k, n)


def test_items_are_fractions_and_shape():
    pr, ans, vis = _sample()
    assert vis["direction"] in ("asc", "desc")
    assert len(vis["items"]) == 3 and all("/" in it for it in vis["items"])
    assert "،" in ans


def test_order_is_by_fraction_value():
    for s in range(50):
        pr, ans, vis = _sample(s)
        items = [_frac(it) for it in vis["items"]]
        expected = sorted(items, reverse=(vis["direction"] == "desc"))
        got = [_frac(x) for x in ans.split("،")]
        assert got == expected                       # ordered by VALUE, not by appearance
        assert len(set(items)) == 3                  # distinct values → unambiguous


def test_value_order_differs_from_visual_order():
    # a real comparison task: e.g. ١/٤ < ١/٣ < ١/٢ even though denominators look "bigger"
    seen_cross = False
    for s in range(60):
        pr, ans, vis = _sample(s)
        items = [_frac(it) for it in vis["items"]]
        dens = [f.denominator for f in items]
        # whenever a larger denominator carries a smaller value, value-order ≠ den-order
        if dens != sorted(dens) or dens != sorted(dens, reverse=True):
            seen_cross = True
        assert "،".join(vis["items"]) != ans          # never shown already ordered
    assert seen_cross


def test_grade_accepts_correct_rejects_wrong():
    pr, ans, vis = _sample(3)
    q = SimpleNamespace(answer=ans)
    assert gate.grade(q, ans) is True                # exact correct
    assert gate.grade(q, ans.translate(_W)) is True  # Latin digits also accepted
    parts = ans.split("،")
    assert gate.grade(q, "،".join(reversed(parts))) is False      # reversed → wrong
    assert gate.grade(q, "،".join([parts[1], parts[0], parts[2]])) is False  # swap → wrong
