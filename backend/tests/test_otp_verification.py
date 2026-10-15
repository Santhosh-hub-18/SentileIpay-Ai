import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.models.verification import OTPSession
from backend.app.models.audit import AuditLog


class TestOTPVerification:
    """Tests the OTP lifecycle: generation, SHA-256 hashing, verification, lockout, and expiration."""

    def test_otp_request_and_hash_storage(self, client: TestClient, db_session):
        """Verifies OTP generation stores only a hash and returns demo code with demo label."""
        # Create an event requiring OTP via simulate preset
        sim_res = client.post("/api/events/simulate", json={"scenario": "suspicious_login"})
        assert sim_res.status_code == 201
        event_id = sim_res.json()["id"]

        # Request OTP
        req_res = client.post("/api/verification/otp/request", json={"event_id": event_id})
        assert req_res.status_code == 201
        data = req_res.json()

        assert "demo_code_display" in data
        assert len(data["demo_code_display"]) == 6
        assert data["status"] == "PENDING"
        assert "demo" in data["label"]

        # Verify only SHA-256 hash stored in DB
        db_session.expire_all()
        session_in_db = db_session.query(OTPSession).filter(OTPSession.event_id == event_id).first()
        assert session_in_db is not None
        assert len(session_in_db.otp_hash) == 64  # SHA-256 hex string length
        assert session_in_db.otp_hash != data["demo_code_display"]

    def test_otp_successful_verification(self, client: TestClient, db_session):
        """Entering the correct code marks session as VERIFIED and resolves alerts."""
        sim_res = client.post("/api/events/simulate", json={"scenario": "suspicious_login"})
        event_id = sim_res.json()["id"]

        # Request OTP to get code
        req_res = client.post("/api/verification/otp/request", json={"event_id": event_id})
        demo_code = req_res.json()["demo_code_display"]

        # Verify with correct code
        verify_res = client.post("/api/verification/otp/verify", json={
            "event_id": event_id,
            "code": demo_code
        })
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["success"] is True
        assert verify_data["status"] == "VERIFIED"

        # Check DB state
        db_session.expire_all()
        session = db_session.query(OTPSession).filter(OTPSession.event_id == event_id).first()
        assert session.status == "VERIFIED"

        # Check audit log created
        log = db_session.query(AuditLog).filter(
            AuditLog.event_id == event_id,
            AuditLog.action_type == "OTP_VERIFIED"
        ).first()
        assert log is not None

    def test_otp_invalid_code_decrements_attempts(self, client: TestClient):
        """Entering incorrect code decrements remaining attempts."""
        sim_res = client.post("/api/events/simulate", json={"scenario": "suspicious_login"})
        event_id = sim_res.json()["id"]

        client.post("/api/verification/otp/request", json={"event_id": event_id})

        # Submit wrong code
        res = client.post("/api/verification/otp/verify", json={
            "event_id": event_id,
            "code": "000000"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "PENDING"
        assert data["attempts_remaining"] == 2

    def test_otp_attempt_limits_and_lockout(self, client: TestClient, db_session):
        """Exceeding max attempts (3) locks out session and fails event verification."""
        sim_res = client.post("/api/events/simulate", json={"scenario": "suspicious_login"})
        event_id = sim_res.json()["id"]

        client.post("/api/verification/otp/request", json={"event_id": event_id})

        # Attempt 1
        client.post("/api/verification/otp/verify", json={"event_id": event_id, "code": "111111"})
        # Attempt 2
        client.post("/api/verification/otp/verify", json={"event_id": event_id, "code": "222222"})
        # Attempt 3 - Lockout
        res = client.post("/api/verification/otp/verify", json={"event_id": event_id, "code": "333333"})

        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "LOCKED_OUT"
        assert data["attempts_remaining"] == 0

        # Check audit log for lockout
        db_session.expire_all()
        lock_log = db_session.query(AuditLog).filter(
            AuditLog.event_id == event_id,
            AuditLog.action_type == "OTP_LOCKED"
        ).first()
        assert lock_log is not None

    def test_otp_expiration(self, client: TestClient, db_session):
        """Expired OTP cannot be verified and must be rejected."""
        sim_res = client.post("/api/events/simulate", json={"scenario": "suspicious_login"})
        event_id = sim_res.json()["id"]

        req_res = client.post("/api/verification/otp/request", json={"event_id": event_id})
        demo_code = req_res.json()["demo_code_display"]

        # Artificially set expiry into the past
        db_session.expire_all()
        session = db_session.query(OTPSession).filter(OTPSession.event_id == event_id).first()
        session.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        db_session.commit()

        # Submit code
        res = client.post("/api/verification/otp/verify", json={
            "event_id": event_id,
            "code": demo_code
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "EXPIRED"
