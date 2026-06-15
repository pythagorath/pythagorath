"""PHASE 0 of the live-variation conversion — the GENERATION layer's machinery.

Proves, with a TEST-ONLY generator (production registers none in phase 0, so all
123 nodes still serve their fixed templates — the dual mode):
(1) full cycle: generate → serve (family-balanced instances) → grade against the
    server-held instance answer via the UNCHANGED gate → Answer logged on the
    TEMPLATE (families / distinct-items / fluency / reports read what they always
    read) → mastery recomputes;
(2) dual mode: nodes without generators serve fixed rows byte-identically;
(3) the two dimensions precede generation: an out-of-path request 403s and
    persists NO instances;
(4) instance security: one child, one answer (403 foreign / 409 repeat);
(5) the 500-sample harness: every registered generator is verified by an
    INDEPENDENT checker + range caps from the param space;
(6) the variation guard: ≥ VARIATION_THRESHOLD distinct draws in 50 for
    converted (generator-backed) nodes — the permanent fluency-honesty test.
"""
import random
from collections import Counter

import pytest
from sqlalchemy import select

from app import consent, generators
from app.gate import grade
from app.models import Answer, Question, QuestionInstance, Skill

# the permanent thresholds table: code → required distinct draws in 50.
# Computational generators owe ≥40 (owner-ratified); finite rule-families will
# declare their honest own values as they convert. Phase 0: the test node only.
VARIATION_THRESHOLD = {"g3ROUND": 40}


# ---------- the test-only generator (registered for ONE node, then removed) ----------

