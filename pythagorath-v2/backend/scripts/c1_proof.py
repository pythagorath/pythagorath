"""C-1 acceptance proof — admin CRUD over the full hierarchy via the API only.

1. Build a full branch country -> curriculum -> grade -> subject -> unit -> skill
   -> question (+ a second skill, a prerequisite edge, threshold, interaction_type)
   using ONLY HTTP calls. Read it back from an INDEPENDENT connection.
2. Read / update / delete entities, respecting Track A delete policies
   (RESTRICT surfaces as 409; cascade removes the subtree).
"""
from sqlalchemy import create_engine, text

from app.core.config import settings
from app.main import app
from fastapi.testclient import TestClient

BASE = "/api/admin"


def db_snapshot():
    """Row counts read from a brand-new independent connection."""
    eng = create_engine(settings.database_url)
    tables = ["countries", "curricula", "grades", "subjects", "units",
              "skills", "questions", "skill_prerequisites"]
    with eng.connect() as conn:
        snap = {t: conn.execute(text(f"select count(*) from {t}")).scalar()
                for t in tables}
    eng.dispose()
    return snap


def main():
    client = TestClient(app)

    def post(path, body):
        r = client.post(BASE + path, json=body)
        assert r.status_code == 201, f"POST {path} -> {r.status_code}: {r.text}"
        return r.json()

    print("=" * 70)
    print("1) BUILD A FULL BRANCH VIA API ONLY")
    print("=" * 70)
    country = post("/countries", {"name": "الإمارات"})
    curriculum = post("/curricula", {"country_id": country["id"], "name": "منهج الإمارات"})
    grade = post("/grades", {"curriculum_id": curriculum["id"], "name": "الصف الثاني", "order": 2})
    subject = post("/subjects", {"grade_id": grade["id"], "name": "الرياضيات"})
    unit = post("/units", {"subject_id": subject["id"], "name": "الجمع والطرح", "order": 1})
    skill_a = post("/skills", {"unit_id": unit["id"], "name": "الجمع ضمن ١٠",
                               "order": 1, "mastery_threshold": 0.8})
    skill_b = post("/skills", {"unit_id": unit["id"], "name": "الجمع بحمل",
                               "order": 2, "mastery_threshold": 0.75})
    question = post("/questions", {"skill_id": skill_a["id"], "interaction_type": "count",
                                   "difficulty": 1, "payload": {"answer": "5"}})
    edge = post("/prerequisites", {"skill_id": skill_b["id"],
                                   "prerequisite_skill_id": skill_a["id"]})
    print("  created chain ids:",
          f"country#{country['id']} curriculum#{curriculum['id']} grade#{grade['id']} "
          f"subject#{subject['id']} unit#{unit['id']} skillA#{skill_a['id']} "
          f"skillB#{skill_b['id']} question#{question['id']}")
    print("  prerequisite edge:", edge,
          "| skillB threshold:", skill_b["mastery_threshold"],
          "| question interaction_type:", question["interaction_type"])

    print("\n  INDEPENDENT connection row counts:", db_snapshot())
    print("  -> the full branch is in the database, entered with zero code.\n")

    print("=" * 70)
    print("2) READ / UPDATE / DELETE (respecting Track A policies)")
    print("=" * 70)

    # READ one
    r = client.get(f"{BASE}/skills/{skill_a['id']}")
    print("  GET skillA:", r.json())

    # UPDATE — change skillA threshold and country name
    r = client.patch(f"{BASE}/skills/{skill_a['id']}", json={"mastery_threshold": 0.9})
    print("  PATCH skillA threshold -> 0.9:", r.json()["mastery_threshold"])
    r = client.patch(f"{BASE}/countries/{country['id']}", json={"name": "دولة الإمارات"})
    print("  PATCH country name:", r.json()["name"])
    # verify update from independent connection
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        thr = conn.execute(text("select mastery_threshold from skills where id=:i"),
                           {"i": skill_a["id"]}).scalar()
        nm = conn.execute(text("select name from countries where id=:i"),
                          {"i": country["id"]}).scalar()
    eng.dispose()
    print(f"  (independent) skillA threshold={thr}, country name={nm!r}")

    # DELETE policy: skillA is a prerequisite of skillB -> RESTRICT -> 409
    r = client.delete(f"{BASE}/skills/{skill_a['id']}")
    print(f"\n  DELETE skillA (referenced as prerequisite) -> HTTP {r.status_code} "
          f"{'(blocked, RESTRICT)' if r.status_code == 409 else ''}")
    print("     detail:", r.json().get("detail"))

    # DELETE leaf question -> 204
    r = client.delete(f"{BASE}/questions/{question['id']}")
    print(f"  DELETE question (leaf) -> HTTP {r.status_code}")
    print("     questions now:", db_snapshot()["questions"])

    # Remove the edge first, then skillA deletes (cascades its remaining data)
    r = client.delete(f"{BASE}/prerequisites/{skill_b['id']}/{skill_a['id']}")
    print(f"  DELETE prerequisite edge -> HTTP {r.status_code}")
    r = client.delete(f"{BASE}/skills/{skill_a['id']}")
    print(f"  DELETE skillA (now unreferenced) -> HTTP {r.status_code}")

    # DELETE the whole country -> cascades the remaining subtree
    r = client.delete(f"{BASE}/countries/{country['id']}")
    print(f"\n  DELETE country -> HTTP {r.status_code} (cascades subtree)")
    print("  INDEPENDENT connection row counts after full delete:", db_snapshot())


if __name__ == "__main__":
    main()
