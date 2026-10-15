import pytest
from fastapi.testclient import TestClient
from backend.app.models.verification import VerificationCase
from backend.app.models.alert import AnalystDecision
from backend.app.models.audit import AuditLog
from backend.app.models.event import Event


class TestAnalystActions:
    """Tests human-in-the-loop analyst decisions for call cases and block releases."""

    def test_call_verification_decision_flow(self, client: TestClient, db_session):
        """Analyst can verify a high-risk call verification case with mandatory notes."""
        # Simulate high-risk payment to create a case
        sim_res = client.post("/api/events/simulate", json={"scenario": "high_risk_payment"})
        assert sim_res.status_code == 201
        event_id = sim_res.json()["id"]

        cases_res = client.get("/api/verification/cases?status=PENDING")
        assert cases_res.status_code == 200
        cases = cases_res.json()["items"]
        target_case = next((c for c in cases if c["event_id"] == event_id), cases[0])
        case_id = target_case["id"]

        # Submit decision
        dec_payload = {
            "action": "VERIFIED",
            "notes": "Spoke directly with customer via primary phone. Authorized transfer confirmed."
        }
        dec_res = client.post(f"/api/verification/cases/{case_id}/decision", json=dec_payload)
        assert dec_res.status_code == 200
        data = dec_res.json()
        assert data["success"] is True
        assert data["action"] == "VERIFIED"

        # Verify DB state
        db_session.expire_all()
        case = db_session.query(VerificationCase).filter(VerificationCase.id == case_id).first()
        assert case.status == "VERIFIED"

        # Check analyst decision record exists
        decision_rec = db_session.query(AnalystDecision).filter(
            AnalystDecision.case_id == case_id
        ).first()
        assert decision_rec is not None
        assert decision_rec.action == "VERIFIED"

        # Check audit log
        audit = db_session.query(AuditLog).filter(
            AuditLog.event_id == case.event_id,
            AuditLog.action_type == "ANALYST_DECISION"
        ).first()
        assert audit is not None

    def test_call_verification_requires_notes(self, client: TestClient):
        """Decisions without analyst notes must be rejected with HTTP 422."""
        cases_res = client.get("/api/verification/cases")
        case_id = cases_res.json()["items"][0]["id"]

        res = client.post(f"/api/verification/cases/{case_id}/decision", json={
            "action": "VERIFIED",
            "notes": "   "  # Invalid whitespace
        })
        assert res.status_code == 422

    def test_block_release_workflow(self, client: TestClient, db_session):
        """Senior analyst can release a simulated block with mandatory justification reason."""
        sim_res = client.post("/api/events/simulate", json={"scenario": "critical_block"})
        assert sim_res.status_code == 201
        event_id = sim_res.json()["id"]

        # Check event is blocked
        db_session.expire_all()
        event = db_session.query(Event).filter(Event.id == event_id).first()
        assert event.status == "TEMPORARILY_BLOCKED"

        # Release block
        release_res = client.post(f"/api/blocked-transactions/{event_id}/decision", json={
            "action": "RELEASE",
            "reason": "Secondary KYC validation verified customer identity and emergency wire legitimacy."
        })
        assert release_res.status_code == 200
        assert release_res.json()["success"] is True
        assert release_res.json()["new_status"] == "RELEASED"

        # Verify DB state
        db_session.expire_all()
        updated_event = db_session.query(Event).filter(Event.id == event_id).first()
        assert updated_event.status == "RELEASED"

        # Verify audit log
        audit = db_session.query(AuditLog).filter(
            AuditLog.event_id == event_id,
            AuditLog.action_type == "BLOCK_RELEASED"
        ).first()
        assert audit is not None

    def test_block_release_requires_reason(self, client: TestClient):
        """Block release without justification reason is rejected with HTTP 422."""
        blocks_res = client.get("/api/blocked-transactions")
        event_id = blocks_res.json()["items"][0]["id"]

        res = client.post(f"/api/blocked-transactions/{event_id}/decision", json={
            "action": "RELEASE",
            "reason": "no"  # Too short
        })
        assert res.status_code == 422
