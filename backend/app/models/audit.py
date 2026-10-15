import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from backend.app.database import Base


class AuditLog(Base):
    """Immutable audit trail for all security, scoring, verification, and analyst actions."""

    __tablename__ = "audit_logs"

    id = Column(String(50), primary_key=True, default=lambda: f"AUD-{uuid.uuid4().hex[:10].upper()}", index=True)
    event_id = Column(String(50), nullable=True, index=True)
    action_type = Column(String(50), nullable=False, index=True)
    actor = Column(String(100), nullable=False, default="SYSTEM")
    details = Column(Text, nullable=False)  # JSON-encoded payload
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
