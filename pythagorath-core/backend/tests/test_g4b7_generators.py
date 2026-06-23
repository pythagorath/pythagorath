"""G4 batch 7 — born-live geometry generators, independently verified.

Banks (line/angle types, shape classes, symmetry) are TRANSCRIBED INDEPENDENTLY here
— the cross-check. Angles are integer degrees (0–180); coordinates exact ordered
pairs. ONE new widget (protractor); the rest reuse G3/G1 widgets. Registry 173 → 179.
"""
import re
import random

from sqlalchemy import select

from app import gencontent_g4b7, generators  # noqa: F401 — registration side effect
from app.models import Question, Skill

_W = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _nums(t):
    return [int(m) for m in re.findall(r"\d+", str(t).translate(_W))]


# ---- independent banks (transcribed) ----
_LINES = {"خطّان لا يتقاطعان مهما امتدّا — ماذا يُسمّيان؟": "متوازيان",
          "خطّان يتقاطعان مكوّنين زاويةً قائمة — ماذا يُسمّيان؟": "متعامدان",
          "خطّان يلتقيان في نقطةٍ بزاويةٍ غيرِ قائمة — ماذا يُسمّيان؟": "متقاطعان",
          "خطّان في مستوًى واحدٍ على بُعدٍ ثابتٍ بينهما — ماذا يُسمّيان؟": "متوازيان"}
_ANGLET = {"زاويةٌ أصغرُ من الزاوية القائمة — ما نوعها؟": "حادّة",
           "زاويةٌ أكبرُ من القائمة وأصغرُ من المستقيمة — ما نوعها؟": "منفرجة",
           "زاويةٌ قياسها ٩٠° — ما نوعها؟": "قائمة",
           "زاويةٌ قياسها ١٨٠° (خطٌّ مستقيم) — ما نوعها؟": "مستقيمة"}
_SHAPES = {"مثلثٌ أضلاعه الثلاثة متساوية — ما نوعه؟": "متساوي الأضلاع",
           "مثلثٌ ضلعان منه متساويان فقط — ما نوعه؟": "متساوي الساقين",
           "مثلثٌ فيه زاويةٌ قائمة — ما نوعه؟": "قائم الزاوية",
           "رباعيٌّ أضلاعه الأربعة متساوية وزواياه قائمة — ما اسمه؟": "مربّع",
           "رباعيٌّ متقابلاته متساوية وزواياه قائمة وليس مربّعاً — ما اسمه؟": "مستطيل",
           "رباعيٌّ أضلاعه الأربعة متساوية وزواياه غيرُ قائمة — ما اسمه؟": "معيّن"}
_SYM_LINE = {"square": True, "circle": True, "rectangle": True, "pentagon": True,
             "hexagon": True, "triangle-scalene": False, "l-shape": False}
_SYM_ROT = {"square": True, "circle": True, "rectangle": True,
            "l-shape": False, "triangle-scalene": False}


def v_lines(pr, ans, vis):
    return _LINES[pr] == ans and ans in [o["v"] for o in vis["options"]]


def v_angletype(pr, ans, vis):
    return _ANGLET[pr] == ans and ans in [o["v"] for o in vis["options"]]


def v_angle_measure(pr, ans, vis):
    return _nums(ans)[0] == vis["angle"] and ans in vis["options"] and 0 < vis["angle"] < 180


def v_angle_draw(pr, ans, vis):
    return _nums(pr)[0] == vis["target"] == _nums(ans)[0] and vis["target"] % 5 == 0


def v_shape_classify(pr, ans, vis):
    return _SHAPES[pr] == ans and ans in [o["v"] for o in vis["options"]]


def v_shape_describe(pr, ans, vis):
    return vis["n"] == _nums(ans)[0]


def v_symm_line(pr, ans, vis):
    return (("نعم" if _SYM_LINE[vis["show"]] else "لا") == ans)


def v_symm_rot(pr, ans, vis):
    return (("نعم" if _SYM_ROT[vis["show"]] else "لا") == ans)


def _pair(s):
    n = _nums(s)
    return [n[0], n[1]]


