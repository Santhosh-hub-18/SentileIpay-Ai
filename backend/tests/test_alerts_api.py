import pytest
from fastapi.testclient import TestClient
from backend.app.models.alert import Alert


class TestAlertsApi:
    """Tests the Fraud Alerts API endpoints for listing, inspection, and status triage."""

    def test_list_alerts_with_filtering(self, client: TestClient):
        """Alerts list supports pagination and status filtering."""
        res = client.get("/api/alerts?page=1&page_size=10")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert data["total"] > 0
        assert len(data["items"]) <= 10

        # Filter by NEW status
        new_res = client.get("/api/alerts?status=NEW")
        assert new_res.status_code == 200
        for item in new_res.json()["items"]:
            assert item["status"] == "NEW"

    def test_get_alert_by_id(self, client: TestClient):
        """Retrieving single alert by ID returns event details and triggered criteria."""
        list_res = client.get("/api/alerts?page_size=1")
        alert_id = list_res.json()["items"][0]["id"]

        res = client.get(f"/api/alerts/{alert_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == alert_id
        assert "event" in data
        assert "triggered_criteria" in data

    def test_update_alert_status_and_notes(self, client: TestClient, db_session):
        """Analyst can update alert status to UNDER_INVESTIGATION and add notes."""
        list_res = client.get("/api/alerts?page_size=1")
        alert_id = list_res.json()["items"][0]["id"]

        update_res = client.patch(f"/api/alerts/{alert_id}", json={
            "status": "UNDER_INVESTIGATION",
            "notes": "Analyst initiated secondary review with customer contact center."
        })
        assert update_res.status_code == 200
        data = update_res.json()
        assert data["status"] == "UNDER_INVESTIGATION"
        assert "secondary review" in data["notes"]

        # Reject invalid status
        invalid_res = client.patch(f"/api/alerts/{alert_id}", json={
            "status": "NON_EXISTENT_STATUS"
        })
        assert invalid_res.status_code == 400
