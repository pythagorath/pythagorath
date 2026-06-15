"""GRADE 3 — batch 1 (التأسيس): place value & large numbers, in RANGE TIERS.

Proves: (1) grade 3 seeded with its own «الأعداد» unit holding the seven nodes,
8 published questions each, families = distinct mental acts; (2) RANGE GUARDS —
the ratified N120/REGR law: every tier's questions stay inside ITS owners' source
range (4-digit / 5-digit / 6-digit / Oman ≤1000 / rounding ≤1000 / nearest-1000),
because questions carry no country tags (the 120 decision); (3) country paths:
SA/BH 5, KW 5, AE 3, QA 1 (ROUND without PV — the dropped-edge precedent), OM 2;
(4) minimal-common edges with three open roots (PV, ROUND, CMP10); (5) dimension
isolation — G3 children see no G1/G2 nodes and vice versa (structural 403); (6)
the diagnostic probes exactly the child's G3 path.
"""
import json
import re
from collections import Counter

from sqlalchemy import select

from app import consent
from app.models import Grade, Question, Skill, SkillCountry, SkillPrerequisite, Unit

G3_NUM = {"g3PV", "g3PV5", "g3BIG", "g3CMP4", "g3CMP10", "g3ROUND", "g3ROUND4"}
G3_ADDSUB = {"g3ADD3", "g3OPS4", "g3PROPS", "g3EST3"}        # batch 2
G3_MULDIV = {"g3MUL", "g3MULF1",                             # batch 3
             "g3MULF2", "g3F12", "g3EVENM", "g3FACTOM",      # batch 4
             "g3DIV", "g3DIVF",                              # batch 5
             "g3MUL10", "g3MULBIG", "g3ORDOPS", "g3DIVREM"}  # batch 6 — born live
G3_FRACTIONS = {"g3FRAC", "g3FRLINE", "g3FREQ", "g3FRSET3", "g3DEC"}  # batch 7
G3_MEASURE = {"g3LEN", "g3CAPMASS", "g3TIME3", "g3MONEY3"}            # batch 8
G3_GEOM = {"g3PERI", "g3AREA3", "g3GEO", "g3SYMM", "g3COORD"}         # batch 9
G3_DATA = {"g3DATAR", "g3DATAB", "g3PROB"}                           # batch 10 (final)
G3_CODES = (G3_NUM | G3_ADDSUB | G3_MULDIV | G3_FRACTIONS | G3_MEASURE
            | G3_GEOM | G3_DATA)

# per-country G3 paths so far (the curriculum map, encoded once — grows per batch)
G3_PATH = {
    "SA": {"g3PV", "g3PV5", "g3CMP4", "g3ROUND", "g3ROUND4", "g3ADD3",
           "g3PROPS", "g3EST3", "g3MUL", "g3MULF1", "g3MULF2",
           "g3DIV", "g3DIVF",
           "g3FRAC", "g3FREQ", "g3FRSET3",
           "g3LEN", "g3CAPMASS", "g3TIME3",
           "g3PERI", "g3AREA3", "g3GEO",
           "g3DATAR", "g3DATAB"},                                       # 24 — no OPS4 (indices)
    "BH": {"g3PV", "g3PV5", "g3CMP4", "g3ROUND", "g3ROUND4", "g3ADD3", "g3OPS4",
           "g3PROPS", "g3EST3", "g3MUL", "g3MULF1", "g3MULF2", "g3F12",
           "g3DIV", "g3DIVF",
           "g3FRAC", "g3FREQ", "g3FRSET3", "g3DEC",
           "g3LEN", "g3CAPMASS", "g3TIME3",
           "g3PERI", "g3AREA3", "g3GEO", "g3SYMM", "g3COORD",
           "g3DATAR", "g3DATAB", "g3PROB"},                             # 30
    "KW": {"g3PV", "g3PV5", "g3BIG", "g3CMP4", "g3ROUND", "g3ADD3", "g3OPS4",
           "g3PROPS", "g3EST3", "g3MUL", "g3MULF1", "g3MULF2", "g3EVENM",
           "g3DIV", "g3DIVF",
           "g3MUL10", "g3MULBIG", "g3ORDOPS", "g3DIVREM",
           "g3FRSET3", "g3TIME3",
           "g3PERI", "g3AREA3", "g3GEO", "g3SYMM",
           "g3DATAR", "g3DATAB"},                                       # 27 — its full cluster
    "AE": {"g3PV", "g3CMP4", "g3ROUND", "g3ADD3", "g3OPS4",
           "g3PROPS", "g3EST3", "g3MUL", "g3MULF1", "g3MULF2",
           "g3DIV", "g3DIVF",
           "g3FRAC", "g3FRLINE", "g3FREQ",
           "g3CAPMASS", "g3TIME3",
           "g3PERI", "g3AREA3", "g3GEO",
           "g3DATAR", "g3DATAB"},                                       # 22
    "QA": {"g3ROUND", "g3ADD3", "g3PROPS", "g3EST3", "g3MUL", "g3MULF1",
           "g3MULF2", "g3EVENM", "g3DIV", "g3DIVF", "g3MUL10",
           "g3FRAC", "g3FRLINE", "g3FREQ", "g3CAPMASS", "g3TIME3",
           "g3PERI", "g3AREA3", "g3GEO",
           "g3DATAR", "g3DATAB"},                                       # 21 — still no PV
    "OM": {"g3CMP10", "g3ROUND", "g3ADD3", "g3PROPS",
           "g3MUL", "g3EVENM", "g3FACTOM", "g3DIV",
           "g3FRAC", "g3FREQ", "g3FRSET3",
           "g3LEN", "g3CAPMASS", "g3TIME3", "g3MONEY3",
           "g3GEO", "g3SYMM", "g3DATAR"},                               # 18 — ÷-facts in FACTOM
}

