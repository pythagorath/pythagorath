"""Measurement strand (batch 5) — 3 nodes, 3 new isolated widgets.

Proves the strict-review split BY ACT: length/mass/capacity collapse into ONE node (three
families); time (decode a dial) and money (arithmetic) are SEPARATE nodes; money DEPENDS on
addition (D1) while Q1/Q2 are independent bases; the Oman-only path; the widgets are isolated
(gate grades the emitted STRING); Q1 is three-family, Q3 two-family, Q2 generalisation.
"""
from sqlalchemy import select

from app import consent, gate
from app.models import Answer, Question, Skill, Student

Q = {"Q1", "Q2", "Q3"}


def _child(client, country=None):
    body = {"name": "ط", "consent_version": consent.CURRENT_VERSION,
            "grade_id": [g["id"] for g in client.get("/api/grades").json() if g["order"] == 2][0]}
    if country:
        body["country"] = country
    return client.post("/api/students", json=body).json()


def _map(client, sid):
    return {e["code"]: e for e in client.get(f"/api/students/{sid}/skillmap").json()}


# ---------- path: S1 (Oman) + S2 extends Q1/Q2/Q3 to the second-semester curricula ----------
def test_measurement_paths_s1_and_s2(guardian_client):
    def m(c): return set(_map(guardian_client, _child(guardian_client, c)["id"]))
    for c in ("OM", "SA", "BH", "KW", "QA", "AE"):
        assert "Q1" in m(c)                          # Q1 (length/capacity/mass) — all six in S2
    for c in ("OM", "SA", "BH", "AE", "KW"):
        assert {"Q2", "Q3"} <= m(c)                   # clock + money: Oman + four S2 curricula
    assert {"Q2", "Q3"}.isdisjoint(m("QA"))           # Qatar S2 has no time/money unit


# ---------- Q1/Q2 independent bases; Q3 (money) depends on addition D1 ----------
def test_q1_q2_independent_q3_depends_on_addition(guardian_client):
    m = _map(guardian_client, _child(guardian_client, "OM")["id"])
    assert m["Q1"]["prerequisites"] == [] and m["Q1"]["unlocked"] is True
    assert m["Q2"]["prerequisites"] == [] and m["Q2"]["unlocked"] is True
    # money is an arithmetic act → rooted in D1 (not an independent base)
    assert [p["id"] for p in m["Q3"]["prerequisites"]] == [m["D1"]["id"]]
    assert m["Q3"]["unlocked"] is False           # locked until D1 mastered


# ---------- length/mass/capacity are ONE node with THREE real families ----------
def test_q1_three_families_length_mass_capacity(db):
    q1 = db.execute(select(Skill).where(Skill.code == "Q1")).scalars().first()
    fams = {qq.family for qq in db.execute(
        select(Question).where(Question.skill_id == q1.id)).scalars()}
    assert fams == {"طول", "كتلة", "سعة"}
    assert gate.families_total(db, q1.id) == 3
    # passing any two distinct families reaches understanding (families gate)
    qs = db.execute(select(Question).where(Question.skill_id == q1.id)).scalars().all()
    stu = Student(name="ق"); db.add(stu); db.flush()
    seen = []
    for qq in qs:
        if qq.family not in [f for f, _ in seen]:
            seen.append((qq.family, qq))
        if len(seen) == 2:
            break
    for _, qq in seen:
        db.add(Answer(student_id=stu.id, question_id=qq.id, is_correct=True))
    db.flush()
    u = gate.understanding_state(db, stu.id, q1.id)
    assert u["mode"] == "families" and u["progress"] >= 2


def test_q3_money_two_families_q2_clock_generalization(db):
    q3 = db.execute(select(Skill).where(Skill.code == "Q3")).scalars().first()
    assert {qq.family for qq in db.execute(
        select(Question).where(Question.skill_id == q3.id)).scalars()} == {"تعرّف", "إجمالي"}
    assert gate.families_total(db, q3.id) == 2
    q2 = db.execute(select(Skill).where(Skill.code == "Q2")).scalars().first()
    assert gate.families_total(db, q2.id) == 1          # single family «قراءة» → generalisation


# ---------- the three widgets are isolated: gate grades the emitted string ----------
def test_measure_clock_money_emit_graded_strings(db):
    q1 = db.execute(select(Skill).where(Skill.code == "Q1")).scalars().first()
    ruler = db.execute(select(Question).where(
        Question.skill_id == q1.id, Question.family == "طول", Question.answer == "٦")).scalars().first()
    assert ruler.visual["kind"] == "measure" and ruler.visual["mode"] == "ruler"
    assert gate.grade(ruler, 6) is True and gate.grade(ruler, 5) is False

    q2 = db.execute(select(Skill).where(Skill.code == "Q2")).scalars().first()
    clock = db.execute(select(Question).where(Question.skill_id == q2.id)).scalars().first()
    assert clock.visual["kind"] == "clock"
    assert gate.grade(clock, clock.answer) is True
    assert gate.grade(clock, "الواحدة تماماً") is False

    q3 = db.execute(select(Skill).where(Skill.code == "Q3")).scalars().first()
    total = db.execute(select(Question).where(
        Question.skill_id == q3.id, Question.answer == "٢٠")).scalars().first()
    assert total.visual["kind"] == "money" and total.visual["mode"] == "total"
    assert gate.grade(total, 20) is True and gate.grade(total, 15) is False
