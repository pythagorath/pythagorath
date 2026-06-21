"""Phase أ of the semester dimension: STRUCTURE + backward-compatible filter only.

Pins the safety contract: a child with NO term (term=NULL) sees EXACTLY the same skills as
before the term column existed (country ∩ grade) — no child's view changes until terms are
classified AND a child's term is set. Also pins the filter semantics for when a term IS set.
The values are all NULL in the seed at this phase; here we set a couple by hand to exercise
the filter without touching the seeded content."""
from sqlalchemy import select, update

from app.main import _path_skills
from app.models import Skill, SkillCountry, Unit


def _country_grade_ids(db, country, grade_id):
    """The OLD logic, recomputed independently: skills of this grade ∩ this country path."""
    rows = db.execute(
        select(Skill).join(Unit, Skill.unit_id == Unit.id)
        .where(Unit.grade_id == grade_id).order_by(Skill.order, Skill.id)
    ).scalars().all()
    allowed = set(db.execute(
        select(SkillCountry.skill_id).where(SkillCountry.country == country)
    ).scalars().all())
    return [s.id for s in rows if s.id in allowed]


def test_term_null_child_sees_exactly_current_behavior(db, h):
    """term=NULL → identical to the pre-term (country ∩ grade) result, byte-for-byte order."""
    gid = h.grade_id(db)
    st = h.student(db, country="OM", grade_id=gid)
    assert st.term is None                                  # default: unset
    got = [s.id for s in _path_skills(db, st)]
    exp = _country_grade_ids(db, "OM", gid)
    assert got == exp and len(got) > 0


def test_term_null_child_unaffected_even_when_nodes_are_classified(db, h):
    """Classifying NODE terms must NOT change a term=NULL child's view (still whole grade)."""
    gid = h.grade_id(db)
    st = h.student(db, country="OM", grade_id=gid)
    base = _country_grade_ids(db, "OM", gid)
    # classify two OM nodes into semesters 1 and 2
    db.execute(update(SkillCountry).where(SkillCountry.country == "OM",
               SkillCountry.skill_id == base[0]).values(term=1))
    db.execute(update(SkillCountry).where(SkillCountry.country == "OM",
               SkillCountry.skill_id == base[1]).values(term=2))
    db.commit()
    got = [s.id for s in _path_skills(db, st)]          # child still has term=NULL
    assert got == base                                  # unchanged — sees everything


def test_term_filter_keeps_matching_plus_unclassified(db, h):
    gid = h.grade_id(db)
    st = h.student(db, country="OM", grade_id=gid)
    base = _country_grade_ids(db, "OM", gid)
    assert len(base) >= 3
    s1, s2 = base[0], base[1]                            # s1→term1, s2→term2, rest NULL
    db.execute(update(SkillCountry).where(SkillCountry.country == "OM",
               SkillCountry.skill_id == s1).values(term=1))
    db.execute(update(SkillCountry).where(SkillCountry.country == "OM",
               SkillCountry.skill_id == s2).values(term=2))
    db.commit()

    st.term = 1
    db.commit()
    got1 = {s.id for s in _path_skills(db, st)}
    assert s1 in got1 and s2 not in got1                # term-2 node hidden
    assert got1 == set(base) - {s2}                     # everything else (incl. all NULL) kept

    st.term = 2
    db.commit()
    got2 = {s.id for s in _path_skills(db, st)}
    assert s2 in got2 and s1 not in got2
    assert got2 == set(base) - {s1}

    st.term = None
    db.commit()
    assert {s.id for s in _path_skills(db, st)} == set(base)   # back to whole grade


def test_term_column_defaults_null_everywhere(db):
    """Phase أ ships UNCLASSIFIED: every seeded SkillCountry.term is NULL (no child affected)."""
    non_null = db.execute(
        select(SkillCountry).where(SkillCountry.term.is_not(None))
    ).scalars().all()
    assert non_null == []
