"""Platform control — settings (integrations/identity/whatsapp) + announcements.
Owner-only writes; public /api/site + targeted /api/announcements (all / unsubscribed /
grade / country); inactive/expired excluded. Presentation/config — no engine touch."""
from app import consent


def _grade(client, order):
    return next(g for g in client.get("/api/grades").json() if g["order"] == order)


def _child(client, name, order=4, country="SA"):
    g = _grade(client, order)
    return client.post("/api/students", json={
        "name": name, "country": country, "consent_version": consent.CURRENT_VERSION,
        "grade_id": g["id"]}).json()


# ---------- owner-only ----------
def test_settings_and_ads_owner_only(client, guardian_client):
    assert client.get("/api/admin/settings").status_code == 401
    assert guardian_client.get("/api/admin/settings").status_code == 403
    assert client.post("/api/admin/announcements", json={}).status_code == 401
    assert guardian_client.post("/api/admin/announcements", json={}).status_code == 403


# ---------- settings roundtrip + public /api/site ----------
def test_settings_roundtrip_and_public_site(admin_client, client):
    admin_client.put("/api/admin/settings", json={
        "brand_name": "أكاديميتي", "integration_ga": "G-TEST123",
        "whatsapp_number": "966500000000", "whatsapp_enabled": "1",
        "brand_primary": "#222222",
    })
    s = admin_client.get("/api/admin/settings").json()
    assert s["brand_name"] == "أكاديميتي" and s["integration_ga"] == "G-TEST123"
    site = client.get("/api/site").json()                 # PUBLIC, anonymous
    assert site["brand"]["name"] == "أكاديميتي"
    assert site["integrations"]["ga"] == "G-TEST123"
    assert site["whatsapp"]["enabled"] is True and site["whatsapp"]["number"] == "966500000000"
    assert site["brand"]["primary"] == "#222222"
    assert site["defaults"]["primary"]                    # defaults preserved for revert


def test_unknown_setting_keys_ignored(admin_client):
    admin_client.put("/api/admin/settings", json={"evil": "x", "brand_name": "ب"})
    s = admin_client.get("/api/admin/settings").json()
    assert "evil" not in s and s["brand_name"] == "ب"


# ---------- announcement targeting ----------
def _ad(admin_client, **kw):
    body = {"title": "ع", "body": "نص", "format": "popup", "target_type": "all"}
    body.update(kw)
    return admin_client.post("/api/admin/announcements", json=body).json()


def test_targeting_all_grade_country_and_unsubscribed(admin_client, guardian_client, unsubscribed_client):
    g4name = _grade(admin_client, 4)["name"]
    a_all = _ad(admin_client, title="للكل", target_type="all")
    a_grade = _ad(admin_client, title="للصف", target_type="grade", target_value=g4name)
    a_country = _ad(admin_client, title="للسعودية", target_type="country", target_value="SA")
    a_unsub = _ad(admin_client, title="لغير المشترك", target_type="unsubscribed")

    # subscribed guardian, G4/SA child → all + grade + country, NOT unsubscribed
    kid = _child(guardian_client, "سعد", order=4, country="SA")
    got = {a["id"] for a in guardian_client.get(f"/api/announcements?student_id={kid['id']}").json()}
    assert a_all["id"] in got and a_grade["id"] in got and a_country["id"] in got
    assert a_unsub["id"] not in got

    # unsubscribed guardian → unsubscribed ad shows
    ukid = _child(unsubscribed_client, "ريم", order=4, country="QA")
    ug = {a["id"] for a in unsubscribed_client.get(f"/api/announcements?student_id={ukid['id']}").json()}
    assert a_unsub["id"] in ug and a_all["id"] in ug
    assert a_country["id"] not in ug                       # QA child, country ad is SA


def test_anonymous_sees_only_all(admin_client, client):
    a_all = _ad(admin_client, title="للكل", target_type="all")
    a_grade = _ad(admin_client, title="للصف", target_type="grade", target_value="الصف الرابع")
    got = {a["id"] for a in client.get("/api/announcements").json()}
    assert a_all["id"] in got and a_grade["id"] not in got


def test_inactive_and_toggle_excluded(admin_client, client):
    a = _ad(admin_client, title="موقوف", target_type="all")
    assert a["id"] in {x["id"] for x in client.get("/api/announcements").json()}
    admin_client.patch(f"/api/admin/announcements/{a['id']}", json={"active": False})
    assert a["id"] not in {x["id"] for x in client.get("/api/announcements").json()}
    admin_client.delete(f"/api/admin/announcements/{a['id']}")
    assert a["id"] not in {x["id"] for x in admin_client.get("/api/admin/announcements").json()}
