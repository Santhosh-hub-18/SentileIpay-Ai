import json
import random
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.event import Event, RiskAssessment
from backend.app.models.alert import Alert
from backend.app.models.verification import OTPSession, VerificationCase
from backend.app.schemas.event import EventCreate, TestScoreRequest
from backend.app.services.scoring_engine import scoring_engine
from backend.app.services.audit_service import log_audit


def generate_demo_otp() -> tuple[str, str]:
    """Generates a random 6-digit OTP and its SHA-256 hash."""
    code = f"{random.randint(100000, 999999)}"
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    return code, code_hash


def process_event_evaluation(db: Session, event: Event, actor: str = "SYSTEM") -> Event:
    """
    Evaluates risk score for an event, persists assessment, raises appropriate alerts,
    initializes verification workflows, and logs audit entries.
    """
    # 1. Log receipt of event
    log_audit(
        db=db,
        action_type="EVENT_RECEIVED",
        actor=actor,
        details={
            "customer_id": event.customer_id,
            "type": event.event_type,
            "amount": event.amount,
            "currency": event.currency,
            "device_id": event.device_id,
            "location": f"{event.location_city}, {event.location_country}",
        },
        event_id=event.id
    )

    # 2. Server-side score calculation
    score, risk_level, recommended_action, action_msg, delivery_status, breakdown = scoring_engine.evaluate_event(
        customer_id=event.customer_id,
        event_type=event.event_type,
        amount=event.amount,
        device_known=event.device_known,
        location_known=event.location_known,
        failed_login_attempts=event.failed_login_attempts,
        hourly_transaction_count=event.hourly_transaction_count,
        is_new_beneficiary=event.is_new_beneficiary,
        event_time=event.timestamp or datetime.now(timezone.utc),
    )

    # 3. Create RiskAssessment record
    assessment = RiskAssessment(
        event_id=event.id,
        total_score=score,
        risk_level=risk_level,
        recommended_action=recommended_action,
        action_message=action_msg,
        delivery_status=delivery_status,
        criteria_breakdown=json.dumps([b.model_dump() for b in breakdown]),
        is_test_data=False,
        evaluated_at=datetime.now(timezone.utc)
    )
    db.add(assessment)
    db.flush()

    # 4. Log score calculation audit
    log_audit(
        db=db,
        action_type="SCORE_CALCULATED",
        actor="SYSTEM",
        details={
            "score": score,
            "risk_level": risk_level,
            "action": recommended_action,
            "triggered_criteria": [b.criterion for b in breakdown if b.triggered],
        },
        event_id=event.id
    )

    # 5. Apply tier-specific workflows
    if risk_level == "NORMAL":
        event.status = "APPROVED"

    elif risk_level == "SEND_MESSAGE":
        event.status = "FLAGGED_NOTIFIED"
        alert = Alert(
            event_id=event.id,
            score=score,
            risk_level=risk_level,
            status="NEW",
            notes=action_msg
        )
        db.add(alert)
        log_audit(
            db=db,
            action_type="MESSAGE_SIMULATED",
            actor="SYSTEM",
            details={
                "message": action_msg,
                "delivery_status": delivery_status,
                "channel": "SIMULATED_SMS"
            },
            event_id=event.id
        )

    elif risk_level == "OTP_VERIFICATION":
        event.status = "PENDING_OTP"
        alert = Alert(
            event_id=event.id,
            score=score,
            risk_level=risk_level,
            status="NEW",
            notes="Requires Demo OTP Verification"
        )
        db.add(alert)

        code, code_hash = generate_demo_otp()
        otp_session = OTPSession(
            event_id=event.id,
            customer_id=event.customer_id,
            otp_hash=code_hash,
            demo_code_display=code,  # For demo UI inspectability
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            attempts=0,
            max_attempts=3,
            status="PENDING"
        )
        db.add(otp_session)
        log_audit(
            db=db,
            action_type="OTP_REQUESTED",
            actor="SYSTEM",
            details={
                "expiry_minutes": 5,
                "max_attempts": 3,
                "label": "demo – not production authentication"
            },
            event_id=event.id
        )

    elif risk_level == "CALL_VERIFICATION":
        event.status = "PENDING_MANUAL_VERIFICATION"
        alert = Alert(
            event_id=event.id,
            score=score,
            risk_level=risk_level,
            status="NEW",
            notes="Call Verification Required"
        )
        db.add(alert)

        case = VerificationCase(
            event_id=event.id,
            case_type="CALL_VERIFICATION",
            status="PENDING",
            reason=f"Score {score}/100. High-risk indicators triggered.",
            simulated_phone=event.customer_phone or "+1-555-0199"
        )
        db.add(case)
        log_audit(
            db=db,
            action_type="CALL_VERIFICATION_PENDING",
            actor="SYSTEM",
            details={
                "reason": case.reason,
                "phone": case.simulated_phone,
                "note": "Simulated call queue - no real call placed"
            },
            event_id=event.id
        )

    elif risk_level == "TEMPORARY_BLOCK":
        event.status = "TEMPORARILY_BLOCKED"
        alert = Alert(
            event_id=event.id,
            score=score,
            risk_level=risk_level,
            status="NEW",
            notes=f"Temporarily Blocked (Score {score}). Critical risk indicators triggered."
        )
        db.add(alert)
        log_audit(
            db=db,
            action_type="BLOCK_APPLIED",
            actor="SYSTEM",
            details={
                "reason": "Score exceeded critical block threshold (>= 91)",
                "explanation": action_msg,
                "note": "Simulated block – no real financial accounts affected"
            },
            event_id=event.id
        )

    db.commit()
    db.refresh(event)
    return event


