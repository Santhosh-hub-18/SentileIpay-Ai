import pytest
from fastapi.testclient import TestClient


class TestEventsApi:
    """Tests the Events REST API endpoints and simulation mechanics."""

    def test_health_check(self, client: TestClient):
        """Verifies health check endpoint status and disclaimers."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["simulation_mode"] is True
        assert "simulated" in data["disclaimer"].lower()

    def test_ingest_normal_event_not_flagged(self, client: TestClient):
        """A normal transaction within customer baseline should be approved with score <= 30."""
        payload = {
            "customer_id": "CUST-1001",
            "customer_name": "Elena Rostova",
            "event_type": "PAYMENT",
            "amount": 25.00,
            "currency": "USD",
            "device_id": "DEV-IPHONE-15-ELENA",
            "device_known": True,
            "ip_address": "198.51.100.22",
            "location_city": "New York",
            "location_country": "United States",
            "location_known": True,
            "failed_login_attempts": 0,
            "hourly_transaction_count": 1,
            "is_new_beneficiary": False,
        }
        response = client.post("/api/events", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "APPROVED"

        ra = data["risk_assessment"]
        assert ra is not None
        assert ra["total_score"] <= 30
        assert ra["risk_level"] == "NORMAL"
        assert ra["recommended_action"] == "Approve Transaction"
        assert ra["is_test_data"] is False

    def test_criteria_breakdown_point_attribution(self, client: TestClient):
        """Criteria breakdown must list points and triggered flag without double-counting."""
        payload = {
            "customer_id": "CUST-1001",
            "customer_name": "Elena Rostova",
            "event_type": "PAYMENT",
            "amount": 4200.00,  # Triggers unusual amount (20) & anomaly (10)
            "device_id": "DEV-NEW-TABLET",
            "device_known": False,  # Triggers unfamiliar device (15)
            "ip_address": "198.51.100.99",
            "location_city": "New York",
            "location_country": "United States",
            "location_known": True,
            "failed_login_attempts": 0,
            "hourly_transaction_count": 1,
            "is_new_beneficiary": False,
        }
        response = client.post("/api/events", json=payload)
        assert response.status_code == 201
        data = response.json()
        ra = data["risk_assessment"]
        assert ra is not None

        criteria_map = {c["criterion"]: c for c in ra["criteria_breakdown"]}
        assert criteria_map["unusual_amount"]["triggered"] is True
        assert criteria_map["unusual_amount"]["points"] == 20

        assert criteria_map["unfamiliar_device"]["triggered"] is True
        assert criteria_map["unfamiliar_device"]["points"] == 15

        assert criteria_map["unusual_location"]["triggered"] is False
        assert criteria_map["unusual_location"]["points"] == 0

        # Total points match sum of individual points
        summed_points = sum(c["points"] for c in ra["criteria_breakdown"])
        assert ra["total_score"] == min(100, summed_points)

    def test_simulate_presets(self, client: TestClient):
        """Verifies simulation presets: normal, suspicious_tx, critical_block."""
        for scenario, expected_level in [
            ("normal", "NORMAL"),
            ("suspicious_tx", "SEND_MESSAGE"),
            ("critical_block", "TEMPORARY_BLOCK"),
        ]:
            res = client.post("/api/events/simulate", json={"scenario": scenario})
            assert res.status_code == 201
            data = res.json()
            assert data["risk_assessment"]["risk_level"] == expected_level

    @pytest.mark.parametrize("score,expected_tier", [
        (0, "NORMAL"),
        (30, "NORMAL"),
        (31, "SEND_MESSAGE"),
        (50, "SEND_MESSAGE"),
        (51, "OTP_VERIFICATION"),
        (70, "OTP_VERIFICATION"),
        (71, "CALL_VERIFICATION"),
        (90, "CALL_VERIFICATION"),
        (91, "TEMPORARY_BLOCK"),
        (100, "TEMPORARY_BLOCK"),
    ])
    def test_test_score_endpoint_boundaries(self, client: TestClient, score: int, expected_tier: str):
        """Verifies the /api/events/test-score endpoint for all boundary values."""
        res = client.post("/api/events/test-score", json={"score": score})
        assert res.status_code == 201
        data = res.json()
        ra = data["risk_assessment"]
        assert ra["total_score"] == score
        assert ra["risk_level"] == expected_tier
        assert ra["is_test_data"] is True

    @pytest.mark.parametrize("invalid_score", [-1, 101, 999])
    def test_test_score_endpoint_rejects_out_of_bounds(self, client: TestClient, invalid_score: int):
        """Scores < 0 or > 100 must be rejected with HTTP 422."""
        res = client.post("/api/events/test-score", json={"score": invalid_score})
        assert res.status_code == 422

    def test_list_events_and_filtering(self, client: TestClient):
        """Lists events and tests filtering by risk level."""
        res = client.get("/api/events?page=1&page_size=10")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert data["total"] > 0
        assert len(data["items"]) <= 10

        # Filter by risk level
        res_filtered = client.get("/api/events?risk_level=TEMPORARY_BLOCK")
        assert res_filtered.status_code == 200
        filtered_data = res_filtered.json()
        for item in filtered_data["items"]:
            assert item["risk_assessment"]["risk_level"] == "TEMPORARY_BLOCK"

    def test_get_event_by_id(self, client: TestClient):
        """Retrieves single event by ID."""
        list_res = client.get("/api/events?page_size=1")
        item_id = list_res.json()["items"][0]["id"]

        res = client.get(f"/api/events/{item_id}")
        assert res.status_code == 200
        assert res.json()["id"] == item_id
