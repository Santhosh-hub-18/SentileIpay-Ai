from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.database import get_db
from backend.app.models.event import Event
from backend.app.models.alert import Alert, AnalystDecision
from backend.app.models.verification import OTPSession, VerificationCase
from backend.app.models.user import User
from backend.app.schemas.verification import (
    OTPRequest,
    OTPVerifyRequest,
    OTPVerifyResponse,
    OTPSessionResponse,
    CaseDecisionRequest,
    VerificationCaseResponse
)
from backend.app.services.otp_service import request_or_renew_otp, verify_otp_submission
from backend.app.services.audit_service import log_audit
from backend.app.api.deps import get_current_user
from backend.app.api.events import format_event_response

router = APIRouter(prefix="/verification", tags=["Verification"])


# -----------------------------------------------------------------------------
# OTP Verification Endpoints (Elevated Risk 51-70)
# -----------------------------------------------------------------------------

@router.post("/otp/request", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def request_otp(
    payload: OTPRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Generates a demo OTP session for an event.
    Stores only the SHA-256 hash in the database. Returns demo code for demo UI.
    """
    actor = user.username if user else "SYSTEM"
    session = request_or_renew_otp(db, payload.event_id, actor=actor)
    return {
        "id": session.id,
        "event_id": session.event_id,
        "customer_id": session.customer_id,
        "demo_code_display": session.demo_code_display,
        "expires_at": session.expires_at,
        "attempts": session.attempts,
        "max_attempts": session.max_attempts,
        "status": session.status,
        "label": "demo – not production authentication",
        "created_at": session.created_at,
    }


@router.post("/otp/verify", response_model=OTPVerifyResponse)
def verify_otp(
    payload: OTPVerifyRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Validates a submitted OTP against the stored SHA-256 hash.
    Enforces expiry, attempts limitation, and audit recording.
    """
    actor = user.username if user else "CUSTOMER_SIMULATOR"
    result = verify_otp_submission(db, payload.event_id, payload.code, actor=actor)
    return OTPVerifyResponse(**result)


@router.get("/otp/sessions", response_model=Dict[str, Any])
def list_otp_sessions(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, VERIFIED, EXPIRED, LOCKED_OUT)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists OTP sessions with customer reference, expiry, status, and demo codes."""
    query = db.query(OTPSession).join(Event)

    if status:
        query = query.filter(OTPSession.status == status.upper())

    total = query.count()
    offset = (page - 1) * page_size
    sessions = query.order_by(desc(OTPSession.created_at)).offset(offset).limit(page_size).all()

    items = []
    for s in sessions:
        items.append({
            "id": s.id,
            "event_id": s.event_id,
            "customer_id": s.customer_id,
            "demo_code_display": s.demo_code_display,
            "expires_at": s.expires_at,
            "attempts": s.attempts,
            "max_attempts": s.max_attempts,
            "status": s.status,
            "created_at": s.created_at,
            "event": format_event_response(s.event) if s.event else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
    }


# -----------------------------------------------------------------------------
# Call Verification Case Management (High Risk 71-90)
# -----------------------------------------------------------------------------

@router.get("/cases", response_model=Dict[str, Any])
def list_verification_cases(
    status: Optional[str] = Query(None, description="Filter by case status: PENDING, VERIFIED, ESCALATED, REJECTED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists manual phone call verification cases waiting for analyst triage."""
    query = db.query(VerificationCase).join(Event)

    if status:
        query = query.filter(VerificationCase.status == status.upper())

    total = query.count()
    offset = (page - 1) * page_size
    cases = query.order_by(desc(VerificationCase.created_at)).offset(offset).limit(page_size).all()

    items = []
    for c in cases:
        items.append({
            "id": c.id,
            "event_id": c.event_id,
            "case_type": c.case_type,
            "status": c.status,
            "reason": c.reason,
            "simulated_phone": c.simulated_phone,
            "created_at": c.created_at,
            "event": format_event_response(c.event) if c.event else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
    }


@router.post("/cases/{case_id}/decision", response_model=Dict[str, Any])
def submit_case_decision(
    case_id: str,
    payload: CaseDecisionRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Records an analyst human-in-the-loop decision (VERIFIED, ESCALATED, REJECTED)
    with mandatory justification notes, timestamp, and audit trail.
    """
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")

    valid_actions = {"VERIFIED", "ESCALATED", "REJECTED"}
    action = payload.action.upper()
    if action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Must be one of: {valid_actions}"
        )

    if not payload.notes or len(payload.notes.strip()) < 5:
        raise HTTPException(
            status_code=422,
            detail="Analyst justification notes are mandatory and must be at least 5 characters."
        )

    analyst_name = user.username if user else "analyst"
    now = datetime.now(timezone.utc)

    # Update case status
    case.status = action
    case.updated_at = now

    # Update associated event and alert
    event = db.query(Event).filter(Event.id == case.event_id).first()
    if event:
        if action == "VERIFIED":
            event.status = "VERIFIED"
        elif action == "ESCALATED":
            event.status = "ESCALATED"
        elif action == "REJECTED":
            event.status = "REJECTED"

    alert = db.query(Alert).filter(Alert.event_id == case.event_id).first()
    if alert:
        if action in ("VERIFIED", "REJECTED"):
            alert.status = "RESOLVED"
        else:
            alert.status = "UNDER_INVESTIGATION"
        alert.notes = (alert.notes or "") + f" [Case Decision: {action} by {analyst_name}: {payload.notes}]"
        alert.updated_at = now

    # Record AnalystDecision model
    decision = AnalystDecision(
        event_id=case.event_id,
        case_id=case.id,
        analyst_username=analyst_name,
        action=action,
        notes=payload.notes,
        timestamp=now
    )
    db.add(decision)

    # Record AuditLog
    log_audit(
        db=db,
        action_type="ANALYST_DECISION",
        actor=analyst_name,
        details={
            "case_id": case.id,
            "action": action,
            "notes": payload.notes,
            "timestamp": now.isoformat()
        },
        event_id=case.event_id
    )

    db.commit()
    db.refresh(case)

    return {
        "success": True,
        "case_id": case.id,
        "event_id": case.event_id,
        "action": action,
        "analyst": analyst_name,
        "status": case.status,
        "notes": payload.notes,
        "timestamp": now.isoformat(),
    }
