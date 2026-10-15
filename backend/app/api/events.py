import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from backend.app.database import get_db
from backend.app.models.event import Event, RiskAssessment
from backend.app.models.user import User
from backend.app.schemas.event import (
    EventCreate,
    EventResponse,
    SimulateEventRequest,
    TestScoreRequest,
    RiskAssessmentResponse,
    CriterionBreakdown
)
from backend.app.services.event_service import (
    create_event,
    create_test_score_event,
    simulate_preset
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/events", tags=["Events"])


def format_event_response(event: Event) -> Dict[str, Any]:
    """Helper to convert Event and its RiskAssessment relationship to serializable dict."""
    assessment_resp = None
    if event.risk_assessment:
        ra = event.risk_assessment
        breakdown_data = json.loads(ra.criteria_breakdown) if isinstance(ra.criteria_breakdown, str) else ra.criteria_breakdown
        assessment_resp = {
            "id": ra.id,
            "event_id": ra.event_id,
            "total_score": ra.total_score,
            "risk_level": ra.risk_level,
            "recommended_action": ra.recommended_action,
            "action_message": ra.action_message,
            "delivery_status": ra.delivery_status,
            "criteria_breakdown": breakdown_data,
            "is_test_data": ra.is_test_data,
            "evaluated_at": ra.evaluated_at,
        }

    return {
        "id": event.id,
        "customer_id": event.customer_id,
        "customer_name": event.customer_name,
        "customer_email": event.customer_email,
        "customer_phone": event.customer_phone,
        "event_type": event.event_type,
        "amount": event.amount,
        "currency": event.currency,
        "device_id": event.device_id,
        "device_known": event.device_known,
        "ip_address": event.ip_address,
        "location_city": event.location_city,
        "location_country": event.location_country,
        "location_known": event.location_known,
        "beneficiary_id": event.beneficiary_id,
        "beneficiary_name": event.beneficiary_name,
        "is_new_beneficiary": event.is_new_beneficiary,
        "failed_login_attempts": event.failed_login_attempts,
        "hourly_transaction_count": event.hourly_transaction_count,
        "status": event.status,
        "timestamp": event.timestamp,
        "risk_assessment": assessment_resp,
    }


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def ingest_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Ingests a simulated login or payment event.
    Calculates server-side fraud risk score and executes risk actions.
    """
    actor = user.username if user else "API_INGESTION"
    event = create_event(db, payload, actor=actor)
    return format_event_response(event)


@router.get("", response_model=Dict[str, Any])
def list_events(
    search: Optional[str] = Query(None, description="Search by customer name, ID, or event ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier"),
    event_type: Optional[str] = Query(None, description="Filter by PAYMENT or LOGIN"),
    status: Optional[str] = Query(None, description="Filter by event status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    sort_by: str = Query("timestamp", description="Column to sort by"),
    sort_desc: bool = Query(True, description="Sort descending if true"),
    db: Session = Depends(get_db)
):
    """Lists simulated events with pagination, searching, and risk tier filtering."""
    query = db.query(Event).outerjoin(RiskAssessment)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Event.id.ilike(search_filter),
                Event.customer_id.ilike(search_filter),
                Event.customer_name.ilike(search_filter),
                Event.location_city.ilike(search_filter),
            )
        )

    if risk_level:
        query = query.filter(RiskAssessment.risk_level == risk_level.upper())

    if event_type:
        query = query.filter(Event.event_type == event_type.upper())

    if status:
        query = query.filter(Event.status == status.upper())

    total = query.count()

    # Sorting
    sort_col = getattr(Event, sort_by, Event.timestamp)
    query = query.order_by(desc(sort_col) if sort_desc else asc(sort_col))

    offset = (page - 1) * page_size
    events = query.offset(offset).limit(page_size).all()

    return {
        "items": [format_event_response(e) for e in events],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
    }


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed information and risk score breakdown for a specific event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event {event_id} not found")
    return format_event_response(event)


@router.post("/simulate", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def simulate_event(payload: SimulateEventRequest, db: Session = Depends(get_db)):
    """Generates an event based on preset scenarios: normal, suspicious_tx, suspicious_login, high_risk_payment, critical_block, or random."""
    try:
        event = simulate_preset(db, payload.scenario)
        return format_event_response(event)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/test-score", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def submit_test_score(
    payload: TestScoreRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Test Mode endpoint for verifying exact risk boundaries (0-100).
    Rejects out-of-range values with 422. Flags resulting event as 'TEST DATA'.
    """
    if payload.score < 0 or payload.score > 100:
        raise HTTPException(
            status_code=422,
            detail="Score must be an integer between 0 and 100"
        )

    actor = user.username if user else "TEST_ANALYST"
    event = create_test_score_event(db, payload, actor=actor)
    return format_event_response(event)