def _round_direct(rng: random.Random, params: dict):
    cap = params.get("cap", 1000)
    ref = rng.choice(params.get("refs", [10, 100]))
    n = rng.randrange(ref + 1, cap - ref)
    if n % ref == 0:
        n += rng.randrange(1, ref)
    ans = (n + ref // 2) // ref * ref
    label = {10: "عشرة", 100: "مئة"}[ref]
    return (f"قرِّب {gate_h(n)} إلى أقرب {label}.", gate_h(ans),
            {"kind": "number-line", "min": 0, "max": cap, "step": ref, "target": n})


def _round_inverse(rng: random.Random, params: dict):
    cap = params.get("cap", 1000)
    ref = rng.choice(params.get("refs", [10, 100]))
    target = rng.randrange(2, (cap // ref) - 1) * ref
    good = target + rng.choice([-1, 1]) * rng.randrange(1, ref // 2)
    bad = target + ref // 2 + rng.randrange(0, ref // 2)       # rounds UP past target
    label = {10: "عشرة", 100: "مئة"}[ref]
    opts = [gate_h(good), gate_h(bad)]
    rng.shuffle(opts)                                          # no position memorising
    return (f"أيُّ الأعداد يؤول إلى {gate_h(target)} عند تقريبه إلى أقرب {label}؟",
            gate_h(good), {"kind": "shape-pick", "options": [{"v": v} for v in opts]})


_HD = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")

def gate_h(n: int) -> str:
    return str(n).translate(_HD)


def _verify_round_direct(prompt: str, answer: str, visual: dict) -> bool:
    # INDEPENDENT checker: recompute from the visual payload, not the generator
    n, ref = visual["target"], visual["step"]
    expect = (n + ref // 2) // ref * ref
    return answer == gate_h(expect) and visual["min"] == 0 and n < visual["max"]


def _verify_round_inverse(prompt: str, answer: str, visual: dict) -> bool:
    import re
    t = prompt.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
    target = int(re.search(r"(\d+)", t).group(1))
    ref = 10 if "عشرة" in prompt else 100
    opts = [int(o["v"].translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")))
            for o in visual["options"]]
    good = int(answer.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")))
    rounds_to = lambda x: (x + ref // 2) // ref * ref == target
    return (good in opts and rounds_to(good)
            and all(not rounds_to(o) for o in opts if o != good))


VERIFIERS = {("g3ROUND", "rounding"): _verify_round_direct,
             ("g3ROUND", "inverse"): _verify_round_inverse}


@pytest.fixture()
def live_round_node():
    # SWAP in the test generators, then RESTORE the production ones (m3 converted
    # the whole inventory — popping would destroy g3ROUND for later tests)
    saved = generators.REGISTRY.get("g3ROUND")
    generators.REGISTRY["g3ROUND"] = {"rounding": _round_direct, "inverse": _round_inverse}
    try:
        yield
    finally:
        if saved is not None:
            generators.REGISTRY["g3ROUND"] = saved
        else:
            generators.REGISTRY.pop("g3ROUND", None)


@pytest.fixture()
def dual_mode_node():
    # the whole inventory now generates — dual mode is the FALLBACK mechanism, so
    # prove it by temporarily de-registering one node's generators
    saved = generators.REGISTRY.pop("g3ADD3", None)
    try:
        yield
    finally:
        if saved is not None:
            generators.REGISTRY["g3ADD3"] = saved


def _grade_id(client, order):
    return [g["id"] for g in client.get("/api/grades").json() if g["order"] == order][0]


def _child(client, country="QA", order=3, name="طفل"):
    return client.post("/api/students", json={
        "name": name, "consent_version": consent.CURRENT_VERSION,
        "grade_id": _grade_id(client, order), "country": country}).json()


# ---------- (1) the full cycle ----------

def test_full_cycle_generate_serve_grade_log(guardian_client, db, live_round_node):
    sid = _child(guardian_client)["id"]
    skill = db.execute(select(Skill).where(Skill.code == "g3ROUND")).scalars().one()
    qs = guardian_client.get(f"/api/students/{sid}/skills/{skill.id}/questions").json()
    # a family-balanced batch of INSTANCES (both registered families, 8 items)
    assert len(qs) == 8 and all(q["instance_id"] for q in qs)
    fams = Counter(q["family"] for q in qs)
    assert set(fams) == {"rounding", "inverse"} and all(n == 4 for n in fams.values())
    # every instance is persisted with a server-held answer
    inst = db.get(QuestionInstance, qs[0]["instance_id"])
    assert inst.student_id == sid and inst.answered is False
    # answer the first one CORRECTLY (we know the truth only via the server row)
    r = guardian_client.post("/api/answers", json={
        "student_id": sid, "instance_id": inst.id, "answer": inst.answer,
        "elapsed_ms": 1500})
    assert r.status_code == 200 and r.json()["is_correct"] is True
    # the Answer log keys to the TEMPLATE (the learning layer reads it unchanged)
    db.expire_all()
    logged = db.execute(select(Answer).where(Answer.student_id == sid)).scalars().all()
    assert len(logged) == 1 and logged[0].question_id == inst.question_id
    tmpl = db.get(Question, inst.question_id)
    assert tmpl.skill_id == skill.id and tmpl.family == inst.family
    assert db.get(QuestionInstance, inst.id).answered is True
    # a WRONG answer grades false through the same gate
    other = db.get(QuestionInstance, qs[1]["instance_id"])
    r2 = guardian_client.post("/api/answers", json={
        "student_id": sid, "instance_id": other.id, "answer": "٠", "elapsed_ms": 900})
    assert r2.status_code == 200 and r2.json()["is_correct"] is False


def test_instances_vary_between_batches(guardian_client, db, live_round_node):
    sid = _child(guardian_client, name="ت")["id"]
    skill = db.execute(select(Skill).where(Skill.code == "g3ROUND")).scalars().one()
    a = guardian_client.get(f"/api/students/{sid}/skills/{skill.id}/questions").json()
    b = guardian_client.get(f"/api/students/{sid}/skills/{skill.id}/questions").json()
    sigs = lambda batch: {(q["prompt"], q["family"]) for q in batch}
    # two consecutive batches share almost nothing (recent-signature avoidance)
    assert len(sigs(a) & sigs(b)) <= 2


# ---------- (2) dual mode ----------

def test_dual_mode_unconverted_nodes_serve_fixed_rows(guardian_client, db, live_round_node,
                                                      dual_mode_node):
    sid = _child(guardian_client, name="د")["id"]
    skill = db.execute(select(Skill).where(Skill.code == "g3ADD3")).scalars().one()
    qs = guardian_client.get(f"/api/students/{sid}/skills/{skill.id}/questions").json()
    assert len(qs) == 8 and all(q["instance_id"] is None for q in qs)
    fixed_ids = db.execute(select(Question.id).where(
        Question.skill_id == skill.id, Question.status == "published")).scalars().all()
    assert [q["id"] for q in qs] == sorted(fixed_ids)        # byte-identical serving
    # and answering them still works by question_id (the legacy path)
    r = guardian_client.post("/api/answers", json={
        "student_id": sid, "question_id": qs[0]["id"],
        "answer": db.get(Question, qs[0]["id"]).answer, "elapsed_ms": 1200})
    assert r.status_code == 200 and r.json()["is_correct"] is True


# ---------- (3) dimensions precede generation ----------

def test_path_check_precedes_generation(guardian_client, db, live_round_node):
    om = _child(guardian_client, country="OM", name="ع")["id"]   # OM owns g3ROUND
    g2 = _child(guardian_client, country="QA", order=2, name="ث")["id"]  # wrong GRADE
    skill = db.execute(select(Skill).where(Skill.code == "g3ROUND")).scalars().one()
    before = db.execute(select(QuestionInstance)).scalars().all()
    r = guardian_client.get(f"/api/students/{g2}/skills/{skill.id}/questions")
    assert r.status_code == 403 and r.json()["detail"]["reason"] == "path"
    db.expire_all()
    after = db.execute(select(QuestionInstance)).scalars().all()
    assert len(after) == len(before)                          # NO instance persisted
    # the in-path child generates fine
    ok = guardian_client.get(f"/api/students/{om}/skills/{skill.id}/questions")
    assert ok.status_code == 200 and all(q["instance_id"] for q in ok.json())


# ---------- (4) instance security ----------

def test_instance_belongs_to_one_child_once(guardian_client, db, live_round_node):
    a = _child(guardian_client, name="أ")["id"]
    b = _child(guardian_client, name="ب")["id"]
    skill = db.execute(select(Skill).where(Skill.code == "g3ROUND")).scalars().one()
    qs = guardian_client.get(f"/api/students/{a}/skills/{skill.id}/questions").json()
    iid = qs[0]["instance_id"]
    ans = db.get(QuestionInstance, iid).answer
    # another child may not answer it
    r = guardian_client.post("/api/answers", json={
        "student_id": b, "instance_id": iid, "answer": ans})
    assert r.status_code == 403
    # the owner answers once — a second submit conflicts
    assert guardian_client.post("/api/answers", json={
        "student_id": a, "instance_id": iid, "answer": ans}).status_code == 200
    r2 = guardian_client.post("/api/answers", json={
        "student_id": a, "instance_id": iid, "answer": ans})
    assert r2.status_code == 409
    # and exactly one of question_id/instance_id must be sent
    assert guardian_client.post("/api/answers", json={
        "student_id": a, "answer": "١"}).status_code == 422
    assert guardian_client.post("/api/answers", json={
        "student_id": a, "question_id": 1, "instance_id": iid,
        "answer": "١"}).status_code == 422


# ---------- (5) the 500-sample harness: independent verifier + range caps ----------

def test_500_samples_verify_and_stay_in_range(live_round_node):
    # scoped to THIS file's test-only node — the production generators (m1+) have
    # their own verifier suites (tests/test_m1_generators.py etc.)
    rng = random.Random(7)
    for (code, family), gen in (
        (("g3ROUND", f), fn) for f, fn in generators.REGISTRY["g3ROUND"].items()
    ):
        verifier = VERIFIERS[(code, family)]
        params = {"cap": 1000, "refs": [10, 100]}
        for _ in range(500):
            prompt, answer, visual = gen(rng, params)
            assert verifier(prompt, answer, visual), (code, family, prompt, answer)
            nums = [int(s) for s in
                    prompt.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")).split()
                    if s.isdigit()]
            assert all(n <= params["cap"] for n in nums), (code, family, prompt)


# ---------- (6) the variation guard (permanent) ----------

def test_variation_guard_distinct_draws(live_round_node):
    rng = random.Random(11)
    for code, threshold in VARIATION_THRESHOLD.items():
        fams = generators.REGISTRY.get(code)
        if not fams:
            continue                      # not yet converted — guarded once it is
        draws = set()
        fam_list = list(fams)
        for i in range(50):
            fn = fams[fam_list[i % len(fam_list)]]
            prompt, answer, _ = fn(rng, {"cap": 1000, "refs": [10, 100]})
            draws.add((prompt, answer))
        assert len(draws) >= threshold, (code, len(draws))
