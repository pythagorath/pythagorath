"""Phase-4 — the «matching» interaction, trialled on g3MULF1 («حقائق الضرب»): the child links
each operation to its product. A new question TYPE with its own answer shape (per-left linked
values) and verification; it rides the existing flow — gate.py / mastery untouched."""
import random
from types import SimpleNamespace

from app import gate, generators, gencontent_m3  # noqa: F401 — registration side effect

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _sample(seed=0):
    rng = random.Random(seed)
    for _ in range(300):
        pr, ans, vis = generators.REGISTRY["g3MULF1"]["skip"](rng, {})
        if isinstance(vis, dict) and vis.get("kind") == "match":
            return pr, ans, vis
    raise AssertionError("match branch never produced")


def _products(vis):
    out = []
    for l in vis["left"]:
        a, b = [int(x) for x in l.translate(_W).split("×")]
        out.append(a * b)
    return out


def test_shape():
    pr, ans, vis = _sample()
    assert len(vis["left"]) == 3 and len(vis["right"]) == 3
    assert "،" in ans


def test_answer_is_products_in_left_order():
    for s in range(60):
        pr, ans, vis = _sample(s)
        prods = _products(vis)
        assert [int(x) for x in ans.translate(_W).split("،")] == prods
        # right column is exactly those products, permuted (a real matching task)
        assert sorted(int(x.translate(_W)) for x in vis["right"]) == sorted(prods)
        assert len(set(prods)) == 3                  # distinct → unambiguous


def test_right_column_is_scrambled():
    # the products are not pre-aligned to the operations (otherwise no work)
    seen_scramble = False
    for s in range(60):
        pr, ans, vis = _sample(s)
        if vis["right"] != [x for x in ans.split("،")]:
            seen_scramble = True
    assert seen_scramble


def test_grade_accepts_correct_rejects_wrong():
    pr, ans, vis = _sample(3)
    q = SimpleNamespace(answer=ans)
    assert gate.grade(q, ans) is True                # correct matching
    assert gate.grade(q, ans.translate(_W)) is True  # Latin digits accepted
    parts = ans.split("،")
    swapped = "،".join([parts[1], parts[0], parts[2]])
    assert gate.grade(q, swapped) is False           # mismatched links → rejected
    assert gate.grade(q, "،".join(["", "", ""])) is False   # nothing linked → rejected
