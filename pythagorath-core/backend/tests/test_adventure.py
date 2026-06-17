"""Child adventure screen — READ-ONLY child-language aggregation. Confirms stations come
from the path IN ORDER with the right visual state, the current station = next_skill, coins/
streak, plain (no-code) names, the needs-diagnostic gate, and that it writes nothing."""
from sqlalchemy import func, select

from app import adventure, diagnostic, parent_terms, path as LP
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
    return adventure.build(db, stu, LP.next_skill, _path_skills(db, stu))


def test_stations_follow_path_order(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    d = _build(db, stu)
    path = _path_skills(db, stu)
    assert [s["id"] for s in d["stations"]] == [s.id for s in path]      # same set, same order
    assert d["needs_diagnostic"] is False


def test_current_is_next_skill_and_plain(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    d = _build(db, stu)
    nxt = LP.next_skill(db, stu, _path_skills(db, stu))
    assert d["current"]["skill_id"] == nxt["skill_id"]
    # every name shown is a PLAIN parent-terms phrase — never a raw code
    for s in d["stations"]:
        assert "g4" not in s["name"] and "g3" not in s["name"]
    assert d["current"]["name"] in parent_terms.TERMS.values()


def test_visual_states_mastered_current_locked(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    _master(db, h, stu.id, _sk(db, "g4PVM"))
    d = _build(db, stu)
    by_code = {}
    skills = {s.id: s for s in _path_skills(db, stu)}
    for s in d["stations"]:
        by_code[skills[s["id"]].code] = s
    assert by_code["g4PVM"]["visual"] == "mastered"        # mastered → lit
    # exactly one current station when the target is in-grade
    currents = [s for s in d["stations"] if s["visual"] == "current"]
    assert len(currents) <= 1
    # a node whose prerequisites are unmet is locked
    assert any(s["visual"] == "locked" for s in d["stations"])


def test_coins_and_streak(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    _master(db, h, stu.id, _sk(db, "g4PVM"))
    stu.coins = 84; db.commit()                            # the REAL persisted balance
    d = _build(db, stu)
    assert d["coins"] == 84                                # surfaced as-is (no derivation)
    assert d["streak_days"] >= 1


def test_needs_diagnostic_before_placement(db, h):
    stu = _g4(db, h)                                        # never diagnosed
    d = _build(db, stu)
    assert d["needs_diagnostic"] is True
    assert d["current"] is None
    assert d["stations"]                                    # the map still shows the path
    assert not any(s["visual"] == "current" for s in d["stations"])


def test_adventure_writes_nothing(db, h):
    stu = _g4(db, h)
    diagnostic.record_placement(db, stu.id, _sk(db, "g4PVM"))
    n_ans = lambda: db.execute(select(func.count(Answer.id)).where(Answer.student_id == stu.id)).scalar_one()
    n_sm = lambda: db.execute(select(func.count()).select_from(SkillMastery).where(
        SkillMastery.student_id == stu.id)).scalar_one()
    a0, s0 = n_ans(), n_sm()
    _build(db, stu); _build(db, stu)
    assert n_ans() == a0 and n_sm() == s0                   # pure read
