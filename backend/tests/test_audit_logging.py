import pytest
from fastapi.testclient import TestClient
from backend.app.services.audit_service import sanitize_audit_payload, log_audit


class TestAuditLogging:
    """Tests the audit trail, sanitization, and deduplication logic."""

    def test_sensitive_field_redaction(self):
        """Audit logging must redact passwords, tokens, and raw credentials."""
        dirty_payload = {
            "username": "analyst",
            "password": "SecretPassword123!",
            "token": "jwt.header.payload.signature",
            "metadata": {
                "plain_otp": "839210",
                "safe_field": "public_reference"
            }
        }
        clean = sanitize_audit_payload(dirty_payload)
        assert clean["password"] == "[REDACTED_SECURITY_DATA]"
        assert clean["token"] == "[REDACTED_SECURITY_DATA]"
        assert clean["metadata"]["plain_otp"] == "[REDACTED_SECURITY_DATA]"
        assert clean["metadata"]["safe_field"] == "public_reference"

    def test_audit_logs_created_on_event_ingestion(self, client: TestClient):
        """Creating an event must generate corresponding audit logs."""
        payload = {
            "customer_id": "CUST-1002",
            "customer_name": "Marcus Vance",
            "event_type": "PAYMENT",
            "amount": 45.00,
            "currency": "USD",
            "device_id": "DEV-MACBOOK-AIR-MV",
            "device_known": True,
            "ip_address": "198.51.100.55",
            "location_city": "Chicago",
            "location_country": "United States",
            "location_known": True,
            "failed_login_attempts": 0,
            "hourly_transaction_count": 1,
            "is_new_beneficiary": False,
        }
        res = client.post("/api/events", json=payload)
        assert res.status_code == 201
        event_id = res.json()["id"]

        # Fetch audit logs for this event
        audit_res = client.get(f"/api/audit-logs?event_id={event_id}")
        assert audit_res.status_code == 200
        logs = audit_res.json()["items"]
        action_types = [l["action_type"] for l in logs]

        assert "EVENT_RECEIVED" in action_types
        assert "SCORE_CALCULATED" in action_types
        for log in logs:
            assert log["event_id"] == event_id
            assert "timestamp" in log

    def test_deduplication_prevents_duplicate_logs(self, db_session):
        """Logging the same action on the same event within the deduplication window returns existing record."""
        log1 = log_audit(
            db=db_session,
            action_type="SETTINGS_UPDATED",
            actor="SYSTEM",
            details={"key": "threshold"},
            event_id="EVT-DEDUP-TEST",
            deduplicate_window_seconds=2
        )
        log2 = log_audit(
            db=db_session,
            action_type="SETTINGS_UPDATED",
            actor="SYSTEM",
            details={"key": "threshold"},
            event_id="EVT-DEDUP-TEST",
            deduplicate_window_seconds=2
        )
        assert log1.id == log2.id