# the range law per tier (max numeral allowed anywhere in the item)
G3_RANGE_CAP = {
    "g3PV": 9999,        # ضمن الألوف — 5 digits would exceed the UAE's source
    "g3PV5": 99999,      # ضمن عشرات الألوف — 6 digits would exceed SA/BH
    "g3BIG": 999999,     # KW's own ceiling
    "g3CMP4": 9999,      # compared within the common 4-digit range
    "g3CMP10": 1000,     # Oman u21 read from the body: everything ≤1000
    "g3ROUND": 1000,     # nearest 10/100 of ≤3-digit numbers (QA/OM cap)
    "g3ROUND4": 10000,   # 4-digit numbers, answers in whole thousands
    "g3ADD3": 1000,      # fluency within 1000 (QA u8's own title)
    "g3OPS4": 10000,     # the 4-digit tier (KW «حتى ١٠٠٠٠»; BH/AE items fit)
    "g3PROPS": 1000,     # properties/mental work on the ≤1000 range
    "g3EST3": 1000,      # estimation over 3-digit operands
    "g3MUL": 100,        # factors ≤10 — meaning work, products within 100
    "g3MULF1": 100,      # the easy facts: products ≤100 (10×10)
    "g3MULF2": 100,      # derivation of ×3/4/6/7/8 — products ≤100
    "g3F12": 144,        # the >10 table tier (12×12) — BH 5-7's own ceiling
    "g3EVENM": 100,      # parity reasoning over fact-range numbers
    "g3FACTOM": 120,     # Oman's tables + open-array 2-digit×1-digit (١٣×٩=١١٧)
    "g3DIV": 100,        # the three meanings over fact-range totals
    "g3DIVF": 100,       # ÷-facts within the tables
    "g3MUL10": 900,      # k × (d×10) — products to 810
    "g3MULBIG": 9000,    # 3-digit × digit and ×hundreds — KW's ceiling
    "g3ORDOPS": 100,     # table products plus a small addend
    "g3DIVREM": 99,      # 2-digit dividends (KW 6-1's range)
    "g3FRAC": 8,         # region denominators (the five owners' common body range)
    "g3FRLINE": 16,      # k/n ticks to 2 wholes (den ≤ 8 below, ≤ 6 above)
    "g3FREQ": 16,        # equivalents within den ≤ 8 (numerators may reach 2×)
    "g3FRSET3": 10,      # sets ≤ 10 — Kuwait's verbatim law
    "g3DEC": 100,        # hundredths
    "g3LEN": 1000,       # 1m = 1000mm (the conversion ceiling)
    "g3CAPMASS": 3000,   # 3kg = 3000g
    "g3TIME3": 60,       # minutes / elapsed ≤ 60
    "g3MONEY3": 6000,    # Oman u19's ٥,٦٠٠
    "g3PERI": 80,        # rectangle/triangle perimeters
    "g3AREA3": 100,      # 10×10 area ceiling
    "g3GEO": 6,          # hexagon = 6 sides — small
    "g3SYMM": 6, "g3COORD": 6,   # 0–6 grid
    "g3DATAR": 50,       # pictograph values via scale (5×10)
    "g3DATAB": 60,       # symbol counts and scale choices
    "g3PROB": 9,         # bag sizes
}

