"""GRADE 4 — batch 1 (الأعداد): place value & large numbers, in RANGE TIERS.

Proves: (1) grade 4 seeded with its own «الأعداد» unit holding the six nodes, 8
published questions each, families = distinct mental acts; (2) RANGE GUARDS — the
N120/CMP10/ROUND4 law: every tier's items stay inside ITS owners' source range
(millions for the five / Oman ≤9999 / three rounding ceilings), questions carrying
no country tags; (3) country paths: SA/BH/QA 3, KW 3, AE 2 (no body-confirmed
rounding tier yet), OM 2 (its own PV4→ROUND100 chain); (4) minimal-common edges
with two disjoint roots (g4PVM for the five, g4PV4 for Oman); (5) dimension
isolation — G4 children see no G1/G2/G3 nodes and vice versa.
"""
import re
from collections import Counter

from sqlalchemy import select

from app import consent
from app.models import Grade, Question, Skill, SkillPrerequisite, Unit

G4_B1 = {"g4PVM", "g4PV4", "g4CMPM", "g4ROUNDM", "g4ROUND", "g4ROUND100"}   # الأعداد
G4_B2 = {"g4ADDSUB", "g4ADD4", "g4PROPS", "g4EST", "g4MUL1", "g4FACT", "g4PRIME"}  # العمليات
G4_B3 = {"g4MUL2", "g4DIV1", "g4DIV2"}                                     # الضرب والقسمة
G4_B4 = {"g4FRAC", "g4FREQ", "g4FRADD", "g4FRADDX", "g4FRMUL"}             # الكسور
G4_NUM = G4_B1 | G4_B2 | G4_B3 | G4_B4

# per-country G4 paths (batches 1-4). Fractions: all six in g4FRAC/g4FREQ (≤12, no Oman
# tier — Oman's fraction wall reaches 12 too); add/sub LIKE five (no Oman); g4FRADDX
# (UNLIKE) Kuwait alone; g4FRMUL (×) Qatar alone.
_FR = {"g4FRAC", "g4FREQ"}
G4_PATH = {
    "SA": {"g4PVM", "g4CMPM", "g4ROUNDM", "g4ADDSUB", "g4PROPS", "g4EST", "g4MUL1",
           "g4FACT", "g4MUL2", "g4DIV1", "g4FRADD"} | _FR,
    "BH": {"g4PVM", "g4CMPM", "g4ROUNDM", "g4ADDSUB", "g4PROPS", "g4EST", "g4MUL1",
           "g4FACT", "g4MUL2", "g4DIV1", "g4FRADD"} | _FR,
    "QA": {"g4PVM", "g4CMPM", "g4ROUNDM", "g4ADDSUB", "g4EST", "g4MUL1", "g4FACT",
           "g4PRIME", "g4MUL2", "g4DIV1", "g4FRADD", "g4FRMUL"} | _FR,
    "KW": {"g4PVM", "g4CMPM", "g4ROUND", "g4ADDSUB", "g4EST", "g4MUL1", "g4FACT",
           "g4PRIME", "g4MUL2", "g4DIV1", "g4FRADD", "g4FRADDX"} | _FR,
    "AE": {"g4PVM", "g4CMPM", "g4ROUNDM", "g4ADDSUB", "g4EST", "g4MUL1", "g4MUL2",
           "g4DIV1", "g4FRADD"} | _FR,
    "OM": {"g4PV4", "g4ROUND100", "g4ADD4", "g4DIV2"} | _FR,
}

G4_RANGE_CAP = {
    "g4PVM": 9999999, "g4PV4": 9999, "g4CMPM": 9999999,
    "g4ROUNDM": 9999999, "g4ROUND": 1000000, "g4ROUND100": 10000,
    # batch 2
    "g4ADDSUB": 9999999, "g4ADD4": 9999, "g4PROPS": 9999, "g4EST": 99999,
    "g4MUL1": 9999, "g4FACT": 144, "g4PRIME": 100,
    # batch 3
    "g4MUL2": 99999, "g4DIV1": 9999, "g4DIV2": 99,
    # batch 4 — fractions use a DENOMINATOR cap (≤12), checked separately below
}
# fractions are range-guarded by max DENOMINATOR ≤ 12, not an integer ceiling
G4_FRAC_CODES = {"g4FRAC", "g4FREQ", "g4FRADD", "g4FRADDX", "g4FRMUL"}

