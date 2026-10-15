import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Event(Base):
    """Simulated login or payment event in the SOC dashboard."""

    __tablename__ = "events"

    id = Column(String(50), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:10].upper()}", index=True)
    customer_id = Column(String(50), nullable=False, index=True)
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=True)
    customer_phone = Column(String(50), nullable=True)  # Fictional phone
    event_type = Column(String(20), nullable=False, index=True)  # 'PAYMENT' or 'LOGIN'

    amount = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")

    device_id = Column(String(100), nullable=False)
    device_known = Column(Boolean, default=True)

    ip_address = Column(String(45), nullable=False)
    location_city = Column(String(100), nullable=False)
    location_country = Column(String(100), nullable=False)
    location_known = Column(Boolean, default=True)

    beneficiary_id = Column(String(50), nullable=True)
    beneficiary_name = Column(String(100), nullable=True)
    is_new_beneficiary = Column(Boolean, default=False)

    failed_login_attempts = Column(Integer, default=0)
    hourly_transaction_count = Column(Integer, default=1)

    status = Column(String(50), default="NORMAL", index=True)  # 'NORMAL', 'PENDING_VERIFICATION', 'VERIFIED', 'BLOCKED'
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    raw_payload = Column(Text, nullable=True)

    # Relationships
    risk_assessment = relationship("RiskAssessment", back_populates="event", uselist=False, cascade="all, delete-orphan")
    alert = relationship("Alert", back_populates="event", uselist=False, cascade="all, delete-orphan")
    otp_session = relationship("OTPSession", back_populates="event", uselist=False, cascade="all, delete-orphan")
    verification_case = relationship("VerificationCase", back_populates="event", uselist=False, cascade="all, delete-orphan")


class RiskAssessment(Base):
    """Server-calculated risk evaluation for a specific event."""

    __tablename__ = "risk_assessments"

    id = Column(String(50), primary_key=True, default=lambda: f"RSK-{uuid.uuid4().hex[:10].upper()}")
    event_id = Column(String(50), ForeignKey("events.id"), unique=True, nullable=False, index=True)

    total_score = Column(Integer, nullable=False, index=True)  # 0 to 100 clamped
    risk_level = Column(String(30), nullable=False, index=True)  # NORMAL, SEND_MESSAGE, OTP_VERIFICATION, CALL_VERIFICATION, TEMPORARY_BLOCK
    recommended_action = Column(String(100), nullable=False)
    action_message = Column(Text, nullable=True)
    delivery_status = Column(String(100), default="Simulated – no real SMS sent")

    criteria_breakdown = Column(Text, nullable=False)  # JSON-encoded list of triggered criteria
    is_test_data = Column(Boolean, default=False)
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="risk_assessment")
