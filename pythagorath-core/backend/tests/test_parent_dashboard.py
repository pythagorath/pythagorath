"""Guardian dashboard — READ-ONLY parent-language aggregation. Confirms plain-language
descriptions (no bare curriculum term where covered), derived coins, streak in the child's
local day, the struggle/root-cause + plan, and that it writes nothing."""
from sqlalchemy import func, select

from app import dashboard, diagnostic, parent_terms, path as LP
from app.main import _path_skills
from app.models import Answer, Grade, Skill, SkillMastery


def _g4(db, h):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    return h.student(db, grade_id=g4.id, country="SA")


def _sk(db, c):
    return db.execute(select(Skill).where(Skill.code == c)).scalars().one()


def _master(db, h, sid, skill):
    h.reach_understood_multi(db, sid, skill)
    qq = h.questions(db, skill.id)
    for i in range(6):
        h.answer(db, sid, qq[i % len(qq)], correct=True, elapsed_ms=1000)


def _build(db, stu):
    return dashboard.build(db, stu, LP.next_skill, _path_skills(db, stu))


def test_structure_curriculum_and_coins(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    _master(db, h, stu.id, _sk(db, "g4PVM"))
    stu.coins = 137; db.commit()                                  # the REAL persisted balance
    d = _build(db, stu)
    assert d["child"]["name"] == stu.name
    assert d["child"]["curriculum"] == "السعودية" and d["child"]["grade"] == "الصف الرابع"
    assert d["cards"]["coins"] == 137                             # surfaced as-is (no derivation)
    assert d["cards"]["mastered"] >= 1 and d["cards"]["total"] > 0


def test_plain_language_descriptions(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4DEC"))
    d = _build(db, stu)
    # every shown skill is a PLAIN phrase from the parent-terms layer — never a raw code
    for text in (d["next"]["skill"], d["location"]["description"]):
        assert text in parent_terms.TERMS.values()
        assert "g4" not in text and "g3" not in text
    # the term itself appears in parentheses (the plain-language rule)
    assert parent_terms.describe("g4DEC", "") == "الأرقام بعد الفاصلة (الأعداد العشرية، مثل ٠٫٥)"


def test_struggle_root_cause_and_plan(db, h):
    stu = _g4(db, h)
    h.reach_understood_multi(db, stu.id, _sk(db, "g4FRAC"))          # unlock g4DEC
    for q in h.questions(db, _sk(db, "g4DEC").id)[:LP.STRUGGLE_THRESHOLD]:
        h.answer(db, stu.id, q, correct=False)                      # struggle
    d = _build(db, stu)
    s = d["struggle"]
    assert s["has"] is True
    assert "العشرية" in s["skill"]                                  # g4DEC (plain)
    assert "الكسور" in s["root"]                                    # g3FRAC foundation (plain)
    assert s["plan"]["steps"][0]["done"] is True                    # 'found the cause' ✓
    assert 0 <= s["plan"]["progress_percent"] <= 100
    assert "السبب الجذري" in s["pythagorath_line"]


def test_streak_counts_today(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    h.answer(db, stu.id, h.questions(db, _sk(db, "g4PVM").id)[0], correct=True)
    assert _build(db, stu)["streak_days"] >= 1


def test_dashboard_writes_nothing(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    n_ans = lambda: db.execute(select(func.count(Answer.id)).where(Answer.student_id == stu.id)).scalar_one()
    n_sm = lambda: db.execute(select(func.count()).select_from(SkillMastery).where(
        SkillMastery.student_id == stu.id)).scalar_one()
    a0, s0 = n_ans(), n_sm()
    _build(db, stu); _build(db, stu)
    assert n_ans() == a0 and n_sm() == s0                           # pure read


def test_g4_path_has_no_term_debt(db, h):
    """Every skill a Saudi G4 child sees (path + surfaced) HAS a parent-friendly term —
    no bare curriculum term leaks to this parent."""
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    assert _build(db, stu)["_term_debt"] == []