def create_event(db: Session, data: EventCreate, actor: str = "SYSTEM") -> Event:
    """Creates a new event from incoming payload and processes risk evaluation."""
    event = Event(
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        customer_phone=data.customer_phone,
        event_type=data.event_type.upper(),
        amount=data.amount,
        currency=data.currency,
        device_id=data.device_id,
        device_known=data.device_known,
        ip_address=data.ip_address,
        location_city=data.location_city,
        location_country=data.location_country,
        location_known=data.location_known,
        beneficiary_id=data.beneficiary_id,
        beneficiary_name=data.beneficiary_name,
        is_new_beneficiary=data.is_new_beneficiary,
        failed_login_attempts=data.failed_login_attempts,
        hourly_transaction_count=data.hourly_transaction_count,
        timestamp=data.timestamp or datetime.now(timezone.utc),
        raw_payload=json.dumps(data.model_dump(), default=str),
    )
    db.add(event)
    db.flush()
    return process_event_evaluation(db, event, actor=actor)


def create_test_score_event(db: Session, req: TestScoreRequest, actor: str = "ANALYST_TEST") -> Event:
    """
    Creates an event with an explicitly assigned test score (0-100).
    Strictly adheres to exact boundaries and is flagged as 'TEST DATA'.
    """
    if req.score < 0 or req.score > 100:
        raise ValueError("Score must be between 0 and 100")

    risk_level, recommended_action, action_msg, delivery_status, breakdown = scoring_engine.evaluate_test_score(req.score)

    event = Event(
        customer_id="CUST-TEST-001",
        customer_name=req.customer_name or "Test Subject Alpha",
        customer_email="test.subject@example.com",
        customer_phone="+1-555-0100",
        event_type=req.event_type or "PAYMENT",
        amount=req.amount or 100.0,
        currency="USD",
        device_id="DEV-TEST-ENVIRONMENT",
        device_known=True,
        ip_address="127.0.0.1",
        location_city="Test City",
        location_country="Testland",
        location_known=True,
        beneficiary_id="BEN-TEST",
        beneficiary_name="Test Beneficiary",
        is_new_beneficiary=False,
        failed_login_attempts=0,
        hourly_transaction_count=1,
        status="TEST_DATA",
        timestamp=datetime.now(timezone.utc),
        raw_payload=json.dumps(req.model_dump(), default=str),
    )
    db.add(event)
    db.flush()

    assessment = RiskAssessment(
        event_id=event.id,
        total_score=req.score,
        risk_level=risk_level,
        recommended_action=recommended_action,
        action_message=action_msg,
        delivery_status=delivery_status,
        criteria_breakdown=json.dumps([b.model_dump() for b in breakdown]),
        is_test_data=True,
        evaluated_at=datetime.now(timezone.utc)
    )
    db.add(assessment)

    # Workflow items for test
    if risk_level == "SEND_MESSAGE":
        event.status = "FLAGGED_NOTIFIED"
        db.add(Alert(event_id=event.id, score=req.score, risk_level=risk_level, status="NEW", notes="[TEST DATA] " + action_msg))
    elif risk_level == "OTP_VERIFICATION":
        event.status = "PENDING_OTP"
        db.add(Alert(event_id=event.id, score=req.score, risk_level=risk_level, status="NEW", notes="[TEST DATA] Requires Demo OTP"))
        code, code_hash = generate_demo_otp()
        db.add(OTPSession(
            event_id=event.id,
            customer_id=event.customer_id,
            otp_hash=code_hash,
            demo_code_display=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            status="PENDING"
        ))
    elif risk_level == "CALL_VERIFICATION":
        event.status = "PENDING_MANUAL_VERIFICATION"
        db.add(Alert(event_id=event.id, score=req.score, risk_level=risk_level, status="NEW", notes="[TEST DATA] Call Verification Required"))
        db.add(VerificationCase(
            event_id=event.id,
            case_type="CALL_VERIFICATION",
            status="PENDING",
            reason=f"[TEST DATA] Score {req.score}/100 test case.",
            simulated_phone="+1-555-0100"
        ))
    elif risk_level == "TEMPORARY_BLOCK":
        event.status = "TEMPORARILY_BLOCKED"
        db.add(Alert(event_id=event.id, score=req.score, risk_level=risk_level, status="NEW", notes=f"[TEST DATA] Blocked (Score {req.score})"))

    log_audit(
        db=db,
        action_type="SCORE_CALCULATED",
        actor=actor,
        details={
            "score": req.score,
            "risk_level": risk_level,
            "action": recommended_action,
            "label": "TEST DATA",
        },
        event_id=event.id
    )

    db.commit()
    db.refresh(event)
    return event


