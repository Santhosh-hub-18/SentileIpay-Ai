from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.event import EventResponse, CriterionBreakdown


class AlertResponse(BaseModel):
    id: str
    event_id: str
    score: int
    risk_level: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    event: Optional[EventResponse] = None
    triggered_criteria: Optional[List[CriterionBreakdown]] = None


class AlertUpdate(BaseModel):
    status: Optional[str] = Field(None, description="NEW, UNDER_INVESTIGATION, RESOLVED, DISMISSED")
    notes: Optional[str] = Field(None, description="Analyst triage and investigation notes")
