import pytest
from fastapi.testclient import TestClient


class TestDashboardStats:
    """Tests the dashboard real-time aggregation metrics and updates after events."""

    def test_dashboard_stats_structure(self, client: TestClient):
        """Dashboard statistics endpoint must return all required metric fields and chart data."""
        res = client.get("/api/dashboard/stats")
        assert res.status_code == 200
        data = res.json()

        assert "summary" in data
        assert "risk_distribution" in data
        assert "activity_timeline" in data
        assert "recent_alerts" in data

        summary = data["summary"]
        expected_keys = [
            "total_events",
            "normal_count",
            "suspicious_count",
            "otp_requests_count",
            "manual_cases_count",
            "blocked_count",
            "total_alerts",
            "active_alerts",
        ]
        for k in expected_keys:
            assert k in summary
            assert isinstance(summary[k], int)

        assert len(data["risk_distribution"]) == 5

    def test_dashboard_stats_update_after_new_event(self, client: TestClient):
        """Simulating a critical block event updates total_events, blocked_count, and alerts."""
        before = client.get("/api/dashboard/stats").json()["summary"]

        # Simulate critical block
        client.post("/api/events/simulate", json={"scenario": "critical_block"})

        after = client.get("/api/dashboard/stats").json()["summary"]

        assert after["total_events"] == before["total_events"] + 1
        assert after["blocked_count"] == before["blocked_count"] + 1
        assert after["total_alerts"] == before["total_alerts"] + 1
