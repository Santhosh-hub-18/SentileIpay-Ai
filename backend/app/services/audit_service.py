import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.audit import AuditLog


def sanitize_audit_payload(details: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes sensitive information from audit log payloads."""
    clean = {}
    for k, v in details.items():
        if k in ("password", "password_hash", "token", "plain_otp"):
            clean[k] = "[REDACTED_SECURITY_DATA]"
        elif isinstance(v, dict):
            clean[k] = sanitize_audit_payload(v)
        else:
            clean[k] = v
    return clean


def log_audit(
    db: Session,
    action_type: str,
    actor: str = "SYSTEM",
    details: Optional[Dict[str, Any]] = None,
    event_id: Optional[str] = None,
    deduplicate_window_seconds: int = 2,
) -> AuditLog:
    """
    Creates an immutable audit log record.
    Prevents duplicate audit entries within a small time window for the same action and event.
    """
    now = datetime.now(timezone.utc)
    details = details or {}
    sanitized_details = sanitize_audit_payload(details)

    # Check for recent duplicate
    if event_id and deduplicate_window_seconds > 0:
        cutoff = now - timedelta(seconds=deduplicate_window_seconds)
        existing = db.query(AuditLog).filter(
            AuditLog.event_id == event_id,
            AuditLog.action_type == action_type,
            AuditLog.timestamp >= cutoff
        ).first()
        if existing:
            return existing

    log_entry = AuditLog(
        event_id=event_id,
        action_type=action_type,
        actor=actor,
        details=json.dumps(sanitized_details),
        timestamp=now
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
