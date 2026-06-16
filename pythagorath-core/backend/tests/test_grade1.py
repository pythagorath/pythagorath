"""GRADE 1 — batches 1–2: the numeric spine + bonds/relation, with DIFFERENTIATED paths.

Proves: (1) both grades seeded; (2) the G1 unit holds the six nodes, 8 published
questions each, with the decided family structure (families = distinct mental ACTS;
vertical/zero are CASES inside symbolic; fact-triangle/broken-machine are display
CASES); (3) country paths now DIFFER inside G1 — Saudi has BOND but no REL, Bahrain
has REL but no BOND, the other four have both; (4) DIMENSION ISOLATION — a G1 child
sees only g1* (none of G2's 66) and vice versa, cross-grade access refuses with the
structural path 403; (5) the G1 diagnostic probes exactly the child's G1 path.
"""
from collections import Counter

from sqlalchemy import select

from app import consent
from app.models import Grade, Question, Skill, SkillCountry, SkillPrerequisite, Unit

G1_SPINE = {"g1N10", "g1N20", "g1ADD", "g1SUB"}
G1_STRATEGIES = {"g1ADDSTR", "g1SUBSTR"}          # batch 3 — all six countries
G1_STRUCT = {"g1PV", "g1N100", "g1SKIP"}          # batch 4 — all six (Oman settled from body text)
G1_ALL6 = G1_SPINE | G1_STRATEGIES | G1_STRUCT
G1_TWODIGIT = {"g1TENS", "g1DIG2"}                # batch 5 — four owners (no Saudi/Oman)
G1_FRAC_FIVE = {"g1HALF", "g1QRT"}                # batch 7 — Oman: halves only
G1_GEO = {"g1SHP3", "g1SHP2"}                     # batch 8 — both all six (KW settled from body)
G1_MEAS4 = {"g1MASS", "g1CAP"}                    # batch 9 — four owners (no Qatar/UAE)
G1_FINAL = {"g1CLK", "g1HALFH", "g1CAL", "g1DATA", "g1PICT", "g1MONEY"}   # batch 10
G1_CODES = (G1_ALL6 | G1_TWODIGIT | G1_GEO | G1_MEAS4 | G1_FINAL | {"g1LEN", "g1AREA"}
            | {"g1BOND", "g1REL", "g1EVEN", "g1EST", "g1ORDINAL", "g1N120",
               "g1REGR", "g1ESTR", "g1POS", "g1CLS", "g1CMPQ", "g1PAT",
               "g1HALF", "g1QRT", "g1FRSET"})

# nodes that are DECLARED single-family (the constitutional generalisation path)
G1_SINGLE_FAMILY = {"g1CMPQ", "g1AREA"}

# per-country G1 paths (the curriculum map, encoded once)
G1_PATH = {
    "SA": G1_ALL6 | G1_GEO | {"g1LEN"} | G1_MEAS4 | G1_FRAC_FIVE | {"g1BOND", "g1EST", "g1ORDINAL",
                                    "g1POS", "g1CLS", "g1CMPQ", "g1PAT", "g1MONEY"},            # 24
    "BH": G1_ALL6 | G1_GEO | {"g1LEN", "g1AREA"} | G1_MEAS4 | G1_TWODIGIT | G1_FRAC_FIVE | {"g1REL", "g1EVEN", "g1EST", "g1ESTR",
                                                  "g1CLS", "g1CMPQ", "g1PAT", "g1FRSET", "g1CLK", "g1CAL", "g1MONEY"},  # 30
    "AE": G1_ALL6 | G1_GEO | {"g1LEN"} | G1_TWODIGIT | G1_FRAC_FIVE | {"g1BOND", "g1REL", "g1ORDINAL",
                                                  "g1N120", "g1REGR", "g1CLK", "g1HALFH", "g1DATA", "g1PICT"},  # 25 — لا ما-قبل-عدد
    "QA": G1_ALL6 | G1_GEO | {"g1LEN"} | G1_TWODIGIT | G1_FRAC_FIVE | {"g1BOND", "g1REL", "g1ORDINAL", "g1POS", "g1CLK", "g1HALFH", "g1DATA", "g1PICT"},  # 24
    "KW": G1_ALL6 | G1_GEO | {"g1LEN"} | G1_MEAS4 | G1_TWODIGIT | G1_FRAC_FIVE | {"g1BOND", "g1REL", "g1EST",
                                                  "g1POS", "g1CLS", "g1CMPQ", "g1PAT", "g1CLK", "g1CAL", "g1DATA", "g1MONEY"},      # 29
    "OM": G1_ALL6 | G1_GEO | {"g1LEN"} | G1_MEAS4 | {"g1BOND", "g1REL", "g1EVEN", "g1EST", "g1CLS", "g1PAT",
                     "g1HALF", "g1CLK", "g1CAL", "g1DATA", "g1PICT", "g1MONEY"},     # 26 — أنصاف فقط
}


