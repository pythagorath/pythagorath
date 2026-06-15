"""Pins the placement diagnostic (compressed understanding, in-memory, no leak)
AND its country-scoping: a child is probed/placed only WITHIN their country path."""
from collections import Counter

from sqlalchemy import select

from app import diagnostic, gate
from app.main import _path_skills
from app.models import Question, Skill, SkillMastery


def _all_skills(db):
    return db.execute(select(Skill)).scalars().all()


def test_probes_two_per_node(db, h):
    # NULL-country child sees the whole inventory → every node probed (the pinned invariant).
    skills = _path_skills(db, h.student(db))          # NULL country → all skills
    probes = diagnostic.get_probes(db, skills)
    per_skill = Counter(p["skill_id"] for p in probes)
    assert len(per_skill) == 66          # 56 (S1) + 3 (b1) + 3 (b2) + 4 (b3)
    assert all(n == 2 for n in per_skill.values())   # the invariant: exactly two probes/node
    assert all("answer" not in p for p in probes)   # answers never sent


def test_place_marks_node_understood(db, h):
    stu = h.student(db)
    skills = _path_skills(db, stu)
    probes = diagnostic.get_probes(db, skills)
    b3 = h.skill(db, "B3")
    ans = {q.id: q.answer for q in h.questions(db, b3.id)}
    answers = [
        {"question_id": p["question_id"], "answer": ans[p["question_id"]]}
        for p in probes if p["skill_id"] == b3.id
    ]
    res = diagnostic.place(db, stu.id, answers, skills)
    assert "B3" in res["understood_codes"]
    sm = db.get(SkillMastery, (stu.id, b3.id))
    assert sm.status == "understood"
    # probes must NOT leak into the answer log (placement is understanding, not practice)
    assert sm.understood_answer_id == 0


def test_place_placement_is_first_open_node(db, h):
    stu = h.student(db)
    skills = _path_skills(db, stu)
    res = diagnostic.place(db, stu.id, [], skills)   # nothing passed
    assert res["placement"]["code"] == "E1"          # first by order, no prerequisites


# ---- country scoping (the fix): probes + placement stay inside the child's path ----

def test_probes_respect_country_path(db, h):
    """A Qatar child is probed ONLY on Qatar's path — never an out-of-path node."""
    stu = h.student(db, country="QA")
    skills = _path_skills(db, stu)
    probes = diagnostic.get_probes(db, skills)
    probe_sids = {p["skill_id"] for p in probes}
    path_ids = {s.id for s in skills}
    all_ids = {s.id for s in _all_skills(db)}
    out_of_path = all_ids - path_ids
    assert probe_sids == path_ids            # exactly the path nodes are probed
    assert len(path_ids) < len(all_ids)      # QA is a STRICT subset (country-scoped)
    assert out_of_path                       # QA genuinely lacks some inventory nodes
    assert not (out_of_path & probe_sids)    # none of them are ever probed


def test_place_respects_country_path(db, h):
    """Placement lands inside the path; understood marks (and DB state) stay in-path,
    even when every path probe is answered correctly."""
    stu = h.student(db, country="QA")
    skills = _path_skills(db, stu)
    path_ids = {s.id for s in skills}
    path_codes = {s.code for s in skills}
    all_ids = {s.id for s in _all_skills(db)}

    # empty submission → first open node, must be IN the path
    res = diagnostic.place(db, stu.id, [], skills)
    assert res["placement"]["skill_id"] in path_ids

    # answer ALL path probes correctly → every understood code is in-path…
    probes = diagnostic.get_probes(db, skills)
    answers = [
        {"question_id": p["question_id"], "answer": db.get(Question, p["question_id"]).answer}
        for p in probes
    ]
    res2 = diagnostic.place(db, stu.id, answers, skills)
    assert set(res2["understood_codes"]) <= path_codes
    # …and NO out-of-path node ever got a mastery row written
    for sid in (all_ids - path_ids):
        assert db.get(SkillMastery, (stu.id, sid)) is None
