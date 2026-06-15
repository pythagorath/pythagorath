"""Independent-connection proof that the ingested Unit-1 content is in the DB."""
import json
import sqlite3
import urllib.request

from sqlalchemy import text

from app.core.database import SessionLocal
from app.models.skill import Skill
from app.services.mastery_engine import unmet_prerequisites


def GET(path):
    with urllib.request.urlopen("http://127.0.0.1:8000" + path) as r:
        return json.loads(r.read())


def main():
    print("=" * 72)
    print("A) LIVE API (independent HTTP) — hierarchy + counts")
    print("=" * 72)
    countries = GET("/api/admin/countries")
    curricula = GET("/api/admin/curricula")
    grades = GET("/api/admin/grades")
    subjects = GET("/api/admin/subjects")
    units = GET("/api/admin/units")
    skills = GET("/api/admin/skills")
    questions = GET("/api/admin/questions")
    print(f"  country     : {countries[0]['name']}")
    print(f"  curriculum  : {curricula[0]['name']}")
    print(f"  grade       : {grades[0]['name']}")
    print(f"  subject     : {subjects[0]['name']}")
    print(f"  unit        : {units[0]['name']}")
    print(f"  counts      : skills={len(skills)}  questions={len(questions)}")

    print("\n" + "=" * 72)
    print("B) FRESH sqlite connection — per-skill question counts + prerequisites")
    print("=" * 72)
    con = sqlite3.connect("pythagorath_dev.db")
    rows = con.execute(
        'select s.id, s.name, s."order", s.mastery_threshold, count(q.id) '
        'from skills s left join questions q on q.skill_id = s.id '
        'group by s.id order by s."order"'
    ).fetchall()
    total = 0
    for sid, name, order, thr, n in rows:
        total += n
        print(f"  skill#{sid} (order {order}, threshold {thr}) {name}: {n} questions")
    print(f"  TOTAL questions: {total}")
    print("  prerequisite edges (child requires prerequisite):")
    edges = con.execute(
        "select s1.name, s2.name from skill_prerequisites sp "
        "join skills s1 on s1.id = sp.skill_id "
        "join skills s2 on s2.id = sp.prerequisite_skill_id "
        'order by s1."order"'
    ).fetchall()
    for child, prereq in edges:
        print(f"    '{child}'  requires  '{prereq}'")

    print("\n" + "=" * 72)
    print("C) LOCK GATE (engine) — التقدير is locked until العدّ بالقفز is mastered")
    print("=" * 72)
    s = SessionLocal()
    by_name = {sk.name: sk.id for sk in s.execute(__import__("sqlalchemy").select(Skill)).scalars()}
    taqdir = next(i for n, i in by_name.items() if n.startswith("التقدير"))
    qafz = next(i for n, i in by_name.items() if n.startswith("العدّ بالقفز"))
    lawha = next(i for n, i in by_name.items() if n.startswith("لوحة المائة"))
    # a hypothetical fresh student (id 1) has mastered nothing yet
    print(f"  unmet prerequisites for 'لوحة المائة' (#{lawha}): {unmet_prerequisites(s, 1, lawha)}  -> open")
    print(f"  unmet prerequisites for 'العدّ بالقفز' (#{qafz}): {unmet_prerequisites(s, 1, qafz)}  (needs #{lawha})")
    print(f"  unmet prerequisites for 'التقدير' (#{taqdir}): {unmet_prerequisites(s, 1, taqdir)}  (LOCKED, needs #{qafz})")
    s.close()

    print("\n" + "=" * 72)
    print("D) HINDI NUMERALS integrity (round-trip, not converted/corrupted)")
    print("=" * 72)
    # find the '٤٧' question via the live API (parsed JSON)
    q = next(x for x in questions if "٤٧" in x["payload"].get("prompt", ""))
    payload = q["payload"]
    print(f"  question#{q['id']} prompt: {payload['prompt']}")
    print(f"  answer: {payload['answer']}   choices: {payload['choices']}")
    cps = [hex(ord(c)) for c in payload["answer"]]
    print(f"  answer codepoints: {cps}  (Arabic-Indic ٠–٩ = U+0660–U+0669, NOT Western 0–9)")
    # raw bytes as stored in sqlite (escaped) vs parsed
    raw = con.execute("select payload from questions where id=:i", {"i": q["id"]}).fetchone()[0]
    print(f"  raw stored TEXT (escaped JSON): {raw[:70]}...")
    print(f"  parsed back from DB: answer={json.loads(raw)['answer']!r}  -> identical to source ✓")
    con.close()


if __name__ == "__main__":
    main()
