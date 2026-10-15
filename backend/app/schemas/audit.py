from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    event_id: Optional[str] = None
    action_type: str
    actor: str
    details: Dict[str, Any]
    timestamp: datetime