def _grade_id(client, order):
    return [g["id"] for g in client.get("/api/grades").json() if g["order"] == order][0]


def _child(client, country=None, order=1, name="طفل"):
    payload = {"name": name, "consent_version": consent.CURRENT_VERSION,
               "grade_id": _grade_id(client, order)}
    if country:
        payload["country"] = country
    return client.post("/api/students", json=payload).json()


def _map_codes(client, sid):
    return {e["code"] for e in client.get(f"/api/students/{sid}/skillmap").json()}


def _g1_skills(db):
    g1 = db.execute(select(Grade).where(Grade.name == "الصف الأول")).scalars().one()
    units = db.execute(select(Unit).where(Unit.grade_id == g1.id)).scalars().all()
    skills = [s for u in units for s in
              db.execute(select(Skill).where(Skill.unit_id == u.id)).scalars().all()]
    return g1, units, skills


def test_both_grades_seeded(guardian_client):
    grades = {g["name"]: g["order"] for g in guardian_client.get("/api/grades").json()}
    assert grades["الصف الأول"] == 1
    assert grades["الصف الثاني"] == 2


def test_g1_unit_nodes_and_content(db):
    _, units, skills = _g1_skills(db)
    assert [u.name for u in units] == ["الحساب"]
    assert {s.code for s in skills} == G1_CODES
    for s in skills:
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        assert len(qs) == 8 and all(q.status == "published" for q in qs)


def test_g1_families_are_distinct_acts(db):
    _, _, skills = _g1_skills(db)
    fams = {}
    for s in skills:
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        fams[s.code] = Counter(q.family for q in qs)
    # N10: counting/representing, encoding, comparing
    assert set(fams["g1N10"]) == {"aggregative", "symbolic", "comparative"}
    # N20: counting beyond ten, placing in the sequence
    assert set(fams["g1N20"]) == {"aggregative", "sequential"}
    # ADD: two acts ONLY — vertical/zero are cases inside symbolic, never their own family
    assert set(fams["g1ADD"]) == {"aggregative", "symbolic"}
    # SUB: removal, encoding, part-whole (the Saudi table act)
    assert set(fams["g1SUB"]) == {"aggregative", "symbolic", "decompositional"}
    # BOND: production ↔ completion (the C1/Fr1 narrow-decoupling pattern)
    assert set(fams["g1BOND"]) == {"aggregative", "decompositional"}
    # REL: flip a fact / build the family / solve the unknown — three acts
    assert set(fams["g1REL"]) == {"inverse", "family", "missing"}
    # strategies: the four distinct mental acts, two questions each (the gate's heart)
    assert set(fams["g1ADDSTR"]) == {"counting", "bridging", "derived", "property"}
    assert set(fams["g1SUBSTR"]) == {"counting", "bridging", "derived", "inverse"}
    for code in ("g1ADDSTR", "g1SUBSTR"):
        assert all(n == 2 for n in fams[code].values())      # exactly 2 per family
    # batch 4 — number structure
    assert set(fams["g1PV"]) == {"aggregative", "decompositional"}
    assert set(fams["g1N100"]) == {"sequential", "comparative"}
    assert set(fams["g1SKIP"]) == {"sequential", "aggregative"}
    assert set(fams["g1EVEN"]) == {"pairing", "rule"}
    assert set(fams["g1EST"]) == {"estimation", "reasonableness"}
    assert set(fams["g1ORDINAL"]) == {"identify", "name"}
    assert set(fams["g1N120"]) == {"sequential", "symbolic"}
    # batch 5 — the two-digit cluster
    assert set(fams["g1TENS"]) == {"aggregative", "decompositional"}
    assert set(fams["g1DIG2"]) == {"aggregative", "decompositional"}
    assert set(fams["g1REGR"]) == {"aggregative", "decompositional"}
    assert set(fams["g1ESTR"]) == {"rounding", "plausibility"}
    # batch 6 — pre-number
    assert set(fams["g1POS"]) == {"axis", "topology"}
    assert set(fams["g1CLS"]) == {"sorting", "rule"}
    assert set(fams["g1CMPQ"]) == {"comparative"}        # DECLARED single (E1/E2 path)
    assert set(fams["g1PAT"]) == {"extend", "structure", "symmetry"}
    # batch 7 — fractions: the Fr1 template (+ the judge act); thirds are CASES not families
    assert set(fams["g1HALF"]) == {"judge", "name", "shade"}
    assert set(fams["g1QRT"]) == {"name", "shade"}          # NO thirds family — cases inside
    assert set(fams["g1FRSET"]) == {"express", "take"}
    # batch 8 — geometry
    assert set(fams["g1SHP3"]) == {"recognize", "classify", "compose"}
    assert set(fams["g1SHP2"]) == {"recognize", "elements", "compose"}
    # batch 10 — time/data/money
    assert set(fams["g1CLK"]) == {"dial", "digital"}
    assert set(fams["g1HALFH"]) == {"dial", "digital"}
    assert set(fams["g1CAL"]) == {"sequence", "calendar"}
    assert set(fams["g1DATA"]) == {"organize", "read"}
    assert set(fams["g1PICT"]) == {"read", "build"}       # bars are AE-tagged CASES inside
    assert set(fams["g1MONEY"]) == {"identify", "count"}
    # batch 9 — measurement: direct comparison ↔ unit measuring (settled from sources)
    for code in ("g1LEN", "g1MASS", "g1CAP"):
        assert set(fams[code]) == {"compare", "measure"}, code
    assert set(fams["g1AREA"]) == {"coverage"}           # DECLARED single (CMPQ/E1 path)
    assert sum(fams["g1AREA"].values()) == 8
    assert all(len(c) >= 2 for code, c in fams.items() if code not in G1_SINGLE_FAMILY)
    # the declared single still has enough items for the generalisation gate
    assert sum(fams["g1CMPQ"].values()) == 8


