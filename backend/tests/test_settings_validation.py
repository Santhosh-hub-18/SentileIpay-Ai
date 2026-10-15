import pytest
from fastapi.testclient import TestClient
from backend.app.config import settings


class TestSettingsValidation:
    """Tests risk settings retrieval, admin-only access control, and strict range/weight validations."""

    @pytest.fixture
    def admin_token(self, client: TestClient) -> str:
        """Obtains an admin JWT token for authorization tests."""
        res = client.post("/api/auth/login", json={
            "username": settings.DEMO_ADMIN_USER,
            "password": settings.DEMO_ADMIN_PASSWORD
        })
        assert res.status_code == 200
        return res.json()["access_token"]

    @pytest.fixture
    def analyst_token(self, client: TestClient) -> str:
        """Obtains an analyst JWT token for permission tests."""
        res = client.post("/api/auth/login", json={
            "username": settings.DEMO_ANALYST_USER,
            "password": settings.DEMO_ANALYST_PASSWORD
        })
        assert res.status_code == 200
        return res.json()["access_token"]

    def test_get_settings(self, client: TestClient):
        """Any client can retrieve current settings and verify required label."""
        res = client.get("/api/settings")
        assert res.status_code == 200
        data = res.json()
        assert "criteria_weights" in data
        assert "action_ranges" in data
        assert "configurable demonstration values" in data["label_notice"].lower()

    def test_admin_can_update_valid_settings(self, client: TestClient, admin_token: str):
        """Admin user can successfully save valid configuration."""
        current = client.get("/api/settings").json()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Modify one weight while preserving 100 sum
        current["criteria_weights"]["unusual_amount"] = 25
        current["criteria_weights"]["unfamiliar_device"] = 10

        res = client.put("/api/settings", json=current, headers=headers)
        assert res.status_code == 200
        updated = res.json()
        assert updated["criteria_weights"]["unusual_amount"] == 25
        assert updated["criteria_weights"]["unfamiliar_device"] == 10

    def test_analyst_cannot_update_settings(self, client: TestClient, analyst_token: str):
        """Analyst role must be rejected with HTTP 403 Forbidden."""
        current = client.get("/api/settings").json()
        headers = {"Authorization": f"Bearer {analyst_token}"}

        res = client.put("/api/settings", json=current, headers=headers)
        assert res.status_code == 403

    def test_reject_weights_not_summing_to_100(self, client: TestClient, admin_token: str):
        """Saving criteria weights that do not sum to 100 must fail with HTTP 422."""
        current = client.get("/api/settings").json()
        headers = {"Authorization": f"Bearer {admin_token}"}

        current["criteria_weights"]["unusual_amount"] = 50  # Total now 125
        res = client.put("/api/settings", json=current, headers=headers)
        assert res.status_code == 422

    def test_reject_overlapping_ranges(self, client: TestClient, admin_token: str):
        """Ranges with overlapping boundaries must fail with HTTP 422."""
        current = client.get("/api/settings").json()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Overlap: Normal 0-35, Message 30-50
        current["action_ranges"][0]["max_score"] = 35
        current["action_ranges"][1]["min_score"] = 30

        res = client.put("/api/settings", json=current, headers=headers)
        assert res.status_code == 422

    def test_reject_gaps_in_ranges(self, client: TestClient, admin_token: str):
        """Ranges with gaps (e.g. Normal 0-25, Message 31-50) must fail with HTTP 422."""
        current = client.get("/api/settings").json()
        headers = {"Authorization": f"Bearer {admin_token}"}

        current["action_ranges"][0]["max_score"] = 25
        # Range 1 starts at 31, leaving gap 26-30
        res = client.put("/api/settings", json=current, headers=headers)
        assert res.status_code == 422
