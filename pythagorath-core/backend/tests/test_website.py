"""The public marketing website — pages serve, and the pricing page reads REAL plans
from a public (no-auth) endpoint. Presentation layer only; the engine is untouched."""


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


def test_how_video_managed_from_admin(admin_client, client):
    """The 'how it works' video is owner-managed: blank by default (→ animated fallback on
    the landing), and once set in admin it appears in the public /api/site feed."""
    site = client.get("/api/site").json()
    assert "video" in site and site["video"] == ""        # default blank → fallback
    admin_client.put("/api/admin/settings", json={"how_video_url": "https://youtu.be/abc123"})
    assert client.get("/api/site").json()["video"] == "https://youtu.be/abc123"
