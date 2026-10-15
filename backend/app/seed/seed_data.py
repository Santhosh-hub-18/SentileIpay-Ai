import json
import random
import hashlib
from datetime import datetime, timezone, timedelta
from backend.app.database import SessionLocal
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.settings import RiskConfig
from backend.app.models.event import Event, RiskAssessment
from backend.app.models.alert import Alert, AnalystDecision
from backend.app.models.verification import OTPSession, VerificationCase
from backend.app.models.audit import AuditLog
from backend.app.services.auth_service import hash_password
from backend.app.services.scoring_engine import (
    DEFAULT_WEIGHTS,
    scoring_engine,
    get_risk_action_tier
)

SAMPLE_CUSTOMERS = [
    {"id": "CUST-1001", "name": "Elena Rostova", "email": "elena.r@example.com", "phone": "+1-555-0101", "city": "New York", "country": "United States", "device": "DEV-IPHONE-15-ELENA"},
    {"id": "CUST-1002", "name": "Marcus Vance", "email": "marcus.v@example.com", "phone": "+1-555-0102", "city": "Chicago", "country": "United States", "device": "DEV-MACBOOK-AIR-MV"},
    {"id": "CUST-1003", "name": "Amina Al-Mansoor", "email": "amina.m@example.com", "phone": "+1-555-0103", "city": "London", "country": "United Kingdom", "device": "DEV-SAMSUNG-S24-AA"},
    {"id": "CUST-1004", "name": "Hiroshi Tanaka", "email": "hiroshi.t@example.com", "phone": "+1-555-0104", "city": "San Francisco", "country": "United States", "device": "DEV-PIXEL-8-HT"},
    {"id": "CUST-1005", "name": "Clara Dubois", "email": "clara.d@example.com", "phone": "+1-555-0105", "city": "Paris", "country": "France", "device": "DEV-IPAD-PRO-CD"},
    {"id": "CUST-1006", "name": "Kwame Asante", "email": "kwame.a@example.com", "phone": "+1-555-0106", "city": "Toronto", "country": "Canada", "device": "DEV-DELL-XPS-KA"},
    {"id": "CUST-1007", "name": "Sofia Lindqvist", "email": "sofia.l@example.com", "phone": "+1-555-0107", "city": "Stockholm", "country": "Sweden", "device": "DEV-MAC-STUDIO-SL"},
    {"id": "CUST-1008", "name": "Devin O'Connor", "email": "devin.oc@example.com", "phone": "+1-555-0108", "city": "Dublin", "country": "Ireland", "device": "DEV-THINKPAD-DO"},
]

DEFAULT_ACTION_RANGES = [
    {
        "key": "NORMAL",
        "name": "Normal Risk",
        "min_score": 0,
        "max_score": 30,
        "color": "emerald",
        "action_label": "Approve Transaction",
        "description": "Low risk, transaction allowed to proceed without warning."
    },
    {
        "key": "SEND_MESSAGE",
        "name": "Medium Risk",
        "min_score": 31,
        "max_score": 50,
        "color": "amber",
        "action_label": "Send Security Advisory",
        "description": "Simulated security alert notification dispatched to customer."
    },
    {
        "key": "OTP_VERIFICATION",
        "name": "Elevated Risk",
        "min_score": 51,
        "max_score": 70,
        "color": "orange",
        "action_label": "OTP Verification Required",
        "description": "Demo OTP generated for secondary authentication check."
    },
    {
        "key": "CALL_VERIFICATION",
        "name": "High Risk",
        "min_score": 71,
        "max_score": 90,
        "color": "red",
        "action_label": "Call Verification Required",
        "description": "Queued for human SOC analyst manual phone verification."
    },
    {
        "key": "TEMPORARY_BLOCK",
        "name": "Critical Risk",
        "min_score": 91,
        "max_score": 100,
        "color": "rose",
        "action_label": "Temporary Block Applied",
        "description": "Simulated block applied to prevent further suspicious operations."
    }
]