G4_FAMILIES = {
    "g4PVM": {"compose", "place", "relate"},
    "g4PV4": {"compose", "place", "order"},
    "g4CMPM": {"compare", "order"},
    "g4ROUNDM": {"rounding", "inverse"},
    "g4ROUND": {"rounding", "inverse"},
    "g4ROUND100": {"rounding", "inverse"},
    # batch 2
    "g4ADDSUB": {"algorithm", "mental"},
    "g4ADD4": {"algorithm", "partition"},
    "g4PROPS": {"property", "relation"},
    "g4EST": {"estimate", "decision"},
    "g4MUL1": {"multiples10", "distributive", "algorithm"},
    "g4FACT": {"factors", "multiples", "common"},
    "g4PRIME": {"classify", "definition"},
    # batch 3
    "g4MUL2": {"multiples10", "partial", "algorithm"},
    "g4DIV1": {"longdiv", "multiples10", "estimate"},
    "g4DIV2": {"remainder", "halving"},
    # batch 4
    "g4FRAC": {"represent", "numline", "mixed"},
    "g4FREQ": {"equiv", "rulecmp", "benchmark"},
    "g4FRADD": {"add", "subtract", "mixedwhole"},
    "g4FRADDX": {"add", "subtract"},
    "g4FRMUL": {"unitmultiple", "times"},
}

_TRANS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def _numbers_in(text):
    return [int(m) for m in re.findall(r"[0-9]+", (text or "").translate(_TRANS))]


def _grade_id(client, order):
    return [g["id"] for g in client.get("/api/grades").json() if g["order"] == order][0]


def _child(client, country=None, order=4, name="طفل"):
    payload = {"name": name, "consent_version": consent.CURRENT_VERSION,
               "grade_id": _grade_id(client, order)}
    if country:
        payload["country"] = country
    return client.post("/api/students", json=payload).json()


def _map_codes(client, sid):
    return {e["code"] for e in client.get(f"/api/students/{sid}/skillmap").json()}


def _g4_skills(db):
    g4 = db.execute(select(Grade).where(Grade.name == "الصف الرابع")).scalars().one()
    units = db.execute(select(Unit).where(Unit.grade_id == g4.id)).scalars().all()
    skills = [s for u in units for s in
              db.execute(select(Skill).where(Skill.unit_id == u.id)).scalars().all()]
    return g4, units, skills


def test_four_grades_seeded(guardian_client):
    grades = {g["name"]: g["order"] for g in guardian_client.get("/api/grades").json()}
    assert grades["الصف الأول"] == 1
    assert grades["الصف الثاني"] == 2
    assert grades["الصف الثالث"] == 3
    assert grades["الصف الرابع"] == 4


def test_g4_unit_nodes_and_content(db):
    _, units, skills = _g4_skills(db)
    assert [u.name for u in sorted(units, key=lambda u: u.order)] == [
        "الأعداد", "العمليات", "الضرب والقسمة", "الكسور"]
    assert {s.code for s in skills} == G4_NUM
    for s in skills:
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        assert len(qs) == 8 and all(q.status == "published" for q in qs)


def test_g4_families_are_distinct_acts(db):
    _, _, skills = _g4_skills(db)
    for s in skills:
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        assert set(q.family for q in qs) == G4_FAMILIES[s.code], s.code
        # at least two families per node (the understanding gate's feed)
        assert len(Counter(q.family for q in qs)) >= 2, s.code


def test_g4_range_tiers_hold(db):
    """Every served numeral stays inside the node's tier cap (the N120 law: no item
    leaks past an owner's source range — Oman never sees a millions item, g4ROUND100
    never a thousand-place rounding)."""
    import json
    _, _, skills = _g4_skills(db)
    for s in skills:
        for q in db.execute(select(Question).where(Question.skill_id == s.id)).scalars():
            blob = (q.prompt or "") + " " + (q.answer or "") + " " + (
                json.dumps(q.visual, ensure_ascii=False) if q.visual else "")
            if s.code in G4_FRAC_CODES:
                # fractions: the guard is max DENOMINATOR ≤ 12 (not an integer ceiling)
                dens = [int(b) for _, b in re.findall(r"(\d+)/(\d+)", blob.translate(_TRANS))]
                assert all(d <= 12 for d in dens), (s.code, q.prompt, dens)
            else:
                over = [n for n in _numbers_in(blob) if n > G4_RANGE_CAP[s.code]]
                assert not over, (s.code, q.prompt, over)