_HINDI = "٠١٢٣٤٥٦٧٨٩"
_TRANS = str.maketrans(_HINDI, "0123456789")


def _numbers_in(text):
    return [int(m) for m in re.findall(r"[0-9]+", (text or "").translate(_TRANS))]


def _grade_id(client, order):
    return [g["id"] for g in client.get("/api/grades").json() if g["order"] == order][0]


def _child(client, country=None, order=3, name="طفل"):
    payload = {"name": name, "consent_version": consent.CURRENT_VERSION,
               "grade_id": _grade_id(client, order)}
    if country:
        payload["country"] = country
    return client.post("/api/students", json=payload).json()


def _map_codes(client, sid):
    return {e["code"] for e in client.get(f"/api/students/{sid}/skillmap").json()}


def _g3_skills(db):
    g3 = db.execute(select(Grade).where(Grade.name == "الصف الثالث")).scalars().one()
    units = db.execute(select(Unit).where(Unit.grade_id == g3.id)).scalars().all()
    skills = [s for u in units for s in
              db.execute(select(Skill).where(Skill.unit_id == u.id)).scalars().all()]
    return g3, units, skills


def test_three_grades_seeded(guardian_client):
    grades = {g["name"]: g["order"] for g in guardian_client.get("/api/grades").json()}
    assert grades["الصف الأول"] == 1
    assert grades["الصف الثاني"] == 2
    assert grades["الصف الثالث"] == 3


def test_g3_unit_nodes_and_content(db):
    _, units, skills = _g3_skills(db)
    assert [u.name for u in sorted(units, key=lambda u: u.order)] == [
        "الأعداد", "الجمع والطرح", "الضرب والقسمة", "الكسور", "القياس",
        "الهندسة والمحيط والمساحة", "البيانات والاحتمال"]
    assert {s.code for s in skills} == G3_CODES
    for s in skills:
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        assert len(qs) == 8 and all(q.status == "published" for q in qs)


