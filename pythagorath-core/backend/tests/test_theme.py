"""Visual theme switching — admin-only, applied app-wide, never touches logic."""
from app import consent


def test_default_theme_is_public(client):
    r = client.get("/api/theme")            # public (login/landing apply it too)
    assert r.status_code == 200 and r.json()["theme"] == "mutadarrij"


def test_admin_switch_applies_app_wide(admin_client, anon_client):
    assert admin_client.put("/api/admin/theme", json={"theme": "ameen"}).status_code == 200
    assert admin_client.get("/api/admin/theme").json()["theme"] == "ameen"
    assert anon_client.get("/api/theme").json()["theme"] == "ameen"   # visible to the app


def test_invalid_theme_rejected(admin_client):
    assert admin_client.put("/api/admin/theme", json={"theme": "waha"}).status_code == 400


def test_theme_change_requires_admin(guardian_client):
    assert guardian_client.put("/api/admin/theme", json={"theme": "ameen"}).status_code == 403
    assert guardian_client.get("/api/theme").status_code == 200       # reading is public


def test_switching_theme_does_not_break_the_gate(guardian_client, admin_client):
    admin_client.put("/api/admin/theme", json={"theme": "mutawwar"})  # purely visual
    node = next(n for n in admin_client.get("/api/admin/nodes").json() if n["code"] == "B3")
    ans = {q["id"]: q["answer"] for q in node["questions"]}
    stu = guardian_client.post("/api/students", json={"name": "ث", "consent_version": consent.CURRENT_VERSION,
        "grade_id": [g["id"] for g in guardian_client.get("/api/grades").json() if g["order"] == 2][0]}).json()
    fams = {}
    for q in node["questions"]:
        fams.setdefault(q["family"], q)
    fl = list(fams.values())

    def submit(qid):
        return guardian_client.post("/api/answers", json={
            "student_id": stu["id"], "question_id": qid, "answer": ans[qid], "elapsed_ms": 1000}).json()

    submit(fl[0]["id"])
    assert submit(fl[1]["id"])["status"] == "understood"   # gate works regardless of theme