def simulate_preset(db: Session, scenario: str) -> Event:
    """Generates an event based on a simulated preset scenario."""
    if scenario == "random":
        scenario = random.choice(["normal", "suspicious_tx", "suspicious_login", "high_risk_payment", "critical_block"])

    if scenario == "normal":
        # Score ~ 0 (NORMAL: 0-30)
        data = EventCreate(
            customer_id="CUST-1001",
            customer_name="Alice Morgan",
            customer_email="alice.morgan@example.com",
            customer_phone="+1-555-0144",
            event_type="PAYMENT",
            amount=38.50,
            currency="USD",
            device_id="DEV-IPHONE-ALICE",
            device_known=True,
            ip_address="198.51.100.12",
            location_city="Austin",
            location_country="United States",
            location_known=True,
            beneficiary_id="BEN-GROCERY-01",
            beneficiary_name="Whole Foods Market",
            is_new_beneficiary=False,
            failed_login_attempts=0,
            hourly_transaction_count=1,
            timestamp=datetime.now(timezone.utc).replace(hour=14),
        )
    elif scenario == "suspicious_tx":
        # Score ~ 35 (SEND_MESSAGE: 31-50): Unusual amount (20) + unfamiliar device (15) = 35
        data = EventCreate(
            customer_id="CUST-1002",
            customer_name="Brian Chen",
            customer_email="brian.chen@example.com",
            customer_phone="+1-555-0189",
            event_type="PAYMENT",
            amount=1650.00,
            currency="USD",
            device_id="DEV-LINUX-UNKNOWN",
            device_known=False,
            ip_address="203.0.113.88",
            location_city="Seattle",
            location_country="United States",
            location_known=True,
            beneficiary_id="BEN-ELEC-44",
            beneficiary_name="TechMart Online",
            is_new_beneficiary=False,
            failed_login_attempts=0,
            hourly_transaction_count=1,
            timestamp=datetime.now(timezone.utc).replace(hour=15),
        )
    elif scenario == "suspicious_login":
        # Score ~ 55-60 (OTP_VERIFICATION: 51-70): failed logins (15) + unfamiliar device (15) + unusual location (15) + unusual time (5) + freq (10) = 60
        data = EventCreate(
            customer_id="CUST-1004",
            customer_name="David Patel",
            customer_email="david.patel@example.com",
            customer_phone="+1-555-0162",
            event_type="LOGIN",
            amount=0.0,
            currency="USD",
            device_id="DEV-UNKNOWN-BROWSER",
            device_known=False,
            ip_address="185.220.101.5",
            location_city="Bucharest",
            location_country="Romania",
            location_known=False,
            is_new_beneficiary=False,
            failed_login_attempts=4,
            hourly_transaction_count=4,
            timestamp=datetime.now(timezone.utc).replace(hour=3),
        )
    elif scenario == "high_risk_payment":
        # Score ~ 75-80 (CALL_VERIFICATION: 71-90): amount (20) + unfamiliar device (15) + location (15) + new beneficiary (10) + anomaly (10) = 70+
        data = EventCreate(
            customer_id="CUST-1001",
            customer_name="Alice Morgan",
            customer_email="alice.morgan@example.com",
            customer_phone="+1-555-0144",
            event_type="PAYMENT",
            amount=3200.00,
            currency="USD",
            device_id="DEV-WINDOWS-ANON",
            device_known=False,
            ip_address="194.26.29.112",
            location_city="Lagos",
            location_country="Nigeria",
            location_known=False,
            beneficiary_id="BEN-WIRE-99",
            beneficiary_name="Global Offshore Holdings LLC",
            is_new_beneficiary=True,
            failed_login_attempts=1,
            hourly_transaction_count=2,
            timestamp=datetime.now(timezone.utc).replace(hour=2),
        )
    elif scenario == "critical_block":
        # Score ~ 95-100 (TEMPORARY_BLOCK: 91-100): all criteria
        data = EventCreate(
            customer_id="CUST-1004",
            customer_name="David Patel",
            customer_email="david.patel@example.com",
            customer_phone="+1-555-0162",
            event_type="PAYMENT",
            amount=4800.00,
            currency="USD",
            device_id="DEV-TOR-EXIT-NODE",
            device_known=False,
            ip_address="185.220.102.8",
            location_city="Kyiv",
            location_country="Ukraine",
            location_known=False,
            beneficiary_id="BEN-CRYPTO-EXCH",
            beneficiary_name="Instant P2P Crypto Exchange",
            is_new_beneficiary=True,
            failed_login_attempts=5,
            hourly_transaction_count=6,
            timestamp=datetime.now(timezone.utc).replace(hour=3),
        )
    else:
        raise ValueError(f"Unknown scenario: {scenario}")

    return create_event(db, data, actor="SIMULATOR")