def test_g3_families_are_distinct_acts(db):
    _, _, skills = _g3_skills(db)
    fams = {}
    for s in skills:
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        fams[s.code] = Counter(q.family for q in qs)
    # PV: compose/decompose, place value, place-jump patterns (SA/BH «الجبر» lesson)
    assert set(fams["g3PV"]) == {"compose", "place", "pattern"}
    # the range tiers carry the SAME two acts at their own scope
    assert set(fams["g3PV5"]) == {"compose", "place"}
    assert set(fams["g3BIG"]) == {"compose", "place"}
    # comparison: two-number balancing ↔ multi-number ordering — at both ranges
    assert set(fams["g3CMP4"]) == {"compare", "order"}
    assert set(fams["g3CMP10"]) == {"compare", "order"}
    # rounding: direct ↔ INVERSE (Oman p57 q3 — pre-images of a target); the
    # number-line/place-value surfaces are representations, never families
    assert set(fams["g3ROUND"]) == {"rounding", "inverse"}
    assert set(fams["g3ROUND4"]) == {"rounding", "inverse"}
    # batch 2 — add/sub: column algorithm (zeros are cases), partial sums (QA verbatim
    # + BH p58 body), multi-addend (QA/KW); the 4-digit tier keeps two of the acts
    assert set(fams["g3ADD3"]) == {"algorithm", "partial", "multi"}
    assert set(fams["g3OPS4"]) == {"algorithm", "partial"}
    # properties: apply-the-property / mental (Oman's complements) / inverse relation
    assert set(fams["g3PROPS"]) == {"property", "mental", "relation"}
    # estimation: produce an estimate / judge plausibility / DECIDE exact-vs-estimate
    # (the metacognitive act — SA u2-L3, BH 2-2, AE u3-L3 verbatim)
    assert set(fams["g3EST3"]) == {"estimate", "plausibility", "decision"}
    # batch 3 — multiplication meaning: repeated grouping / array structure (open
    # array + commutativity-flip are CASES) / modeling both directions; the easy
    # facts: skip-pattern recall / the zero-one RULE / the nine pattern (×9 sits
    # here by its ACT although SA/BH index it in ch5 — inside every owner's year)
    assert set(fams["g3MUL"]) == {"repeated", "array", "modeling"}
    assert set(fams["g3MULF1"]) == {"skip", "zero-one", "nine"}
    # batch 4 — MULF2 is the G3 understanding-gate heart: FOUR derivation acts,
    # exactly two questions each (the ADDSTR template, verbatim)
    assert set(fams["g3MULF2"]) == {"distribute", "double", "associate", "pattern"}
    assert all(n == 2 for n in fams["g3MULF2"].values())
    # the >10 tier keeps two acts; parity = classify/rule; Oman's integrated three
    assert set(fams["g3F12"]) == {"eleven", "distribute"}
    assert set(fams["g3EVENM"]) == {"classify", "rule"}
    assert set(fams["g3FACTOM"]) == {"dual", "open-array", "missing"}
    # batch 5 — division: the three source-named MEANINGS are the families
    # (partitive share / quotative measure / inverse-of-×); the facts: think-
    # multiplication / four-fact family structure / the zero-one rules
    assert set(fams["g3DIV"]) == {"share", "measure", "inverse"}
    assert set(fams["g3DIVF"]) == {"think-mul", "family", "rules"}
    # batch 6 — the extension cluster: associative reasoning vs the zero shortcut;
    # renaming algorithm / place decomposition / hundreds tier; the precedence
    # DECISION (apply/justify); the remainder pair / its reasoning / renaming
    assert set(fams["g3MUL10"]) == {"assoc", "shortcut"}
    assert set(fams["g3MULBIG"]) == {"algorithm", "decompose", "hundreds"}
    assert set(fams["g3ORDOPS"]) == {"apply", "justify"}
    assert set(fams["g3DIVREM"]) == {"quotrem", "reason", "rename"}
    # batch 7 — fractions: naming/partitioning/WHOLE-rebuilding; placement below
    # and above one; equivalence-generation/rule-compare/half-benchmark;
    # set express/non-unit take; decimal grid/two-way conversion
    assert set(fams["g3FRAC"]) == {"name", "shade", "whole"}
    assert set(fams["g3FRLINE"]) == {"below", "above"}
    assert set(fams["g3FREQ"]) == {"equiv", "rulecmp", "benchmark"}
    assert set(fams["g3FRSET3"]) == {"express", "take"}
    assert set(fams["g3DEC"]) == {"grid", "convert"}
    # batch 8 — measurement: metric measure/convert; estimate/measure/convert;
    # read-to-the-minute/elapsed; money total/change
    assert set(fams["g3LEN"]) == {"measure", "convert"}
    assert set(fams["g3CAPMASS"]) == {"estimate", "measure", "convert"}
    assert set(fams["g3TIME3"]) == {"read", "elapsed"}
    assert set(fams["g3MONEY3"]) == {"total", "change"}
    # batch 9 — geometry: perimeter compute/unknown/relation; area multiply/
    # distribute/composite; geo describe/classify/analyze(right angles, Oman u26);
    # symmetry/congruence; coordinate plot/read
    assert set(fams["g3PERI"]) == {"compute", "unknown", "relation"}
    assert set(fams["g3AREA3"]) == {"multiply", "distribute", "composite"}
    assert set(fams["g3GEO"]) == {"describe", "classify", "analyze"}
    assert set(fams["g3SYMM"]) == {"symmetry", "congruence"}
    assert set(fams["g3COORD"]) == {"plot", "read"}
    # batch 10 — data: read-with-scale/interpret; build symbols/choose-scale;
    # probability certainty/likely (the G2-DA3 act, BH's G3 instance)
    assert set(fams["g3DATAR"]) == {"read", "interpret"}
    assert set(fams["g3DATAB"]) == {"symbols", "choose"}
    assert set(fams["g3PROB"]) == {"certainty", "likely"}
    assert all(len(c) >= 2 for c in fams.values())