def seed_database(force: bool = False):
    """Populates database with default analyst/admin accounts and ~40 realistic events."""
    db = SessionLocal()
    try:
        # Check if users already seeded
        existing_users = db.query(User).count()
        if existing_users > 0 and not force:
            return

        # 1. Seed Users (Analyst and Admin)
        analyst_user = User(
            username=settings.DEMO_ANALYST_USER,
            password_hash=hash_password(settings.DEMO_ANALYST_PASSWORD),
            role="analyst",
            full_name="Alex Rivera (SOC Lead)"
        )
        admin_user = User(
            username=settings.DEMO_ADMIN_USER,
            password_hash=hash_password(settings.DEMO_ADMIN_PASSWORD),
            role="admin",
            full_name="Samantha Sterling (SOC Admin)"
        )
        db.add_all([analyst_user, admin_user])
        db.commit()

        # 2. Seed Risk Configuration
        config_data = {
            "label_notice": "Configurable demonstration values, not validated fraud predictions",
            "criteria_weights": DEFAULT_WEIGHTS,
            "action_ranges": DEFAULT_ACTION_RANGES,
            "otp_expiry_seconds": 300,
            "max_otp_attempts": 3,
            "simulated_sms_template": (
                "Security alert: We detected unusual activity on your account. "
                "If this was not you, please contact your bank immediately."
            )
        }
        risk_cfg = RiskConfig(
            id="active_config",
            config_json=json.dumps(config_data),
            updated_by="SYSTEM"
        )
        db.add(risk_cfg)
        db.commit()

        # 3. Create ~40 realistic fictional events covering all 5 risk tiers
        now = datetime.now(timezone.utc)

        # Tier breakdown: 12 Normal, 8 Message, 8 OTP, 7 Call, 6 Block = 41 total events
        event_specs = []

        # 10 Normal events (0 - 30)
        for i in range(10):
            cust = SAMPLE_CUSTOMERS[i % len(SAMPLE_CUSTOMERS)]
            event_specs.append({
                "tier": "NORMAL",
                "customer": cust,
                "type": "PAYMENT" if i % 4 != 0 else "LOGIN",
                "amount": round(random.uniform(15.00, 55.00), 2) if i % 4 != 0 else 0.0,
                "device_known": True,
                "location_known": True,
                "city": cust["city"],
                "country": cust["country"],
                "failed_logins": 0,
                "hourly_tx": 1,
                "is_new_ben": False,
                "ben_name": "Local Supermarket" if i % 4 != 0 else None,
                "hour_offset": 14,
                "minutes_ago": (i * 30) + 10
            })

        # 8 Send Message events (31 - 50)
        # E.g. Unfamiliar device (15) + Unusual location (15) + 1 failed login (6) = 36 pts
        # E.g. Unusual amount (20) + Unfamiliar device (15) = 35 pts
        for i in range(8):
            cust = SAMPLE_CUSTOMERS[(i + 1) % len(SAMPLE_CUSTOMERS)]
            use_amt = (i % 2 == 0)
            event_specs.append({
                "tier": "SEND_MESSAGE",
                "customer": cust,
                "type": "PAYMENT",
                "amount": round(random.uniform(350.00, 480.00), 2) if use_amt else 65.00,
                "device_known": False,
                "location_known": True if use_amt else False,
                "city": cust["city"] if use_amt else "Manchester",
                "country": cust["country"] if use_amt else "United Kingdom",
                "failed_logins": 0 if use_amt else 1,
                "hourly_tx": 1,
                "is_new_ben": False,
                "ben_name": "Online Electronics Store",
                "hour_offset": 16,
                "minutes_ago": (i * 40) + 15
            })

        # 8 OTP Verification events (51 - 70)
        # E.g. Unfamiliar device (15) + Unusual location (15) + Failed logins (15) + Freq (10) = 55 pts
        for i in range(8):
            cust = SAMPLE_CUSTOMERS[(i + 2) % len(SAMPLE_CUSTOMERS)]
            is_login = (i % 2 == 0)
            event_specs.append({
                "tier": "OTP_VERIFICATION",
                "customer": cust,
                "type": "LOGIN" if is_login else "PAYMENT",
                "amount": 0.0 if is_login else 180.00,
                "device_known": False,
                "location_known": False,
                "city": "Frankfurt",
                "country": "Germany",
                "failed_logins": 3 if is_login else 2,
                "hourly_tx": 4,
                "is_new_ben": False,
                "ben_name": None if is_login else "Cloud Services Inc.",
                "hour_offset": 11,
                "minutes_ago": (i * 50) + 20
            })

        # 8 Call Verification events (71 - 90)
        # E.g. Amount (20) + Device (15) + Location (15) + New Ben (10) + Anomaly (10) + Time (5) = 75 pts
        for i in range(8):
            cust = SAMPLE_CUSTOMERS[(i + 3) % len(SAMPLE_CUSTOMERS)]
            event_specs.append({
                "tier": "CALL_VERIFICATION",
                "customer": cust,
                "type": "PAYMENT",
                "amount": round(random.uniform(2200.00, 3100.00), 2),
                "device_known": False,
                "location_known": False,
                "city": "Lagos",
                "country": "Nigeria",
                "failed_logins": 1,
                "hourly_tx": 2,
                "is_new_ben": True,
                "ben_name": f"International Wire Services Ref #{9021 + i}",
                "hour_offset": 2,
                "minutes_ago": (i * 60) + 30
            })

        # 7 Temporary Block events (91 - 100)
        # All criteria triggered = 95 - 100 pts
        for i in range(7):
            cust = SAMPLE_CUSTOMERS[(i + 4) % len(SAMPLE_CUSTOMERS)]
            event_specs.append({
                "tier": "TEMPORARY_BLOCK",
                "customer": cust,
                "type": "PAYMENT",
                "amount": round(random.uniform(5500.00, 9200.00), 2),
                "device_known": False,
                "location_known": False,
                "city": "Kyiv",
                "country": "Ukraine",
                "failed_logins": 4,
                "hourly_tx": 5,
                "is_new_ben": True,
                "ben_name": f"Untraceable P2P Exchange #{401 + i}",
                "hour_offset": 4,
                "minutes_ago": (i * 75) + 35
            })

        # Iterate and build events, assessments, alerts, and workflows
        for idx, spec in enumerate(event_specs):
            cust = spec["customer"]
            evt_time = (now - timedelta(minutes=spec["minutes_ago"])).replace(hour=spec["hour_offset"])
            event_id = f"EVT-SEED-{idx+1:03d}"

            event = Event(
                id=event_id,
                customer_id=cust["id"],
                customer_name=cust["name"],
                customer_email=cust["email"],
                customer_phone=cust["phone"],
                event_type=spec["type"],
                amount=spec["amount"],
                currency="USD",
                device_id=cust["device"] if spec["device_known"] else f"DEV-UNRECOGNIZED-{idx}",
                device_known=spec["device_known"],
                ip_address=f"198.51.{100 + (idx % 20)}.{10 + (idx % 80)}",
                location_city=spec["city"],
                location_country=spec["country"],
                location_known=spec["location_known"],
                beneficiary_id=f"BEN-{idx:04d}" if spec["ben_name"] else None,
                beneficiary_name=spec["ben_name"],
                is_new_beneficiary=spec["is_new_ben"],
                failed_login_attempts=spec["failed_logins"],
                hourly_transaction_count=spec["hourly_tx"],
                status="APPROVED",
                timestamp=evt_time,
                raw_payload=json.dumps({"seeded": True, "index": idx}),
            )
            db.add(event)
            db.flush()

            # Calculate score using scoring engine
            score, risk_lvl, rec_action, action_msg, delivery_status, breakdown = scoring_engine.evaluate_event(
                customer_id=cust["id"],
                event_type=spec["type"],
                amount=spec["amount"],
                device_known=spec["device_known"],
                location_known=spec["location_known"],
                failed_login_attempts=spec["failed_logins"],
                hourly_transaction_count=spec["hourly_tx"],
                is_new_beneficiary=spec["is_new_ben"],
                event_time=evt_time,
            )

            # Insert assessment
            assessment = RiskAssessment(
                id=f"RSK-SEED-{idx+1:03d}",
                event_id=event.id,
                total_score=score,
                risk_level=risk_lvl,
                recommended_action=rec_action,
                action_message=action_msg,
                delivery_status=delivery_status,
                criteria_breakdown=json.dumps([b.model_dump() for b in breakdown]),
                is_test_data=False,
                evaluated_at=evt_time,
            )
            db.add(assessment)

            # Audit record 1: Event Received
            db.add(AuditLog(
                event_id=event.id,
                action_type="EVENT_RECEIVED",
                actor="SYSTEM",
                details=json.dumps({"customer_id": cust["id"], "type": spec["type"], "amount": spec["amount"]}),
                timestamp=evt_time
            ))

            # Audit record 2: Score Calculated
            db.add(AuditLog(
                event_id=event.id,
                action_type="SCORE_CALCULATED",
                actor="SYSTEM",
                details=json.dumps({"score": score, "risk_level": risk_lvl, "action": rec_action}),
                timestamp=evt_time + timedelta(seconds=1)
            ))

            # Workflow objects per tier
            if risk_lvl == "NORMAL":
                event.status = "APPROVED"

            elif risk_lvl == "SEND_MESSAGE":
                event.status = "FLAGGED_NOTIFIED"
                alert = Alert(
                    id=f"ALT-SEED-{idx+1:03d}",
                    event_id=event.id,
                    score=score,
                    risk_level=risk_lvl,
                    status="NEW" if idx % 2 == 0 else "RESOLVED",
                    notes=action_msg,
                    created_at=evt_time,
                    updated_at=evt_time
                )
                db.add(alert)
                db.add(AuditLog(
                    event_id=event.id,
                    action_type="MESSAGE_SIMULATED",
                    actor="SYSTEM",
                    details=json.dumps({"channel": "SIMULATED_SMS", "status": delivery_status}),
                    timestamp=evt_time + timedelta(seconds=2)
                ))

            elif risk_lvl == "OTP_VERIFICATION":
                event.status = "PENDING_OTP" if idx % 2 == 0 else "VERIFIED"
                alert = Alert(
                    id=f"ALT-SEED-{idx+1:03d}",
                    event_id=event.id,
                    score=score,
                    risk_level=risk_lvl,
                    status="UNDER_INVESTIGATION" if idx % 2 == 0 else "RESOLVED",
                    notes="Requires Demo OTP Verification",
                    created_at=evt_time,
                    updated_at=evt_time
                )
                db.add(alert)
                demo_otp = f"{100000 + idx * 777 % 899999}"
                otp_hash = hashlib.sha256(demo_otp.encode()).hexdigest()
                db.add(OTPSession(
                    id=f"OTP-SEED-{idx+1:03d}",
                    event_id=event.id,
                    customer_id=cust["id"],
                    otp_hash=otp_hash,
                    demo_code_display=demo_otp,
                    expires_at=now + timedelta(minutes=15),
                    attempts=1 if idx % 2 != 0 else 0,
                    max_attempts=3,
                    status="VERIFIED" if idx % 2 != 0 else "PENDING",
                    created_at=evt_time
                ))
                db.add(AuditLog(
                    event_id=event.id,
                    action_type="OTP_REQUESTED",
                    actor="SYSTEM",
                    details=json.dumps({"status": "PENDING", "max_attempts": 3}),
                    timestamp=evt_time + timedelta(seconds=2)
                ))

            elif risk_lvl == "CALL_VERIFICATION":
                event.status = "PENDING_MANUAL_VERIFICATION" if idx % 2 == 0 else "VERIFIED"
                alert = Alert(
                    id=f"ALT-SEED-{idx+1:03d}",
                    event_id=event.id,
                    score=score,
                    risk_level=risk_lvl,
                    status="NEW" if idx % 2 == 0 else "RESOLVED",
                    notes="Call Verification Required",
                    created_at=evt_time,
                    updated_at=evt_time
                )
                db.add(alert)
                case = VerificationCase(
                    id=f"CASE-SEED-{idx+1:03d}",
                    event_id=event.id,
                    case_type="CALL_VERIFICATION",
                    status="PENDING" if idx % 2 == 0 else "VERIFIED",
                    reason=f"Score {score}/100. High-risk indicators triggered.",
                    simulated_phone=cust["phone"],
                    created_at=evt_time,
                    updated_at=evt_time
                )
                db.add(case)
                db.add(AuditLog(
                    event_id=event.id,
                    action_type="CALL_VERIFICATION_PENDING",
                    actor="SYSTEM",
                    details=json.dumps({"phone": cust["phone"], "case_id": case.id}),
                    timestamp=evt_time + timedelta(seconds=2)
                ))
                if idx % 2 != 0:
                    # Seed analyst decision for resolved case
                    db.add(AnalystDecision(
                        id=f"DEC-SEED-{idx+1:03d}",
                        event_id=event.id,
                        case_id=case.id,
                        analyst_username=settings.DEMO_ANALYST_USER,
                        action="VERIFIED",
                        notes="Simulated customer confirmed identity and payment intention via manual phone verification checklist.",
                        timestamp=evt_time + timedelta(minutes=5)
                    ))
                    db.add(AuditLog(
                        event_id=event.id,
                        action_type="ANALYST_DECISION",
                        actor=settings.DEMO_ANALYST_USER,
                        details=json.dumps({"action": "VERIFIED", "case_id": case.id}),
                        timestamp=evt_time + timedelta(minutes=5)
                    ))

            elif risk_lvl == "TEMPORARY_BLOCK":
                event.status = "TEMPORARILY_BLOCKED" if idx % 2 == 0 else "RELEASED"
                alert = Alert(
                    id=f"ALT-SEED-{idx+1:03d}",
                    event_id=event.id,
                    score=score,
                    risk_level=risk_lvl,
                    status="UNDER_INVESTIGATION" if idx % 2 == 0 else "RESOLVED",
                    notes=f"Temporarily Blocked (Score {score}). Critical risk indicators triggered.",
                    created_at=evt_time,
                    updated_at=evt_time
                )
                db.add(alert)
                db.add(AuditLog(
                    event_id=event.id,
                    action_type="BLOCK_APPLIED",
                    actor="SYSTEM",
                    details=json.dumps({"score": score, "note": "Simulated block – no real financial accounts affected"}),
                    timestamp=evt_time + timedelta(seconds=2)
                ))
                if idx % 2 != 0:
                    db.add(AnalystDecision(
                        id=f"DEC-SEED-{idx+1:03d}",
                        event_id=event.id,
                        analyst_username=settings.DEMO_ANALYST_USER,
                        action="RELEASED",
                        notes="Senior analyst security review concluded legitimate overseas business transaction after secondary KYC check.",
                        timestamp=evt_time + timedelta(minutes=12)
                    ))
                    db.add(AuditLog(
                        event_id=event.id,
                        action_type="BLOCK_RELEASED",
                        actor=settings.DEMO_ANALYST_USER,
                        details=json.dumps({"reason": "Senior review verified KYC"}),
                        timestamp=evt_time + timedelta(minutes=12)
                    ))

        db.commit()
    finally:
        db.close()
