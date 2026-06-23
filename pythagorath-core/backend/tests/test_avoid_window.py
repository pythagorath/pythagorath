"""Phase-2: the recent-repeat avoidance window (generators.py). Tracking only — it never
touches grading/mastery. Proves: (1) the window widened to 25–30 with a bounded resample cap;
(2) a wider window prevents nearer repeats for a medium/large space; (3) a node whose space is
smaller than the window neither hangs nor does unbounded work (self-collision fallback)."""
import random

from sqlalchemy import select

from app import generators
from app.generators import draw_batch
from app.models import Skill

SEP = "\x01"


def _skill(db, code):
    return db.execute(select(Skill).where(Skill.code == code)).scalars().one()


def _sequence(db, skill, sid, n, per=8):
    """Draw n live signatures across batches (commit between, as a real session would)."""
    sigs = []
    b = 0
    while len(sigs) < n:
        out = draw_batch(db, skill, sid, total=per, rng=random.Random(b))
        sigs += [i.prompt + SEP + i.answer for i in out]
        db.commit()
        b += 1
    return sigs[:n]


def _near_repeats(sigs, span):
    return sum(1 for i in range(len(sigs)) if sigs[i] in sigs[max(0, i - span):i])


def test_window_constants_widened_and_bounded():
    assert 25 <= generators._AVOID_WINDOW <= 30          # widened from 10
    assert generators._MAX_RESAMPLE <= 10                # resample stays cheap


def test_wider_window_prevents_nearer_repeats(db, h, monkeypatch):
    # a synthetic generator with a large, known space, overriding a real node's one family
    skill = _skill(db, "G3")                             # single-family; reuse its template
    fam = next(iter(generators.REGISTRY["G3"]))
    SPACE = 200

    def synth(rng, p):
        k = rng.randrange(SPACE)
        return (f"س{k}", str(k), None)

    monkeypatch.setitem(generators.REGISTRY["G3"], fam, synth)
    span = generators._AVOID_WINDOW

    a = h.student(db, name="wideA")
    wide = _sequence(db, skill, a.id, 40)                # default window (28)

    monkeypatch.setattr(generators, "_AVOID_WINDOW", 5)
    b = h.student(db, name="narrowB")
    narrow = _sequence(db, skill, b.id, 40)              # narrow window (5)

    # the wide window admits NO repeat within its span; the narrow one admits several
    assert _near_repeats(wide, span) == 0, _near_repeats(wide, span)
    assert _near_repeats(narrow, span) > _near_repeats(wide, span)


def test_tiny_space_no_hang_and_bounded_work(db, h, monkeypatch):
    """A node whose space is far smaller than the window: must return a full batch (no hang),
    do bounded work (≤ the hard cap), and accept the inevitable repeats."""
    skill = _skill(db, "G3")
    SPACE = 4
    calls = {"n": 0}

    def tiny(rng, p):
        calls["n"] += 1
        k = rng.randrange(SPACE)
        return (f"ت{k}", str(k), None)

    fam = next(iter(generators.REGISTRY["G3"]))
    monkeypatch.setitem(generators.REGISTRY["G3"], fam, tiny)

    total = 16
    st = h.student(db, name="tiny")
    out = draw_batch(db, skill, st.id, total=total, rng=random.Random(1))
    db.commit()

    assert len(out) == total                                         # full batch, no hang
    assert calls["n"] <= total * (1 + generators._MAX_RESAMPLE)      # bounded — never runaway
    sigs = [i.prompt + SEP + i.answer for i in out]
    assert len(set(sigs)) <= SPACE                                   # repeats accepted (space=4)