def test_g3_range_guards_every_tier(db):
    # the N120/REGR law, enforced: no item leaks past its tier's source ceiling.
    # Numbers are extracted from prompt + answer + every widget payload value.
    _, _, skills = _g3_skills(db)
    for s in skills:
        cap = G3_RANGE_CAP[s.code]
        qs = db.execute(select(Question).where(Question.skill_id == s.id)).scalars().all()
        for q in qs:
            nums = _numbers_in(q.prompt) + _numbers_in(q.answer)
            v = q.visual if isinstance(q.visual, dict) else (
                json.loads(q.visual) if q.visual else None)
            if v:
                nums += _numbers_in(json.dumps(v, ensure_ascii=False))
            # rule-judgment items may carry no numerals at all (e.g. the ×0 rule
            # stated in words) — the law binds every numeral that IS present
            if nums:
                assert max(nums) <= cap, (s.code, q.prompt, max(nums))
    # and the tiers genuinely USE their scope (not just stay under it)
    by_code = {s.code: s for s in skills}
    def has_number_at_least(code, floor):
        qs = db.execute(select(Question).where(
            Question.skill_id == by_code[code].id)).scalars().all()
        return any(max(_numbers_in(q.prompt) + _numbers_in(q.answer)) >= floor
                   for q in qs)
    assert has_number_at_least("g3PV", 1000)        # real 4-digit work
    assert has_number_at_least("g3PV5", 10000)      # real 5-digit work
    assert has_number_at_least("g3BIG", 100000)     # real 6-digit work
    assert has_number_at_least("g3ADD3", 100)       # real 3-digit work
    assert has_number_at_least("g3OPS4", 1000)      # real 4-digit work (the tier's floor)
    assert has_number_at_least("g3F12", 101)        # real beyond-100 products (108/121/144)
    assert has_number_at_least("g3FACTOM", 101)     # the open array crosses 100 (١٣×٩=١١٧)


