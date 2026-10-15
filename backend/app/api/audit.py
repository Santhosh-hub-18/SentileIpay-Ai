import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.database import get_db
from backend.app.models.audit import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=Dict[str, Any])
def list_audit_logs(
    event_id: Optional[str] = Query(None, description="Filter by event identifier"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    actor: Optional[str] = Query(None, description="Filter by actor (e.g. SYSTEM, analyst)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieves immutable audit trail entries with filtering and pagination."""
    query = db.query(AuditLog)

    if event_id:
        query = query.filter(AuditLog.event_id == event_id)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type.upper())
    if actor:
        query = query.filter(AuditLog.actor.ilike(f"%{actor}%"))

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size).all()

    formatted_items = []
    for r in records:
        details_obj = json.loads(r.details) if isinstance(r.details, str) else r.details
        formatted_items.append({
            "id": r.id,
            "event_id": r.event_id,
            "action_type": r.action_type,
            "actor": r.actor,
            "details": details_obj,
            "timestamp": r.timestamp
        })

    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
    }
