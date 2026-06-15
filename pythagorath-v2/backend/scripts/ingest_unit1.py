"""Ingest real curriculum content (Grade-2 Math, Unit 1, Oman–Cambridge) through
the ADMIN API ONLY — no direct DB writes, no static files. This mimics an admin
filling the panel; the source JSON is the admin's data, not app content.

Run with the backend live on :8000:
    python -m scripts.ingest_unit1  [path-to-json]
"""
import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000/api/admin"
DEFAULT_SRC = r"C:\Users\user\Downloads\unit1_grade2_math.json"


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"POST {path} failed {e.code}: {e.read().decode('utf-8')}")


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    with open(src, encoding="utf-8") as f:
        doc = json.load(f)
    meta = doc["meta"]
    threshold = meta.get("mastery_threshold", 0.8)

    # --- hierarchy ---
    country = post("/countries", {"name": meta["country"]})
    curriculum = post("/curricula", {"country_id": country["id"], "name": meta["curriculum"]})
    grade = post("/grades", {"curriculum_id": curriculum["id"], "name": meta["grade"], "order": 2})
    subject = post("/subjects", {"grade_id": grade["id"], "name": meta["subject"]})
    unit = post("/units", {"subject_id": subject["id"], "name": meta["unit"], "order": 1})

    # --- skills + questions ---
    name_to_id: dict[str, int] = {}
    qcount = 0
    for sk in doc["skills"]:
        skill = post("/skills", {
            "unit_id": unit["id"], "name": sk["name"],
            "order": sk["order"], "mastery_threshold": threshold,
        })
        name_to_id[sk["name"]] = skill["id"]
        for q in sk["questions"]:
            post("/questions", {
                "skill_id": skill["id"],
                "interaction_type": sk["interaction_type"],
                "difficulty": q.get("difficulty", 1),
                "payload": {
                    "prompt": q["prompt"],
                    "answer": q["answer"],
                    "choices": q["choices"],
                },
            })
            qcount += 1

    # --- prerequisites (second pass: all skills now exist) ---
    pcount = 0
    for sk in doc["skills"]:
        if sk.get("prerequisite"):
            post("/prerequisites", {
                "skill_id": name_to_id[sk["name"]],
                "prerequisite_skill_id": name_to_id[sk["prerequisite"]],
            })
            pcount += 1

    print(f"INGESTED via admin API only:")
    print(f"  hierarchy: country#{country['id']} -> curriculum#{curriculum['id']} "
          f"-> grade#{grade['id']} -> subject#{subject['id']} -> unit#{unit['id']}")
    print(f"  skills: {len(doc['skills'])}  |  questions: {qcount}  |  prerequisite links: {pcount}")
    for sk in doc["skills"]:
        prereq = sk.get("prerequisite")
        print(f"    - skill#{name_to_id[sk['name']]} '{sk['name']}' "
              f"(order {sk['order']})  requires: {prereq or '—'}")


if __name__ == "__main__":
    main()
