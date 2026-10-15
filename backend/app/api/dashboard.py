from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.database import get_db
from backend.app.models.event import Event, RiskAssessment
from backend.app.models.alert import Alert
from backend.app.models.verification import OTPSession, VerificationCase
from backend.app.api.events import format_event_response

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns real-time aggregated security metrics, risk distributions,
    activity timelines, and high-risk alerts for the SOC dashboard.
    """
    total_events = db.query(Event).count()

    # Risk level counts
    risk_counts_query = (
        db.query(RiskAssessment.risk_level, func.count(RiskAssessment.id))
        .group_by(RiskAssessment.risk_level)
        .all()
    )
    risk_counts = {level: count for level, count in risk_counts_query}

    normal_count = risk_counts.get("NORMAL", 0)
    suspicious_count = risk_counts.get("SEND_MESSAGE", 0)
    otp_requests = risk_counts.get("OTP_VERIFICATION", 0)
    manual_cases = risk_counts.get("CALL_VERIFICATION", 0)
    blocked_count = risk_counts.get("TEMPORARY_BLOCK", 0)

    # Alerts metrics
    total_alerts = db.query(Alert).count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["NEW", "UNDER_INVESTIGATION"])).count()
    resolved_alerts = db.query(Alert).filter(Alert.status == "RESOLVED").count()

    # Verification queues
    pending_cases = db.query(VerificationCase).filter(VerificationCase.status == "PENDING").count()
    pending_otps = db.query(OTPSession).filter(OTPSession.status == "PENDING").count()

    # Event types breakdown
    event_types_query = (
        db.query(Event.event_type, func.count(Event.id))
        .group_by(Event.event_type)
        .all()
    )
    event_types = {t: count for t, count in event_types_query}

    # Risk tier distribution array for Recharts
    risk_distribution = [
        {"tier": "NORMAL", "name": "Normal (0-30)", "count": normal_count, "color": "#10B981"},
        {"tier": "SEND_MESSAGE", "name": "Message (31-50)", "count": suspicious_count, "color": "#F59E0B"},
        {"tier": "OTP_VERIFICATION", "name": "OTP (51-70)", "count": otp_requests, "color": "#F97316"},
        {"tier": "CALL_VERIFICATION", "name": "Call (71-90)", "count": manual_cases, "color": "#EF4444"},
        {"tier": "TEMPORARY_BLOCK", "name": "Block (91-100)", "count": blocked_count, "color": "#991B1B"},
    ]

    # Activity timeline (simulated or actual grouped by day/hour for chart visualization)
    now = datetime.now(timezone.utc)
    recent_events = (
        db.query(Event)
        .join(RiskAssessment)
        .order_by(desc(Event.timestamp))
        .limit(30)
        .all()
    )

    # Group last 24h into timeline buckets
    timeline_map: Dict[str, Dict[str, Any]] = {}
    for i in range(12, -1, -1):
        bucket_time = now - timedelta(hours=i * 2)
        bucket_key = bucket_time.strftime("%H:00")
        timeline_map[bucket_key] = {"time": bucket_key, "total": 0, "high_risk": 0}

    for evt in recent_events:
        hour_key = evt.timestamp.strftime("%H:00")
        if hour_key in timeline_map:
            timeline_map[hour_key]["total"] += 1
            if evt.risk_assessment and evt.risk_assessment.total_score >= 51:
                timeline_map[hour_key]["high_risk"] += 1

    activity_timeline = list(timeline_map.values())

    # Recent alerts for dashboard feed
    recent_alerts_query = (
        db.query(Alert)
        .join(Event)
        .order_by(desc(Alert.created_at))
        .limit(6)
        .all()
    )
    recent_alerts = []
    for a in recent_alerts_query:
        recent_alerts.append({
            "id": a.id,
            "event_id": a.event_id,
            "customer_name": a.event.customer_name if a.event else "Unknown",
            "score": a.score,
            "risk_level": a.risk_level,
            "status": a.status,
            "created_at": a.created_at,
        })

    return {
        "summary": {
            "total_events": total_events,
            "normal_count": normal_count,
            "suspicious_count": suspicious_count,
            "otp_requests_count": otp_requests,
            "manual_cases_count": manual_cases,
            "blocked_count": blocked_count,
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "resolved_alerts": resolved_alerts,
            "pending_cases": pending_cases,
            "pending_otps": pending_otps,
            "payment_events": event_types.get("PAYMENT", 0),
            "login_events": event_types.get("LOGIN", 0),
        },
        "risk_distribution": risk_distribution,
        "activity_timeline": activity_timeline,
        "recent_alerts": recent_alerts,
        "disclaimer": "Simulated dashboard metrics – for hackathon PS-002 demonstration only."
    }
