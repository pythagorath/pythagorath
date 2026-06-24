"""Phase-4 — the drag-to-order interaction, trialled on N10 («ترتيب الأعداد»).

A new QUESTION TYPE with its own answer shape (the ordered sequence) and verification
(sequence equality). It rides the existing flow — the gate grades the answer string exactly
as any other; nothing in gate.py / mastery / the engine is touched."""
import random
from types import SimpleNamespace

from app import gate, generators, gencontent_m3  # noqa: F401 — registration side effect

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _drag_sample(seed=0):
    """Draw N10 until the drag-order branch comes up (≈half the draws)."""
    rng = random.Random(seed)
    for _ in range(200):
        pr, ans, vis = generators.REGISTRY["N10"]["decompositional"](rng, {})
        if isinstance(vis, dict) and vis.get("kind") == "drag-order":
            return pr, ans, vis
    raise AssertionError("drag-order branch never produced")


def test_branch_exists_and_shape():
    pr, ans, vis = _drag_sample()
    assert vis["direction"] in ("asc", "desc")
    assert len(vis["items"]) >= 4
    assert "،" in ans                               # the answer is a joined sequence


def test_generated_answer_is_the_correct_order():
    for s in range(40):
        pr, ans, vis = _drag_sample(s)
        items = [int(x.translate(_W)) for x in vis["items"]]
        expected = sorted(items, reverse=(vis["direction"] == "desc"))
        got = [int(x) for x in ans.translate(_W).split("،")]
        assert got == expected
        assert set(got) == set(items)               # same numbers, just ordered


def test_grade_accepts_correct_rejects_wrong():
    pr, ans, vis = _drag_sample(3)
    q = SimpleNamespace(answer=ans)
    # exact correct order → accepted
    assert gate.grade(q, ans) is True
    # the same child answer in Latin digits → still accepted (normalise)
    assert gate.grade(q, ans.translate(_W)) is True
    # a wrong order → rejected
    parts = ans.split("،")
    wrong = "،".join(list(reversed(parts)))
    if wrong == ans:                                # palindrome guard (won't happen for sorted≥4 distinct)
        wrong = "،".join([parts[1], parts[0]] + parts[2:])
    assert gate.grade(q, wrong) is False
    # a partial / swapped-adjacent order → rejected
    swapped = "،".join([parts[1], parts[0]] + parts[2:])
    assert gate.grade(q, swapped) is False


def test_items_are_scrambled_not_already_sorted():
    # the child always has real work: the shown order is never the correct order
    for s in range(40):
        pr, ans, vis = _drag_sample(s)
        shown = vis["items"]
        assert "،".join(shown) != ans