def test_g1_regr_keeps_the_source_range(db):
    # REGR = the UAE u6-L5 act (٨+١٣، ١٥+٥): two-digit + SMALL addend crossing a ten.
    # The heavy ٤٧+٣٨ carry is G2-A1 behaviour — it must never leak down.
    _, _, skills = _g1_skills(db)
    regr = next(s for s in skills if s.code == "g1REGR")
    qs = db.execute(select(Question).where(Question.skill_id == regr.id)).scalars().all()
    assert len(qs) == 8
    import json
    for q in qs:
        v = q.visual if isinstance(q.visual, dict) else (json.loads(q.visual) if q.visual else None)
        assert v is not None
        if v["kind"] == "base-ten-blocks":
            a, b = v["start"], v["add"]
        else:
            a, b = v["a"], v["b"]
        assert (a % 10) + (b % 10) >= 10            # genuinely crosses a ten (real carry)
        assert min(a, b) <= 13 and a + b <= 35      # the SOURCE range — no G2-A1 heavy carry


def test_g1_countries_and_edges(db):
    _, _, skills = _g1_skills(db)
    by_code = {s.code: s for s in skills}
    expected = {
        **{c: ["AE", "BH", "KW", "OM", "QA", "SA"] for c in G1_ALL6},
        "g1BOND": ["AE", "KW", "OM", "QA", "SA"],   # Bahrain: ten-making is an ADDSTR strategy only
        "g1REL": ["AE", "BH", "KW", "OM", "QA"],    # Saudi G1: no fact families
        "g1EVEN": ["BH", "OM"],                     # even/odd: Oman (S1×3) + Bahrain (11-13)
        "g1EST": ["BH", "KW", "OM", "SA"],          # estimation: no Qatar/UAE
        "g1ORDINAL": ["AE", "QA", "SA"],            # ordinals: QA 1-7, SA ch4, AE u5-L1
        "g1N120": ["AE"],                           # range is a scope — UAE alone (vol 4)
        "g1TENS": ["AE", "BH", "KW", "QA"],         # two-digit cluster: no Saudi/Oman
        "g1DIG2": ["AE", "BH", "KW", "QA"],
        "g1REGR": ["AE"],                           # the early carry — UAE u6-L5 alone
        "g1ESTR": ["BH"],                           # result estimation — Bahrain alone
        "g1POS": ["KW", "QA", "SA"],                # pre-number: no UAE anywhere here
        "g1CLS": ["BH", "KW", "OM", "SA"],
        "g1CMPQ": ["BH", "KW", "SA"],               # settled from the body texts (no OM/QA)
        "g1PAT": ["BH", "KW", "OM", "SA"],
        "g1HALF": ["AE", "BH", "KW", "OM", "QA", "SA"],   # equal-parts everywhere
        "g1QRT": ["AE", "BH", "KW", "QA", "SA"],    # Oman stops at halves
        "g1FRSET": ["BH"],                          # the set model — Bahrain alone
        "g1SHP3": ["AE", "BH", "KW", "OM", "QA", "SA"],
        "g1SHP2": ["AE", "BH", "KW", "OM", "QA", "SA"],   # KW settled from body (7-9)
        "g1LEN": ["AE", "BH", "KW", "OM", "QA", "SA"],
        "g1MASS": ["BH", "KW", "OM", "SA"],         # Qatar/UAE: no weight in G1
        "g1CAP": ["BH", "KW", "OM", "SA"],
        "g1AREA": ["BH"],                           # coverage comparison — below G2-Q4
        "g1CLK": ["AE", "BH", "KW", "OM", "QA"],    # Saudi G1: no clock
        "g1HALFH": ["AE", "QA"],                    # settled from body: BH full hours only
        "g1CAL": ["BH", "KW", "OM"],
        "g1DATA": ["AE", "KW", "OM", "QA"],
        "g1PICT": ["AE", "OM", "QA"],
        "g1MONEY": ["BH", "KW", "OM", "SA"],        # no Qatar; AE fils = counting props
    }
    for code, want in expected.items():
        countries = db.execute(
            select(SkillCountry.country).where(SkillCountry.skill_id == by_code[code].id)
        ).scalars().all()
        assert sorted(countries) == want, code
    def prereqs(code):
        return set(db.execute(select(SkillPrerequisite.prerequisite_skill_id).where(
            SkillPrerequisite.skill_id == by_code[code].id)).scalars().all())
    for code in ("g1N20", "g1ADD", "g1SUB", "g1BOND"):
        assert prereqs(code) == {by_code["g1N10"].id}, code
    assert prereqs("g1REL") == {by_code["g1ADD"].id, by_code["g1SUB"].id}
    # strategies: range + operation concept — and NEVER BOND (the ratified dropped edge)
    assert prereqs("g1ADDSTR") == {by_code["g1N20"].id, by_code["g1ADD"].id}
    assert prereqs("g1SUBSTR") == {by_code["g1N20"].id, by_code["g1SUB"].id}
    # batch 4 — siblings under N20 (no PV↔N100 edge: either direction locks a country)
    for code in ("g1PV", "g1N100", "g1SKIP", "g1EVEN"):
        assert prereqs(code) == {by_code["g1N20"].id}, code
    for code in ("g1EST", "g1ORDINAL"):
        assert prereqs(code) == {by_code["g1N10"].id}, code
    assert prereqs("g1N120") == {by_code["g1N100"].id}
    # batch 5 — the two-digit chain
    assert prereqs("g1TENS") == {by_code["g1PV"].id, by_code["g1ADD"].id, by_code["g1SUB"].id}
    assert prereqs("g1DIG2") == {by_code["g1TENS"].id}
    assert prereqs("g1REGR") == {by_code["g1DIG2"].id}
    assert prereqs("g1ESTR") == {by_code["g1DIG2"].id}
    # batch 6/7 — pre-number nodes and HALF are DAG roots (they precede number)
    for code in ("g1POS", "g1CLS", "g1CMPQ", "g1PAT", "g1HALF", "g1SHP3", "g1SHP2", "g1N10"):  # AREA asserted below
        assert prereqs(code) == set(), code
    # batch 7 — fractions chain
    assert prereqs("g1QRT") == {by_code["g1HALF"].id}
    assert prereqs("g1FRSET") == {by_code["g1HALF"].id, by_code["g1N10"].id}
    # batch 9 — measuring counts units → N10; AREA is a perceptual root
    for code in ("g1LEN", "g1MASS", "g1CAP"):
        assert prereqs(code) == {by_code["g1N10"].id}, code
    assert prereqs("g1AREA") == set()
    # batch 10 — time/data/money chains
    for code in ("g1CLK", "g1CAL"):
        assert prereqs(code) == {by_code["g1N20"].id}, code
    assert prereqs("g1HALFH") == {by_code["g1CLK"].id}
    for code in ("g1DATA", "g1MONEY"):
        assert prereqs(code) == {by_code["g1N10"].id}, code
    assert prereqs("g1PICT") == {by_code["g1DATA"].id}


