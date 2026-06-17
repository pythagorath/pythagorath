"""Manager dashboard — READ-ONLY admin aggregations. Confirms owner-only access
(401 anon / 403 guardian), that each section reads real data from the heart, and that
nothing is written."""
from sqlalchemy import func, select

from app.models import Answer, Grade, Skill, SkillMastery


ADMIN_READS = [
    "/api/admin/overview", "/api/admin/students", "/api/admin/parents", "/api/admin/reports",
]


def test_admin_reads_are_owner_only(client, guardian_client):
    for p in ADMIN_READS:
        assert client.get(p).status_code == 401          # anonymous
        assert guardian_client.get(p).status_code == 403  # a guardian is NOT the owner


def _seed(db, h):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    stu = h.student(db, name="رؤى", grade_id=g4.id, country="SA")
    sk = db.execute(select(Skill).where(Skill.code == "g4PVM")).scalars().one()
    qq = h.questions(db, sk.id)
    for q in qq[:3]:
        h.answer(db, stu.id, q, correct=False)           # wrong → real struggle data
    return stu, sk


def test_overview_reads_real_data(admin_client, db, h):
    _seed(db, h)
    d = admin_client.get("/api/admin/overview").json()
    assert set(d["cards"]) == {"parents", "children", "active_week"}
    assert d["cards"]["children"] >= 1
    assert d["content_health"]["skills"] > 0
    assert d["content_health"]["curricula"] == 6
    assert len(d["activity_7d"]) == 7
    assert isinstance(d["struggled"], list)


def test_students_parents_and_detail(admin_client, db, h):
    stu, sk = _seed(db, h)
    sts = admin_client.get("/api/admin/students").json()
    row = next(s for s in sts if s["name"] == "رؤى")
    assert row["grade"] == "الصف الرابع" and row["country"] == "SA" and row["answers"] >= 3
    det = admin_client.get(f"/api/admin/students/{stu.id}").json()
    assert det["child"]["name"] == "رؤى" and det["totals"]["answers"] >= 3
    par = admin_client.get("/api/admin/parents").json()
    assert isinstance(par, list)                          # guardians list (may be empty in this test)


def test_skill_stats_and_reports(admin_client, db, h):
    stu, sk = _seed(db, h)
    stats = admin_client.get(f"/api/admin/skills/{sk.id}/stats").json()
    assert stats["skill"]["code"] == "g4PVM"
    assert any(q["attempts"] > 0 for q in stats["questions"])
    rep = admin_client.get("/api/admin/reports").json()
    assert "struggled" in rep and isinstance(rep["struggled"], list)


def test_admin_reads_write_nothing(admin_client, db, h):
    _seed(db, h)
    a0 = db.execute(select(func.count(Answer.id))).scalar_one()
    m0 = db.execute(select(func.count()).select_from(SkillMastery)).scalar_one()
    for p in ADMIN_READS:
        admin_client.get(p)
    assert db.execute(select(func.count(Answer.id))).scalar_one() == a0
    assert db.execute(select(func.count()).select_from(SkillMastery)).scalar_one() == m0
