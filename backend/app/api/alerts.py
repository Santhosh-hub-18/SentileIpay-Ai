import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.database import get_db
from backend.app.models.alert import Alert
from backend.app.models.event import Event, RiskAssessment
from backend.app.models.user import User
from backend.app.schemas.alert import AlertResponse, AlertUpdate
from backend.app.api.deps import get_current_user
from backend.app.api.events import format_event_response
from backend.app.services.audit_service import log_audit

router = APIRouter(prefix="/alerts", tags=["Fraud Alerts"])


def format_alert_response(alert: Alert) -> Dict[str, Any]:
    """Formats Alert instance with nested event details and triggered criteria."""
    event_data = format_event_response(alert.event) if alert.event else None
    triggered_criteria = []
    if alert.event and alert.event.risk_assessment:
        ra = alert.event.risk_assessment
        breakdown = json.loads(ra.criteria_breakdown) if isinstance(ra.criteria_breakdown, str) else ra.criteria_breakdown
        triggered_criteria = [c for c in breakdown if c.get("triggered")]

    return {
        "id": alert.id,
        "event_id": alert.event_id,
        "score": alert.score,
        "risk_level": alert.risk_level,
        "status": alert.status,
        "notes": alert.notes,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at,
        "event": event_data,
        "triggered_criteria": triggered_criteria,
    }


@router.get("", response_model=Dict[str, Any])
def list_alerts(
    status: Optional[str] = Query(None, description="Filter by status (NEW, UNDER_INVESTIGATION, RESOLVED, DISMISSED)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier"),
    search: Optional[str] = Query(None, description="Search by customer name or event ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists fraud alerts with risk tier filtering, status filtering, and search."""
    query = db.query(Alert).join(Event)

    if status:
        query = query.filter(Alert.status == status.upper())

    if risk_level:
        query = query.filter(Alert.risk_level == risk_level.upper())

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Alert.id.ilike(search_filter)) |
            (Alert.event_id.ilike(search_filter)) |
            (Event.customer_name.ilike(search_filter)) |
            (Event.customer_id.ilike(search_filter))
        )

    total = query.count()
    offset = (page - 1) * page_size
    alerts = query.order_by(desc(Alert.created_at)).offset(offset).limit(page_size).all()

    return {
        "items": [format_alert_response(a) for a in alerts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
    }


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """Retrieves full details of a fraud alert including its event context."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found")
    return format_alert_response(alert)


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: str,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """Updates alert triage status and analyst investigation notes."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found")

    actor = user.username if user else "ANALYST"
    changes = {}

    if payload.status:
        valid_statuses = {"NEW", "UNDER_INVESTIGATION", "RESOLVED", "DISMISSED"}
        new_status = payload.status.upper()
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{payload.status}'. Must be one of: {valid_statuses}"
            )
        changes["old_status"] = alert.status
        changes["new_status"] = new_status
        alert.status = new_status

    if payload.notes is not None:
        alert.notes = payload.notes
        changes["notes_updated"] = True

    alert.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)

    log_audit(
        db=db,
        action_type="ALERT_UPDATED",
        actor=actor,
        details={"alert_id": alert_id, "changes": changes},
        event_id=alert.event_id
    )

    return format_alert_response(alert)