def test_g1_paths_differentiate_by_country(guardian_client):
    # every country sees EXACTLY its curriculum-map path (12/12/13/12/12/13)
    for cc, want in G1_PATH.items():
        sid = _child(guardian_client, country=cc, order=1, name=cc)["id"]
        assert _map_codes(guardian_client, sid) == want, cc
    # the headline differentiators, stated explicitly
    assert "g1N120" not in G1_PATH["QA"] and "g1N120" in G1_PATH["AE"]   # range is a scope
    assert "g1REL" not in G1_PATH["SA"] and "g1BOND" not in G1_PATH["BH"]
    assert "g1EVEN" == ("g1EVEN" if "g1EVEN" in G1_PATH["OM"] else None)


def test_g1_lock_states_follow_edges(guardian_client):
    sid = _child(guardian_client, country="QA", order=1)["id"]
    entries = {e["code"]: e for e in
               guardian_client.get(f"/api/students/{sid}/skillmap").json()}
    # roots open from day one: N10, the pre-number nodes and HALF in the path
    roots = {"g1N10", "g1POS", "g1CLS", "g1CMPQ", "g1PAT", "g1HALF", "g1SHP3", "g1SHP2", "g1AREA"} & G1_PATH["QA"]
    for code in roots:
        assert entries[code]["unlocked"] is True, code
    for code in sorted(G1_PATH["QA"] - roots):
        assert entries[code]["unlocked"] is False, code
    # REL hangs on BOTH operations, structurally
    rel_prereqs = {p["name"] for p in entries["g1REL"]["prerequisites"]}
    assert rel_prereqs == {"مفهوم الجمع ضمن ١٠", "مفهوم الطرح ضمن ١٠"}
    # strategies hang on range + concept — and never on BOND (the ratified dropped edge)
    addstr_prereqs = {p["name"] for p in entries["g1ADDSTR"]["prerequisites"]}
    assert addstr_prereqs == {"الأعداد من ١١ إلى ٢٠ وموضعتها", "مفهوم الجمع ضمن ١٠"}
    substr_prereqs = {p["name"] for p in entries["g1SUBSTR"]["prerequisites"]}
    assert substr_prereqs == {"الأعداد من ١١ إلى ٢٠ وموضعتها", "مفهوم الطرح ضمن ١٠"}


