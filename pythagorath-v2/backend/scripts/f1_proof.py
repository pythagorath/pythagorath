"""F-1 acceptance proof — backend support for the frontend.

1. CORS header present for the Vite dev origin.
2. GET /api/students                       -> bootstrap read (pick a student)
3. GET /api/grades/{id}/subjects           -> bootstrap read (subject picker)
4. GET /api/students/{id}/progress         -> human-language summary + traffic
   light, built from skill_mastery (single source).
"""
from sqlalchemy import create_engine, text

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
import app.models as m
from fastapi.testclient import TestClient

ADMIN = "/api/admin"


def post(client, path, body):
    r = client.post(ADMIN + path, json=body)
    assert r.status_code == 201, f"{path}: {r.status_code} {r.text}"
    return r.json()


def seed(client):
    country = post(client, "/countries", {"name": "الإمارات"})
    cur = post(client, "/curricula", {"country_id": country["id"], "name": "منهج"})
    grade = post(client, "/grades", {"curriculum_id": cur["id"], "name": "الصف الثاني", "order": 2})
    math = post(client, "/subjects", {"grade_id": grade["id"], "name": "الرياضيات"})
    unit = post(client, "/units", {"subject_id": math["id"], "name": "الجمع", "order": 1})
    a = post(client, "/skills", {"unit_id": unit["id"], "name": "الجمع ضمن ١٠", "order": 1, "mastery_threshold": 0.8})
    b = post(client, "/skills", {"unit_id": unit["id"], "name": "الجمع بحمل", "order": 2, "mastery_threshold": 0.8})
    qa = post(client, "/questions", {"skill_id": a["id"], "interaction_type": "count", "difficulty": 1, "payload": {"answer": "5"}})
    qb = post(client, "/questions", {"skill_id": b["id"], "interaction_type": "count", "difficulty": 1, "payload": {"answer": "5"}})
    post(client, "/prerequisites", {"skill_id": b["id"], "prerequisite_skill_id": a["id"]})

    # provision a demo student (provisioning, not content)
    s = SessionLocal()
    parent = m.User(email="mom@example.com", password_hash="x"); s.add(parent); s.flush()
    child = m.Student(user_id=parent.id, name="أحمد", grade_id=grade["id"], country_id=country["id"])
    s.add(child); s.commit()
    sid = child.id
    s.close()
    return dict(sid=sid, grade=grade["id"], math=math["id"], qa=qa["id"], qb=qb["id"])


def main():
    client = TestClient(app)
    ids = seed(client)
    sid = ids["sid"]

    # Drive answers: master skill A, then start skill B (now unlocked).
    for _ in range(5):
        client.post("/api/submit_answer", json={"student_id": sid, "question_id": ids["qa"], "answer": "5"})
    client.post("/api/submit_answer", json={"student_id": sid, "question_id": ids["qb"], "answer": "5"})

    print("=" * 68)
    print("1) CORS header for the Vite dev origin")
    print("=" * 68)
    r = client.get("/api/students", headers={"Origin": "http://localhost:5173"})
    aco = r.headers.get("access-control-allow-origin")
    print(f"  GET /api/students with Origin -> HTTP {r.status_code}; "
          f"access-control-allow-origin = {aco!r}")
    # preflight
    pre = client.options(
        "/api/submit_answer",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    print(f"  OPTIONS preflight -> HTTP {pre.status_code}; "
          f"allow-origin={pre.headers.get('access-control-allow-origin')!r}; "
          f"allow-methods={pre.headers.get('access-control-allow-methods')!r}")
    assert aco == "http://localhost:5173"

    print("\n" + "=" * 68)
    print("2) GET /api/students  (bootstrap read)")
    print("=" * 68)
    print("  ", client.get("/api/students").json())

    print("\n" + "=" * 68)
    print("3) GET /api/grades/{id}/subjects  (bootstrap read)")
    print("=" * 68)
    print("  ", client.get(f"/api/grades/{ids['grade']}/subjects").json())

    print("\n" + "=" * 68)
    print("4) GET /api/students/{id}/progress  (human summary + traffic light)")
    print("=" * 68)
    prog = client.get(f"/api/students/{sid}/progress").json()
    print("  summary     :", prog["summary"])
    print("  overall_light:", prog["overall_light"])
    for s in prog["skills"]:
        print(f"    - {s['name']}: status={s['status']} level={s['mastery_level']:.2f} light={s['light']}")

    # cross-check against an independent connection (single source = DB)
    eng = create_engine(settings.database_url)
    with eng.connect() as conn:
        db_rows = conn.execute(text(
            "select s.name, sm.status from skill_mastery sm join skills s "
            "on s.id=sm.skill_id where sm.student_id=:s order by s.\"order\""),
            {"s": sid}).fetchall()
    eng.dispose()
    print("  (independent DB) skill_mastery:", [tuple(r) for r in db_rows])


if __name__ == "__main__":
    main()