def test_g3_countries_and_edges(db):
    _, _, skills = _g3_skills(db)
    by_code = {s.code: s for s in skills}
    expected = {
        "g3PV": ["AE", "BH", "KW", "SA"],
        "g3PV5": ["BH", "KW", "SA"],
        "g3BIG": ["KW"],
        "g3CMP4": ["AE", "BH", "KW", "SA"],
        "g3CMP10": ["OM"],
        "g3ROUND": ["AE", "BH", "KW", "OM", "QA", "SA"],
        "g3ROUND4": ["BH", "SA"],
        "g3ADD3": ["AE", "BH", "KW", "OM", "QA", "SA"],
        "g3OPS4": ["AE", "BH", "KW"],   # SA checked OUT from both its indices
        "g3PROPS": ["AE", "BH", "KW", "OM", "QA", "SA"],   # six after the body checks
        "g3EST3": ["AE", "BH", "KW", "QA", "SA"],          # Oman: no result-estimation
        "g3MUL": ["AE", "BH", "KW", "OM", "QA", "SA"],     # Oman's u25 body = strongest evidence
        "g3MULF1": ["AE", "BH", "KW", "QA", "SA"],         # Oman OUT by body (tables 3-6/9/10)
        "g3MULF2": ["AE", "BH", "KW", "QA", "SA"],
        "g3F12": ["BH"],                                   # the >10 tier — BH 5-7 alone
        "g3EVENM": ["KW", "OM", "QA"],                     # Oman joined by u21+u25 bodies
        "g3FACTOM": ["OM"],                                # Oman's integrated facts node
        "g3DIV": ["AE", "BH", "KW", "OM", "QA", "SA"],
        "g3DIVF": ["AE", "BH", "KW", "QA", "SA"],          # Oman's ÷-facts live in FACTOM
        "g3MUL10": ["KW", "QA"],                           # the ratified shared act
        "g3MULBIG": ["KW"], "g3ORDOPS": ["KW"], "g3DIVREM": ["KW"],
        "g3FRAC": ["AE", "BH", "OM", "QA", "SA"],          # KW out — its regions = its G2 range
        "g3FRLINE": ["AE", "QA"],
        "g3FREQ": ["AE", "BH", "OM", "QA", "SA"],          # OM in — u22 verbatim
        "g3FRSET3": ["BH", "KW", "OM", "SA"],              # OM in — non-unit take
        "g3DEC": ["BH"],
        "g3LEN": ["BH", "OM", "SA"],                       # AE reserved (u12 image-only)
        "g3CAPMASS": ["AE", "BH", "OM", "QA", "SA"],
        "g3TIME3": ["AE", "BH", "KW", "OM", "QA", "SA"],
        "g3MONEY3": ["OM"],
        "g3PERI": ["AE", "BH", "KW", "QA", "SA"],          # no OM (no perimeter unit)
        "g3AREA3": ["AE", "BH", "KW", "QA", "SA"],
        "g3GEO": ["AE", "BH", "KW", "OM", "QA", "SA"],     # OM in via u26
        "g3SYMM": ["BH", "KW", "OM"],                      # OM in via u27
        "g3COORD": ["BH"],
        "g3DATAR": ["AE", "BH", "KW", "OM", "QA", "SA"],   # six — every country reads
        "g3DATAB": ["AE", "BH", "KW", "QA", "SA"],         # build-with-scale — five (no OM)
        "g3PROB": ["BH"],                                  # probability — Bahrain alone
    }
    for code, want in expected.items():
        countries = db.execute(
            select(SkillCountry.country).where(SkillCountry.skill_id == by_code[code].id)
        ).scalars().all()
        assert sorted(countries) == want, code
    def prereqs(code):
        return set(db.execute(select(SkillPrerequisite.prerequisite_skill_id).where(
            SkillPrerequisite.skill_id == by_code[code].id)).scalars().all())
    # five open roots: PV, ROUND (Qatar owns it without PV — the BOND→ADDSTR
    # dropped-edge precedent), Oman's CMP10, ADD3 (QA/OM own it without PV), and
    # PROPS (QA/SA order properties BEFORE 3-digit fluency — no ADD3→PROPS edge)
    # six open roots now — g3MUL joins them (Qatar teaches multiplication units 1–5
    # BEFORE add/sub fluency units 7–8: the country-order rule drops ADD3→MUL, and
    # G2 set the same precedent rooting M1 in D1 only)
    for code in ("g3PV", "g3ROUND", "g3CMP10", "g3ADD3", "g3PROPS", "g3MUL",
                 "g3FRAC", "g3FRSET3",     # fractions: Oman teaches u22 before u25
                 "g3LEN", "g3CAPMASS", "g3TIME3", "g3MONEY3",  # measurement strands
                 "g3PERI", "g3GEO", "g3SYMM", "g3COORD",  # geometry strands + PERI root
                 "g3DATAR", "g3DATAB", "g3PROB"):  # data strands (G2 DATA_EDGES empty too)
        assert prereqs(code) == set(), code
    # g3PERI is a ROOT not LEN-dependent (QA/KW/AE own PERI without LEN); g3AREA3
    # hangs on g3MUL (area = length × width — the product over Q4's counting)
    assert prereqs("g3AREA3") == {by_code["g3MUL"].id}
    # facts hang on meaning — unanimous source order across all five owners
    assert prereqs("g3MULF1") == {by_code["g3MUL"].id}
    # batch 4 — the derivation chain and its tier; parity and Oman's facts on meaning
    assert prereqs("g3MULF2") == {by_code["g3MULF1"].id}
    assert prereqs("g3F12") == {by_code["g3MULF2"].id}
    for code in ("g3EVENM", "g3FACTOM", "g3DIV"):
        assert prereqs(code) == {by_code["g3MUL"].id}, code
    # batch 5 — DIVF hangs on understanding + the EASY × facts; deliberately NOT
    # MULF2 (the UAE interleaves ÷2/5/10 with ×2/5/10 before ch8's derivations)
    assert prereqs("g3DIVF") == {by_code["g3DIV"].id, by_code["g3MULF1"].id}
    # batch 6 — the country-order chains
    assert prereqs("g3MUL10") == {by_code["g3MULF2"].id}
    assert prereqs("g3MULBIG") == {by_code["g3MUL10"].id}
    assert prereqs("g3ORDOPS") == {by_code["g3MULF1"].id}
    assert prereqs("g3DIVREM") == {by_code["g3DIVF"].id}
    # batch 7 — everything fraction hangs on the partition node
    for code in ("g3FRLINE", "g3FREQ", "g3DEC"):
        assert prereqs(code) == {by_code["g3FRAC"].id}, code
    # the range-tier chain and the comparison hang on PV
    assert prereqs("g3PV5") == {by_code["g3PV"].id}
    assert prereqs("g3BIG") == {by_code["g3PV5"].id}
    assert prereqs("g3CMP4") == {by_code["g3PV"].id}
    # nearest-1000 needs the act AND the 4-digit range — both owners own both
    assert prereqs("g3ROUND4") == {by_code["g3PV"].id, by_code["g3ROUND"].id}
    # the 4-digit ops tier needs the act (ADD3) and the range (PV) — KW/BH/AE own both
    assert prereqs("g3OPS4") == {by_code["g3ADD3"].id, by_code["g3PV"].id}
    # estimation = round then operate — all five owners own ROUND, in source order
    assert prereqs("g3EST3") == {by_code["g3ROUND"].id}