def test_g2_child_unchanged_66(guardian_client):
    sid = _child(guardian_client, order=2)["id"]             # NULL country → whole G2
    codes = _map_codes(guardian_client, sid)
    assert len(codes) == 66                                  # the pinned G2 invariant holds
    assert not (codes & G1_CODES)


def test_cross_grade_descent_allowed_ascent_blocked(guardian_client, db):
    """A G2 child may DESCEND to a cross-grade ANCESTOR in G1 (g1PV ← C1) for remediation
    — not a path block. A G1 child can never ASCEND to a G2 node (G1 is the floor)."""
    def cid(c):
        return db.execute(select(Skill).where(Skill.code == c)).scalars().one().id
    def reason(sid, skid):
        r = guardian_client.get(f"/api/students/{sid}/skills/{skid}/questions")
        return None if r.status_code == 200 else r.json().get("detail", {}).get("reason")
    g1 = _child(guardian_client, country="SA", order=1, name="أ")["id"]
    g2 = _child(guardian_client, country="SA", order=2, name="ب")["id"]
    assert reason(g2, cid("g1PV")) != "path"        # DESCENT: g1PV (g1) founds C1 (a g2 node)
    assert reason(g1, cid("C1")) == "path"          # ASCENT blocked: g1 child can't reach g2


def test_g1_diagnostic_probes_follow_the_path(guardian_client, db):
    # QA child: exactly its path — two probes each
    qa = _child(guardian_client, country="QA", order=1)["id"]
    probes = guardian_client.get(f"/api/students/{qa}/diagnostic/probes").json()
    qa_ids = {s.id for s in db.execute(
        select(Skill).where(Skill.code.in_(G1_PATH["QA"]))).scalars()}
    per_skill = Counter(p["skill_id"] for p in probes)
    assert set(per_skill) == qa_ids
    assert all(n == 2 for n in per_skill.values())
    # SA child: its path — REL and N120 never probed (out of path)
    sa = _child(guardian_client, country="SA", order=1, name="س٢")["id"]
    sa_probes = guardian_client.get(f"/api/students/{sa}/diagnostic/probes").json()
    sa_codes = {db.get(Skill, sid).code for sid in {p["skill_id"] for p in sa_probes}}
    assert sa_codes == G1_PATH["SA"]
