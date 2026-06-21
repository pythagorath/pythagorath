"""The public marketing website — pages serve, and the pricing page reads REAL plans
from a public (no-auth) endpoint. Presentation layer only; the engine is untouched."""
from sqlalchemy import select


def test_public_pages_serve(client):
    for path in ("/landing", "/about", "/pricing", "/contact"):
        r = client.get(path)
        assert r.status_code == 200, path
        assert "فيثاغورث" in r.text


def test_static_assets_served(client):
    # the unified mascot (نُمَيْر) + a brand logo the pages reference
    assert client.get("/static/mascot.svg").status_code == 200
    assert client.get("/static/assets/logo-white.png").status_code == 200


def test_public_plans_no_auth_reflects_admin(admin_client, client):
    """A visitor (no auth) sees the owner's real active plans on the pricing page feed."""
    admin_client.post("/api/admin/plans", json={
        "name": "عائلية", "price": 5000, "trial_days": 7, "max_children": 3, "period": "yearly"})
    r = client.get("/api/public/plans")            # anonymous
    assert r.status_code == 200
    plans = r.json()
    fam = next(p for p in plans if p["name"] == "عائلية")
    assert fam["price"] == 5000 and fam["max_children"] == 3 and fam["period"] == "yearly"


def test_public_plans_hides_inactive(admin_client, client):
    p = admin_client.post("/api/admin/plans", json={"name": "موقوفة", "price": 1000}).json()
    admin_client.patch(f"/api/admin/plans/{p['id']}", json={"is_active": False})
    names = [x["name"] for x in client.get("/api/public/plans").json()]
    assert "موقوفة" not in names


def test_term_debt_is_admin_only_not_in_parent_payload(admin_client, guardian_client):
    """The term-coverage debt is an OWNER metric: served on the admin endpoint, and the
    guardian endpoint is forbidden (it must never appear in a customer payload)."""
    r = admin_client.get("/api/admin/term-debt")
    assert r.status_code == 200
    body = r.json()
    assert "uncovered" in body and "total" in body and isinstance(body["uncovered"], list)
    # a guardian cannot reach the admin endpoint
    assert guardian_client.get("/api/admin/term-debt").status_code == 403


def test_countries_default_all_enabled(guardian_client):
    """No setting → all six GCC curricula show in the add-child picker."""
    cs = guardian_client.get("/api/countries")
    assert cs.status_code == 200
    codes = [c["code"] for c in cs.json()]
    assert set(codes) == {"SA", "AE", "QA", "KW", "OM", "BH"}
    assert all(c.get("name") for c in cs.json())          # Arabic names present


def test_admin_disable_country_hides_it_from_picker(admin_client, guardian_client):
    """Owner disables QA + KW → the add-child picker drops them; the rest remain. Content is
    untouched (only the picker hides them)."""
    admin_client.put("/api/admin/settings", json={"countries_disabled": "QA,KW"})
    codes = [c["code"] for c in guardian_client.get("/api/countries").json()]
    assert "QA" not in codes and "KW" not in codes
    assert {"SA", "AE", "OM", "BH"}.issubset(set(codes))
    # re-enabling restores the full list
    admin_client.put("/api/admin/settings", json={"countries_disabled": ""})
    assert len(guardian_client.get("/api/countries").json()) == 6


def test_countries_requires_auth(client):
    assert client.get("/api/countries").status_code == 401


def test_disable_country_does_not_delete_curriculum(admin_client, guardian_client, db):
    """Disabling a country must NOT remove its SkillCountry rows (content preserved)."""
    from app.models import SkillCountry
    before = db.execute(select(SkillCountry).where(SkillCountry.country == "QA")).scalars().all()
    admin_client.put("/api/admin/settings", json={"countries_disabled": "QA"})
    after = db.execute(select(SkillCountry).where(SkillCountry.country == "QA")).scalars().all()
    assert len(before) == len(after) and len(before) > 0   # rows untouched


def test_how_video_managed_from_admin(admin_client, client):
    """The 'how it works' video is owner-managed: blank by default (→ animated fallback on
    the landing), and once set in admin it appears in the public /api/site feed."""
    site = client.get("/api/site").json()
    assert "video" in site and site["video"] == ""        # default blank → fallback
    admin_client.put("/api/admin/settings", json={"how_video_url": "https://youtu.be/abc123"})
    assert client.get("/api/site").json()["video"] == "https://youtu.be/abc123"