def test_g3_paths_differentiate_by_country(guardian_client):
    for cc, want in G3_PATH.items():
        sid = _child(guardian_client, country=cc, name=cc)["id"]
        assert _map_codes(guardian_client, sid) == want, cc
    # the headline differentiators, stated explicitly
    assert "g3BIG" in G3_PATH["KW"] and "g3BIG" not in G3_PATH["SA"]     # 6 digits = KW scope
    assert "g3ROUND4" not in G3_PATH["KW"]                               # KW rounds 10/100 only
    assert "g3PV" not in G3_PATH["QA"]                                   # no PV lesson in 13 units
    assert "g3CMP4" not in G3_PATH["OM"] and "g3CMP10" in G3_PATH["OM"]  # Oman keeps ≤1000
    # batch 2: the 4-digit tier separates the McGraw twins (BH in, SA out — indices);
    # PROPS reaches all six (Oman via u21+u24 bodies); Oman alone misses EST3
    assert "g3OPS4" in G3_PATH["BH"] and "g3OPS4" not in G3_PATH["SA"]
    assert all("g3PROPS" in G3_PATH[cc] for cc in G3_PATH)
    assert "g3EST3" not in G3_PATH["OM"] and "g3ADD3" in G3_PATH["OM"]
    # batch 3: meaning is universal; the easy-facts node excludes Oman (its tables
    # are 3-6/9/10 by body — its facts live in the proposed Oman-scope node)
    assert all("g3MUL" in G3_PATH[cc] for cc in G3_PATH)
    assert "g3MULF1" not in G3_PATH["OM"] and "g3MULF1" in G3_PATH["QA"]
    # batch 4: the >10 tier is Bahrain's alone; Oman's facts live in ITS node only
    assert "g3F12" in G3_PATH["BH"] and all(
        "g3F12" not in G3_PATH[cc] for cc in ("SA", "QA", "AE", "KW", "OM"))
    assert "g3FACTOM" in G3_PATH["OM"] and "g3MULF2" not in G3_PATH["OM"]
    assert "g3EVENM" in G3_PATH["OM"] and "g3EVENM" in G3_PATH["QA"] and "g3EVENM" in G3_PATH["KW"]
    # batch 5: division meaning universal; Oman's ÷-facts stay inside FACTOM
    assert all("g3DIV" in G3_PATH[cc] for cc in G3_PATH)
    assert "g3DIVF" not in G3_PATH["OM"] and "g3DIVF" in G3_PATH["SA"]
    # batch 6: MUL10 the shared act (QA+KW); the other three KW alone
    assert "g3MUL10" in G3_PATH["QA"] and "g3MUL10" in G3_PATH["KW"]
    for c in ("g3MULBIG", "g3ORDOPS", "g3DIVREM"):
        assert c in G3_PATH["KW"] and all(c not in G3_PATH[x] for x in ("SA", "BH", "QA", "AE", "OM"))
    # batch 7: KW's only fraction node is the SET one (its regions = its G2 range)
    assert "g3FRAC" not in G3_PATH["KW"] and "g3FRSET3" in G3_PATH["KW"]
    assert "g3DEC" in G3_PATH["BH"] and "g3FRLINE" in G3_PATH["QA"]
    # batch 8: time is universal; money is Oman-only; AE reserved out of LEN
    assert all("g3TIME3" in G3_PATH[cc] for cc in G3_PATH)
    assert "g3MONEY3" in G3_PATH["OM"] and all("g3MONEY3" not in G3_PATH[x]
                                               for x in ("SA", "BH", "QA", "AE", "KW"))
    assert "g3LEN" not in G3_PATH["AE"]               # the reserved flag, asserted
    # batch 9: PERI/AREA3 are five-country (no OM — no perimeter/area unit); GEO
    # six (OM via right angles); SYMM three; COORD Bahrain-only
    assert all("g3PERI" not in G3_PATH["OM"] and "g3AREA3" not in G3_PATH["OM"]
               for _ in [0])
    assert "g3GEO" in G3_PATH["OM"] and "g3SYMM" in G3_PATH["OM"]
    assert "g3COORD" in G3_PATH["BH"] and all("g3COORD" not in G3_PATH[x]
                                              for x in ("SA", "QA", "AE", "KW", "OM"))
    # batch 10: data-reading universal; build five (no OM); probability Bahrain-only
    assert all("g3DATAR" in G3_PATH[cc] for cc in G3_PATH)
    assert "g3DATAB" not in G3_PATH["OM"] and "g3DATAB" in G3_PATH["SA"]
    assert "g3PROB" in G3_PATH["BH"] and all("g3PROB" not in G3_PATH[x]
                                             for x in ("SA", "QA", "AE", "KW", "OM"))


