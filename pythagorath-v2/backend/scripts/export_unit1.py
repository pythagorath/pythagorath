"""Export the ingested unit from the DB (the single source) into a reference
JSON inside the project (pythagorath-v2/content/), so the reference always
matches what is actually live — no dependency on the Downloads file."""
import json
import os
import urllib.request

BASE = "http://127.0.0.1:8000/api"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "content",
                   "unit1_grade2_math.json")


def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return json.loads(r.read())


def main():
    countries = get("/admin/countries")
    curricula = get("/admin/curricula")
    grades = get("/admin/grades")
    subjects = get("/admin/subjects")
    units = get("/admin/units")
    skills = sorted(get("/admin/skills"), key=lambda s: s["order"])
    questions = get("/admin/questions")
    prereqs = get("/admin/prerequisites")

    id_to_skill = {s["id"]: s for s in skills}
    prereq_of = {e["skill_id"]: id_to_skill[e["prerequisite_skill_id"]]["name"]
                 for e in prereqs}

    doc = {
        "meta": {
            "country": countries[0]["name"],
            "curriculum": curricula[0]["name"],
            "grade": grades[0]["name"],
            "subject": subjects[0]["name"],
            "unit": units[0]["name"],
            "mastery_threshold": skills[0]["mastery_threshold"],
            "source": "exported from DB (single source of truth)",
        },
        "skills": [],
    }
    for s in skills:
        sq = [q for q in questions if q["skill_id"] == s["id"]]
        sq.sort(key=lambda q: q["id"])
        itype = sq[0]["interaction_type"] if sq else "choice"
        doc["skills"].append({
            "order": s["order"],
            "name": s["name"],
            "prerequisite": prereq_of.get(s["id"]),
            "interaction_type": itype,
            "mastery_threshold": s["mastery_threshold"],
            "questions": [
                {
                    "prompt": q["payload"]["prompt"],
                    "choices": q["payload"]["choices"],
                    "answer": q["payload"]["answer"],
                    "difficulty": q["difficulty"],
                }
                for q in sq
            ],
        })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    total = sum(len(s["questions"]) for s in doc["skills"])
    print(f"exported {len(doc['skills'])} skills, {total} questions to:")
    print(f"  {os.path.abspath(OUT)}")


if __name__ == "__main__":
    main()
