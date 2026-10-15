import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.database import get_db
from backend.app.models.event import Event, RiskAssessment
from backend.app.models.alert import Alert, AnalystDecision
from backend.app.models.user import User
from backend.app.schemas.verification import BlockDecisionRequest
from backend.app.services.audit_service import log_audit
from backend.app.api.deps import get_current_user
from backend.app.api.events import format_event_response

router = APIRouter(prefix="/blocked-transactions", tags=["Blocked Transactions"])


@router.get("", response_model=Dict[str, Any])
def list_blocked_transactions(
    status_filter: Optional[str] = Query(None, description="Filter by event status: TEMPORARILY_BLOCKED, RELEASED, ESCALATED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Lists transactions subject to simulated temporary restrictions.
    NOTICE: All block actions and account restrictions operate strictly on simulated data.
    """
    query = db.query(Event).join(RiskAssessment).filter(
        (RiskAssessment.risk_level == "TEMPORARY_BLOCK") |
        (Event.status.in_(["TEMPORARILY_BLOCKED", "RELEASED"]))
    )

    if status_filter:
        query = query.filter(Event.status == status_filter.upper())

    total = query.count()
    offset = (page - 1) * page_size
    events = query.order_by(desc(Event.timestamp)).offset(offset).limit(page_size).all()

    items = []
    for e in events:
        items.append(format_event_response(e))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        "disclaimer": "Simulated security system – no real accounts or banking transactions are blocked."
    }


@router.post("/{event_id}/decision", response_model=Dict[str, Any])
def submit_block_decision(
    event_id: str,
    payload: BlockDecisionRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Processes a senior analyst review action (RELEASE or ESCALATE) for a temporarily blocked transaction.
    A mandatory justification reason is required for releasing or escalating.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")

    action = payload.action.upper()
    valid_actions = {"RELEASE", "ESCALATE"}
    if action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Must be one of: {valid_actions}"
        )

    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(
            status_code=422,
            detail="A mandatory justification reason (min 5 chars) is required to release or escalate a block."
        )

    analyst_name = user.username if user else "analyst"
    now = datetime.now(timezone.utc)

    if action == "RELEASE":
        event.status = "RELEASED"
        audit_action = "BLOCK_RELEASED"
    else:
        event.status = "ESCALATED"
        audit_action = "BLOCK_ESCALATED"

    # Update associated alert
    alert = db.query(Alert).filter(Alert.event_id == event_id).first()
    if alert:
        alert.status = "RESOLVED" if action == "RELEASE" else "UNDER_INVESTIGATION"
        alert.notes = (alert.notes or "") + f" [Block {action} by {analyst_name}: {payload.reason}]"
        alert.updated_at = now

    # Record AnalystDecision
    decision = AnalystDecision(
        event_id=event_id,
        analyst_username=analyst_name,
        action=action,
        notes=payload.reason,
        timestamp=now
    )
    db.add(decision)

    # Record AuditLog
    log_audit(
        db=db,
        action_type=audit_action,
        actor=analyst_name,
        details={
            "action": action,
            "reason": payload.reason,
            "notice": "Simulated block action – no real bank accounts affected",
            "timestamp": now.isoformat()
        },
        event_id=event_id
    )

    db.commit()
    db.refresh(event)

    return {
        "success": True,
        "event_id": event.id,
        "action": action,
        "new_status": event.status,
        "analyst": analyst_name,
        "reason": payload.reason,
        "timestamp": now.isoformat(),
        "disclaimer": "Simulated block action – no real bank accounts affected."
    }