def test_g4_edges_minimal_common(db):
    _, _, skills = _g4_skills(db)
    by_code = {s.code: s.id for s in skills}
    edges = set()
    for s in skills:
        for pr in db.execute(select(SkillPrerequisite).where(
                SkillPrerequisite.skill_id == s.id)).scalars():
            prereq = db.get(Skill, pr.prerequisite_skill_id)
            edges.add((prereq.code, s.code))
    assert edges == {("g4PVM", "g4CMPM"), ("g4PVM", "g4ROUNDM"),
                     ("g4PVM", "g4ROUND"), ("g4PV4", "g4ROUND100"),
                     # batch 2: factors → primes is the ONLY surviving edge (PROPS/EST/
                     # FACT/MUL1 are roots by the actual country order)
                     ("g4FACT", "g4PRIME"),
                     # batch 3: MUL2 and DIV1 are SIBLINGS under MUL1 (×1 before ×2 and
                     # before ÷1); g4DIV2 (Oman) is a root
                     ("g4MUL1", "g4MUL2"), ("g4MUL1", "g4DIV1"),
                     # batch 4: FRAC→FREQ→FRADD→{FRADDX, FRMUL}
                     ("g4FRAC", "g4FREQ"), ("g4FREQ", "g4FRADD"),
                     ("g4FRADD", "g4FRADDX"), ("g4FRADD", "g4FRMUL")}


def test_g4_country_paths(guardian_client):
    for country, expected in G4_PATH.items():
        sid = _child(guardian_client, country=country, name=f"ط{country}")["id"]
        assert _map_codes(guardian_client, sid) == expected, country


def test_g4_two_disjoint_roots_open(guardian_client):
    # the five-country millions root opens; Oman's 4-digit root opens; tier nodes wait
    sa = _child(guardian_client, country="SA", name="س")["id"]
    sa_e = {e["code"]: e for e in guardian_client.get(f"/api/students/{sa}/skillmap").json()}
    assert sa_e["g4PVM"]["unlocked"] is True
    assert sa_e["g4CMPM"]["unlocked"] is False and sa_e["g4ROUNDM"]["unlocked"] is False
    om = _child(guardian_client, country="OM", name="ع")["id"]
    om_e = {e["code"]: e for e in guardian_client.get(f"/api/students/{om}/skillmap").json()}
    assert set(om_e) == G4_PATH["OM"]
    assert om_e["g4PV4"]["unlocked"] is True            # Oman's own root opens
    assert om_e["g4ROUND100"]["unlocked"] is False      # waits on PV4


def test_g4_round_prereqs_are_pv(guardian_client):
    kw = _child(guardian_client, country="KW", name="ك")["id"]
    e = {x["code"]: x for x in guardian_client.get(f"/api/students/{kw}/skillmap").json()}
    assert {p["name"] for p in e["g4ROUND"]["prerequisites"]} == {
        "تعميم القيمة المنزلية حتى الملايين"}
    om = _child(guardian_client, country="OM", name="ع٢")["id"]
    eo = {x["code"]: x for x in guardian_client.get(f"/api/students/{om}/skillmap").json()}
    assert {p["name"] for p in eo["g4ROUND100"]["prerequisites"]} == {
        "قراءة وتجزئة وترتيب الأعداد ضمن الألوف"}


def test_g4_batch2_splits_and_reservations(guardian_client):
    """The body-driven decisions: g4PROPS/g4PRIME are NARROW, Oman is on its own 4-digit
    tier (g4ADD4, out of g4MUL1), AE's rounding reservation is LIFTED, AE-FACT held."""
    paths = {c: _map_codes(guardian_client, _child(guardian_client, country=c, name=f"x{c}")["id"])
             for c in ("SA", "BH", "KW", "QA", "AE", "OM")}
    # g4PROPS only SA/BH; g4PRIME only KW/QA
    assert {c for c, p in paths.items() if "g4PROPS" in p} == {"SA", "BH"}
    assert {c for c, p in paths.items() if "g4PRIME" in p} == {"KW", "QA"}
    # Oman: 4-digit add (g4ADD4), and NOT in the millions add or any multiplication
    assert "g4ADD4" in paths["OM"] and "g4ADDSUB" not in paths["OM"]
    assert "g4MUL1" not in paths["OM"] and "g4FACT" not in paths["OM"]
    # AE rounding reservation LIFTED (in g4ROUNDM); AE-FACT reservation HELD (out of g4FACT)
    assert "g4ROUNDM" in paths["AE"] and "g4FACT" not in paths["AE"]
    # g4EST is its own node (standalone estimate lessons), reaching the five
    assert {c for c, p in paths.items() if "g4EST" in p} == {"SA", "BH", "KW", "QA", "AE"}


def test_g4_batch2_roots_open_primes_wait(guardian_client):
    # PROPS/EST/FACT/MUL1/ADDSUB are roots (open at entry); only PRIME waits on FACT
    qa = _child(guardian_client, country="QA", name="ق")["id"]
    e = {x["code"]: x for x in guardian_client.get(f"/api/students/{qa}/skillmap").json()}
    for code in ("g4ADDSUB", "g4EST", "g4MUL1", "g4FACT"):
        assert e[code]["unlocked"] is True, code
    assert e["g4PRIME"]["unlocked"] is False
    assert {p["name"] for p in e["g4PRIME"]["prerequisites"]} == {"العوامل والمضاعفات"}


