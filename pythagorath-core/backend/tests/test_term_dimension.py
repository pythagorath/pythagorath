"""Semester dimension — phases أ (structure + backward-compatible filter) and ب (equal split).

Pins two contracts:
  * SAFETY: a child with NO term (term=NULL) sees EXACTLY their whole grade∩country path —
    unchanged by the fill, so no current child is affected.
  * SPLIT: every (country × grade) path is halved by path order — first ceil(n/2) = term 1,
    rest = term 2; nothing is lost; a child with term=1/2 sees exactly that half.
The fill is computed at seed time by app.seed._assign_semester_terms; here we read it back."""
from app.main import _path_skills
from app.models import Grade, Skill, SkillCountry, Unit
from sqlalchemy import select


def _ordered_path_ids(db, country, grade_id):
    """The grade∩country path in the SAME order _path_skills serves it (Skill.order, id)."""
    return db.execute(
        select(Skill.id)
        .join(Unit, Skill.unit_id == Unit.id)
        .join(SkillCountry, SkillCountry.skill_id == Skill.id)
        .where(Unit.grade_id == grade_id, SkillCountry.country == country)
        .order_by(Skill.order, Skill.id)
    ).scalars().all()


# ----------------------------- SAFETY: no current child affected -----------------------------
def test_term_null_child_sees_whole_grade_after_fill(db, h):
    """term=NULL → still the whole grade∩country path, byte-for-byte order, despite the fill."""
    gid = h.grade_id(db)
    st = h.student(db, country="OM", grade_id=gid)
    assert st.term is None                                  # default: unset
    got = [s.id for s in _path_skills(db, st)]
    exp = _ordered_path_ids(db, "OM", gid)
    assert got == exp and len(got) > 0


def test_term_null_child_unaffected_other_country(db, h):
    gid = h.grade_id(db)
    st = h.student(db, country="BH", grade_id=gid)
    assert st.term is None
    assert [s.id for s in _path_skills(db, st)] == _ordered_path_ids(db, "BH", gid)


# ----------------------------- the fill itself -----------------------------
def test_every_path_node_is_classified(db):
    """Phase ب filled EVERY membership row: term ∈ {1,2}, none left NULL."""
    nulls = db.execute(select(SkillCountry).where(SkillCountry.term.is_(None))).scalars().all()
    assert nulls == []
    vals = set(db.execute(select(SkillCountry.term).distinct()).scalars().all())
    assert vals == {1, 2}


def test_split_is_half_ceil_first_and_loses_nothing(db):
    """For EVERY (country × grade): |term1| = ceil(n/2), |term2| = floor(n/2), sum = n, and the
    split follows path order (first half = term 1)."""
    countries = db.execute(select(SkillCountry.country).distinct()).scalars().all()
    grades = db.execute(select(Grade.id)).scalars().all()
    for c in countries:
        for g in grades:
            ids = _ordered_path_ids(db, c, g)
            n = len(ids)
            if n == 0:
                continue
            term = {sid: db.execute(select(SkillCountry.term).where(
                SkillCountry.skill_id == sid, SkillCountry.country == c)).scalar() for sid in ids}
            t1 = [s for s in ids if term[s] == 1]
            t2 = [s for s in ids if term[s] == 2]
            half = (n + 1) // 2
            assert len(t1) == half, (c, g, n)
            assert len(t2) == n - half, (c, g, n)
            assert len(t1) + len(t2) == n, (c, g, n)       # nothing lost / no NULL
            assert t1 == ids[:half], (c, g)                # first half by path order
            assert t2 == ids[half:], (c, g)


# ----------------------------- child views the right half -----------------------------
def test_child_term1_first_half_term2_second_half_union_all(db, h):
    gid = h.grade_id(db)
    base = _ordered_path_ids(db, "OM", gid)
    n = len(base)
    half = (n + 1) // 2
    assert n >= 2
    st = h.student(db, country="OM", grade_id=gid)

    st.term = None
    db.commit()
    assert [s.id for s in _path_skills(db, st)] == base          # whole grade

    st.term = 1
    db.commit()
    first = [s.id for s in _path_skills(db, st)]
    assert first == base[:half]                                  # exactly الفصل الأول

    st.term = 2
    db.commit()
    second = [s.id for s in _path_skills(db, st)]
    assert second == base[half:]                                 # exactly الفصل الثاني

    assert set(first) | set(second) == set(base)                 # union = whole grade
    assert set(first) & set(second) == set()                     # no overlap
