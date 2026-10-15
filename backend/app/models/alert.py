import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Alert(Base):
    """Fraud alert raised when risk level is SEND_MESSAGE, OTP, CALL, or BLOCK."""

    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, default=lambda: f"ALT-{uuid.uuid4().hex[:8].upper()}", index=True)
    event_id = Column(String(50), ForeignKey("events.id"), nullable=False, index=True)

    score = Column(Integer, nullable=False, index=True)
    risk_level = Column(String(30), nullable=False, index=True)
    status = Column(String(30), default="NEW", nullable=False, index=True)  # NEW, UNDER_INVESTIGATION, RESOLVED, DISMISSED
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="alert")


class AnalystDecision(Base):
    """Audit record of human-in-the-loop analyst decisions."""

    __tablename__ = "analyst_decisions"

    id = Column(String(50), primary_key=True, default=lambda: f"DEC-{uuid.uuid4().hex[:8].upper()}")
    event_id = Column(String(50), ForeignKey("events.id"), nullable=False, index=True)
    case_id = Column(String(50), nullable=True)

    analyst_username = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)  # VERIFIED, ESCALATED, REJECTED, RELEASED, BLOCKED
    notes = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