def test_g4_batch3_siblings_and_oman_tier(guardian_client):
    """g4MUL2 & g4DIV1 are SIBLINGS under g4MUL1 (both wait on it, not on each other);
    Oman's g4DIV2 is its own root and Oman is OUT of the millions ×2 / long-division."""
    sa = _child(guardian_client, country="SA", name="س٣")["id"]
    e = {x["code"]: x for x in guardian_client.get(f"/api/students/{sa}/skillmap").json()}
    assert e["g4MUL2"]["unlocked"] is False and e["g4DIV1"]["unlocked"] is False
    assert {p["name"] for p in e["g4MUL2"]["prerequisites"]} == {"الضرب في عدد من رقم واحد"}
    assert {p["name"] for p in e["g4DIV1"]["prerequisites"]} == {"الضرب في عدد من رقم واحد"}
    om = _child(guardian_client, country="OM", name="ع٣")["id"]
    paths_om = _map_codes(guardian_client, om)
    assert "g4DIV2" in paths_om and not (paths_om & {"g4MUL2", "g4DIV1", "g4MUL1"})
    om_e = {x["code"]: x for x in guardian_client.get(f"/api/students/{om}/skillmap").json()}
    assert om_e["g4DIV2"]["unlocked"] is True            # Oman's division root opens at entry


def test_g4_batch4_fraction_gradient(guardian_client):
    """Fractions: all six in FRAC/FREQ (≤12, no Oman tier); add/sub LIKE five; UNLIKE
    Kuwait alone; multiply Qatar alone — the operations gradient can't leak."""
    paths = {c: _map_codes(guardian_client, _child(guardian_client, country=c, name=f"f{c}")["id"])
             for c in ("SA", "BH", "KW", "QA", "AE", "OM")}
    assert all({"g4FRAC", "g4FREQ"} <= p for p in paths.values())      # all six represent+equiv
    assert {c for c, p in paths.items() if "g4FRADD" in p} == {"SA", "BH", "KW", "QA", "AE"}
    assert {c for c, p in paths.items() if "g4FRADDX" in p} == {"KW"}  # unlike — Kuwait alone
    assert {c for c, p in paths.items() if "g4FRMUL" in p} == {"QA"}   # multiply — Qatar alone
    assert not (paths["OM"] & {"g4FRADD", "g4FRADDX", "g4FRMUL"})      # Oman: no fraction ops


def test_g4_fraction_chain_unlocks(guardian_client):
    kw = _child(guardian_client, country="KW", name="ك٤")["id"]
    e = {x["code"]: x for x in guardian_client.get(f"/api/students/{kw}/skillmap").json()}
    assert e["g4FRAC"]["unlocked"] is True                 # the fraction root opens
    assert e["g4FREQ"]["unlocked"] is False
    assert {p["name"] for p in e["g4FREQ"]["prerequisites"]} == {"تمثيل الكسور والأعداد الكسرية"}
    assert {p["name"] for p in e["g4FRADDX"]["prerequisites"]} == {"جمع وطرح الكسور المتشابهة"}


def test_g4_isolated_from_lower_grades(guardian_client):
    # a G4 child sees ONLY G4; a G2/G3 child sees no G4 node
    g4 = _child(guardian_client, country="SA", name="ر٤")["id"]
    assert _map_codes(guardian_client, g4) == G4_PATH["SA"]
    g2 = _child(guardian_client, order=2, name="ر٢")["id"]
    assert not (_map_codes(guardian_client, g2) & G4_NUM)
    g3 = _child(guardian_client, country="SA", order=3, name="ر٣")["id"]
    assert not (_map_codes(guardian_client, g3) & G4_NUM)


def test_g4_cross_grade_questions_blocked(guardian_client, db):
    g4_child = _child(guardian_client, country="SA", name="ج٤")["id"]
    g3_child = _child(guardian_client, country="SA", order=3, name="ج٣")["id"]
    g4pvm = db.execute(select(Skill).where(Skill.code == "g4PVM")).scalars().one()
    g3pv = db.execute(select(Skill).where(Skill.code == "g3PV")).scalars().one()
    # G4 child cannot fetch a G3 node; G3 child cannot fetch a G4 node (structural 403)
    for sid, skill in ((g4_child, g3pv), (g3_child, g4pvm)):
        r = guardian_client.get(f"/api/students/{sid}/skills/{skill.id}/questions")
        assert r.status_code == 403 and r.json()["detail"]["reason"] == "path", skill.code
