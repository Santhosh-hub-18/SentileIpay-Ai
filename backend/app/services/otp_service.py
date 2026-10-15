import hashlib
import random
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.event import Event
from backend.app.models.alert import Alert
from backend.app.models.verification import OTPSession
from backend.app.services.audit_service import log_audit


def generate_otp_pair() -> Tuple[str, str]:
    """Generates a random 6-digit numeric OTP and its SHA-256 hash."""
    code = f"{random.randint(100000, 999999)}"
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    return code, code_hash


def request_or_renew_otp(db: Session, event_id: str, actor: str = "SYSTEM") -> OTPSession:
    """Creates or resets an OTP session for an event, resetting attempts and issuing a new code."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")

    code, code_hash = generate_otp_pair()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=5)

    otp_session = db.query(OTPSession).filter(OTPSession.event_id == event_id).first()
    if otp_session:
        otp_session.otp_hash = code_hash
        otp_session.demo_code_display = code
        otp_session.expires_at = expires_at
        otp_session.attempts = 0
        otp_session.status = "PENDING"
    else:
        otp_session = OTPSession(
            event_id=event.id,
            customer_id=event.customer_id,
            otp_hash=code_hash,
            demo_code_display=code,
            expires_at=expires_at,
            attempts=0,
            max_attempts=3,
            status="PENDING",
            created_at=now
        )
        db.add(otp_session)

    log_audit(
        db=db,
        action_type="OTP_REQUESTED",
        actor=actor,
        details={
            "expires_in_minutes": 5,
            "max_attempts": 3,
            "notice": "Demo OTP session created – plaintext code displayed only in demo UI"
        },
        event_id=event_id
    )

    db.commit()
    db.refresh(otp_session)
    return otp_session


def verify_otp_submission(
    db: Session,
    event_id: str,
    submitted_code: str,
    actor: str = "CUSTOMER_SIMULATOR"
) -> Dict[str, Any]:
    """
    Verifies an OTP attempt against the stored SHA-256 hash.
    Enforces expiration check, attempts lockout, audit logging, and event/alert status updates.
    """
    otp_session = db.query(OTPSession).filter(OTPSession.event_id == event_id).first()
    if not otp_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No OTP session found for event {event_id}"
        )

    now = datetime.now(timezone.utc)

    # 1. Check if already verified
    if otp_session.status == "VERIFIED":
        return {
            "success": True,
            "status": "VERIFIED",
            "message": "OTP has already been verified for this transaction.",
            "attempts_remaining": otp_session.max_attempts - otp_session.attempts
        }

    # 2. Check if locked out
    if otp_session.status == "LOCKED_OUT" or otp_session.attempts >= otp_session.max_attempts:
        otp_session.status = "LOCKED_OUT"
        db.commit()
        return {
            "success": False,
            "status": "LOCKED_OUT",
            "message": "Maximum verification attempts exceeded. Session locked out.",
            "attempts_remaining": 0
        }

    # Make expires_at timezone-aware if needed
    session_expiry = otp_session.expires_at
    if session_expiry.tzinfo is None:
        session_expiry = session_expiry.replace(tzinfo=timezone.utc)

    # 3. Check expiration
    if now > session_expiry:
        otp_session.status = "EXPIRED"
        log_audit(
            db=db,
            action_type="OTP_FAILED",
            actor=actor,
            details={"reason": "OTP expired"},
            event_id=event_id
        )
        db.commit()
        return {
            "success": False,
            "status": "EXPIRED",
            "message": "Verification code has expired. Please request a new demo code.",
            "attempts_remaining": max(0, otp_session.max_attempts - otp_session.attempts)
        }

    # 4. Increment attempt counter
    otp_session.attempts += 1
    input_hash = hashlib.sha256(submitted_code.strip().encode("utf-8")).hexdigest()

    # 5. Check hash match
    if input_hash == otp_session.otp_hash:
        otp_session.status = "VERIFIED"

        # Update event and alert status
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.status = "VERIFIED"

        alert = db.query(Alert).filter(Alert.event_id == event_id).first()
        if alert:
            alert.status = "RESOLVED"
            alert.notes = (alert.notes or "") + " [Resolved via Demo OTP Verification]"

        log_audit(
            db=db,
            action_type="OTP_VERIFIED",
            actor=actor,
            details={
                "attempt_number": otp_session.attempts,
                "outcome": "SUCCESS",
                "notice": "Simulated authentication confirmed"
            },
            event_id=event_id
        )

        db.commit()
        return {
            "success": True,
            "status": "VERIFIED",
            "message": "OTP verified successfully. Simulated authentication confirmed.",
            "attempts_remaining": otp_session.max_attempts - otp_session.attempts
        }

    else:
        # Invalid code
        remaining = max(0, otp_session.max_attempts - otp_session.attempts)
        if remaining == 0:
            otp_session.status = "LOCKED_OUT"
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                event.status = "VERIFICATION_FAILED"

            log_audit(
                db=db,
                action_type="OTP_LOCKED",
                actor=actor,
                details={
                    "attempts": otp_session.attempts,
                    "max_attempts": otp_session.max_attempts,
                    "outcome": "LOCKED_OUT"
                },
                event_id=event_id
            )
            db.commit()
            return {
                "success": False,
                "status": "LOCKED_OUT",
                "message": "Incorrect verification code. Maximum attempts reached. Session locked out.",
                "attempts_remaining": 0
            }

        log_audit(
            db=db,
            action_type="OTP_FAILED",
            actor=actor,
            details={
                "attempt_number": otp_session.attempts,
                "attempts_remaining": remaining,
                "outcome": "INVALID_CODE"
            },
            event_id=event_id
        )
        db.commit()
        return {
            "success": False,
            "status": "PENDING",
            "message": f"Incorrect verification code. {remaining} attempt(s) remaining.",
            "attempts_remaining": remaining
        }