def v_coord_plot(pr, ans, vis):
    return vis["target"] == _pair(ans) and _pair(ans) == _pair(pr) and max(vis["target"]) <= vis["max"]


def v_coord_read(pr, ans, vis):
    return vis["point"] == _pair(ans) and ans in vis["options"]


def v_loc_position(pr, ans, vis):
    want = pr.split("يقع", 1)[1].rsplit("الصندوق", 1)[0].strip()
    # the clicked object at that position carries v == its position word
    return ans == want and any(o["v"] == ans for o in vis["objects"])


def v_loc_between(pr, ans, vis):
    return ans == "بين" and any(o["pos"] == "between" and o["v"] == "بين" for o in vis["objects"])


VERIFIERS = {
    ("g4LINES", "lines"): v_lines, ("g4LINES", "angletype"): v_angletype,
    ("g4ANGLE", "measure"): v_angle_measure, ("g4ANGLE", "draw"): v_angle_draw,
    ("g4SHAPES", "classify"): v_shape_classify, ("g4SHAPES", "describe"): v_shape_describe,
    ("g4SYMM", "line"): v_symm_line, ("g4SYMM", "rotational"): v_symm_rot,
    ("g4COORD", "plot"): v_coord_plot, ("g4COORD", "read"): v_coord_read,
    ("g4LOC", "position"): v_loc_position, ("g4LOC", "between"): v_loc_between,
}

CODES = ("g4LINES", "g4ANGLE", "g4SHAPES", "g4SYMM", "g4COORD", "g4LOC")
FLOORS = {"g4LINES": 8, "g4ANGLE": 28, "g4SHAPES": 11, "g4SYMM": 12,
          "g4COORD": 24, "g4LOC": 10}   # g4ANGLE raised 24→28 (phase-1: 17 angles, ×10 only); others finite


def test_batch_registered():
    for code in CODES:
        assert code in generators.REGISTRY


def test_families_match_templates_exactly(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        tmpl = set(db.execute(select(Question.family).where(
            Question.skill_id == skill.id, Question.status == "published")).scalars())
        assert set(generators.REGISTRY[code]) == tmpl, code


def test_500_samples_verified():
    rng = random.Random(2026)
    for (code, family), check in VERIFIERS.items():
        gen = generators.REGISTRY[code][family]
        for _ in range(500):
            pr, ans, vis = gen(rng, {})
            assert check(pr, ans, vis), (code, family, pr, ans, vis)


def test_seeded_templates_pass_verifiers(db):
    for code in CODES:
        skill = db.execute(select(Skill).where(Skill.code == code)).scalars().one()
        for q in db.execute(select(Question).where(
                Question.skill_id == skill.id, Question.status == "published")).scalars():
            assert VERIFIERS[(code, q.family)](q.prompt, q.answer, q.visual), (code, q.family, q.prompt)


def test_protractor_widget_only_for_its_owners(db):
    """The NEW protractor widget appears ONLY under g4ANGLE (QA+SA's node)."""
    skills = {s.code: s.id for s in db.execute(select(Skill)).scalars().all()}
    for code, sid in skills.items():
        for q in db.execute(select(Question).where(Question.skill_id == sid)).scalars():
            if q.visual and q.visual.get("kind") == "protractor":
                assert code == "g4ANGLE", (code, q.prompt)


def test_angle_degrees_in_range():
    rng = random.Random(7)
    for fam in ("measure", "draw"):
        for _ in range(300):
            pr, ans, vis = generators.REGISTRY["g4ANGLE"][fam](rng, {})
            deg = vis.get("angle", vis.get("target"))
            assert 0 < deg < 180 and deg % 10 == 0, (fam, deg)


def test_variation_guard():
    import json
    rng = random.Random(99)
    for code in CODES:
        fams = list(generators.REGISTRY[code])
        draws = set()
        for i in range(80):
            pr, ans, vis = generators.REGISTRY[code][fams[i % len(fams)]](rng, {})
            draws.add((pr, ans, json.dumps(vis, ensure_ascii=False) if vis else ""))
        assert len(draws) >= FLOORS[code], (code, len(draws))