def test_g3_lock_states_follow_edges(guardian_client):
    sid = _child(guardian_client, country="SA")["id"]
    entries = {e["code"]: e for e in
               guardian_client.get(f"/api/students/{sid}/skillmap").json()}
    for code in ("g3PV", "g3ROUND", "g3ADD3", "g3PROPS", "g3MUL"):
        assert entries[code]["unlocked"] is True, code
    for code in ("g3PV5", "g3CMP4", "g3ROUND4", "g3EST3", "g3MULF1", "g3DIV", "g3DIVF"):
        assert entries[code]["unlocked"] is False, code
    # ROUND4 hangs on BOTH the act and the range, structurally
    r4 = {p["name"] for p in entries["g3ROUND4"]["prerequisites"]}
    assert r4 == {"القيمة المنزلية ضمن الألوف", "التقريب إلى أقرب عشرة ومئة"}
    # the 4-digit tier hangs on act + range (a KW child shows it)
    kw = _child(guardian_client, country="KW", name="ك٢")["id"]
    kw_entries = {e["code"]: e for e in
                  guardian_client.get(f"/api/students/{kw}/skillmap").json()}
    ops4 = {p["name"] for p in kw_entries["g3OPS4"]["prerequisites"]}
    assert ops4 == {"جمع وطرح الأعداد ضمن ١٠٠٠", "القيمة المنزلية ضمن الألوف"}
    # Oman: five roots open from day one; its two ×-dependents wait on MUL
    om = _child(guardian_client, country="OM", name="ع")["id"]
    om_entries = {e["code"]: e for e in
                  guardian_client.get(f"/api/students/{om}/skillmap").json()}
    assert set(om_entries) == G3_PATH["OM"]
    for code in ("g3CMP10", "g3ROUND", "g3ADD3", "g3PROPS", "g3MUL"):
        assert om_entries[code]["unlocked"] is True, code
    for code in ("g3EVENM", "g3FACTOM", "g3DIV"):
        assert om_entries[code]["unlocked"] is False, code


def test_g1_g2_inventories_unchanged(guardian_client):
    g2 = _child(guardian_client, order=2, name="ث")["id"]    # NULL country → whole G2
    g2_codes = _map_codes(guardian_client, g2)
    assert len(g2_codes) == 66                               # the pinned G2 invariant
    assert not (g2_codes & G3_CODES)
    g1 = _child(guardian_client, country="BH", order=1, name="أ")["id"]
    g1_codes = _map_codes(guardian_client, g1)
    assert len(g1_codes) == 30                               # BH G1 path, untouched
    assert not (g1_codes & G3_CODES)


def test_cross_grade_questions_blocked_structurally(guardian_client, db):
    g3_child = _child(guardian_client, country="SA", name="ج")["id"]
    g2_child = _child(guardian_client, country="SA", order=2, name="ب")["id"]
    g3pv = db.execute(select(Skill).where(Skill.code == "g3PV")).scalars().one()
    e1 = db.execute(select(Skill).where(Skill.code == "E1")).scalars().one()
    g1n10 = db.execute(select(Skill).where(Skill.code == "g1N10")).scalars().one()
    for sid, skill in ((g3_child, e1), (g3_child, g1n10), (g2_child, g3pv)):
        r = guardian_client.get(f"/api/students/{sid}/skills/{skill.id}/questions")
        assert r.status_code == 403 and r.json()["detail"]["reason"] == "path", skill.code


def test_g3_diagnostic_probes_follow_the_path(guardian_client, db):
    # QA child: its four nodes → exactly two probes each, nothing else
    qa = _child(guardian_client, country="QA", name="ق")["id"]
    probes = guardian_client.get(f"/api/students/{qa}/diagnostic/probes").json()
    qa_ids = {s.id for s in db.execute(
        select(Skill).where(Skill.code.in_(G3_PATH["QA"]))).scalars()}
    per_skill = Counter(p["skill_id"] for p in probes)
    assert set(per_skill) == qa_ids
    assert all(n == 2 for n in per_skill.values())
    # KW child: its five — BIG probed, ROUND4 never (out of path)
    kw = _child(guardian_client, country="KW", name="ك")["id"]
    kw_probes = guardian_client.get(f"/api/students/{kw}/diagnostic/probes").json()
    kw_codes = {db.get(Skill, sid).code for sid in {p["skill_id"] for p in kw_probes}}
    assert kw_codes == G3_PATH["KW"]
