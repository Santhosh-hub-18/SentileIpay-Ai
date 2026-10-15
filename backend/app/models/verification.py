import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class OTPSession(Base):
    """Demo OTP session for elevated risk events (51-70)."""

    __tablename__ = "otp_sessions"

    id = Column(String(50), primary_key=True, default=lambda: f"OTP-{uuid.uuid4().hex[:8].upper()}", index=True)
    event_id = Column(String(50), ForeignKey("events.id"), unique=True, nullable=False, index=True)
    customer_id = Column(String(50), nullable=False, index=True)

    # Security requirement: store only hash of OTP
    otp_hash = Column(String(128), nullable=False)
    # Demo presentation only: clearly labeled as demo code
    demo_code_display = Column(String(10), nullable=False)

    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, VERIFIED, EXPIRED, LOCKED_OUT

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    event = relationship("Event", back_populates="otp_session")


class VerificationCase(Base):
    """Manual call verification case for high risk events (71-90)."""

    __tablename__ = "verification_cases"

    id = Column(String(50), primary_key=True, default=lambda: f"CASE-{uuid.uuid4().hex[:8].upper()}", index=True)
    event_id = Column(String(50), ForeignKey("events.id"), unique=True, nullable=False, index=True)

    case_type = Column(String(30), default="CALL_VERIFICATION", nullable=False)
    status = Column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, VERIFIED, ESCALATED, REJECTED
    reason = Column(Text, nullable=False)
    simulated_phone = Column(String(50), nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="verification_case")
