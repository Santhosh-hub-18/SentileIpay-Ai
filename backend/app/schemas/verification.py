from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from backend.app.schemas.event import EventResponse


class OTPRequest(BaseModel):
    event_id: str = Field(..., description="Target event requiring OTP")


class OTPVerifyRequest(BaseModel):
    event_id: str = Field(..., description="Event identifier")
    code: str = Field(..., description="6-digit verification code entered by user")


class OTPVerifyResponse(BaseModel):
    success: bool
    status: str
    message: str
    attempts_remaining: int


class OTPSessionResponse(BaseModel):
    id: str
    event_id: str
    customer_id: str
    demo_code_display: str
    expires_at: datetime
    attempts: int
    max_attempts: int
    status: str
    created_at: datetime
    event: Optional[EventResponse] = None


class VerificationCaseResponse(BaseModel):
    id: str
    event_id: str
    case_type: str
    status: str
    reason: str
    simulated_phone: str
    created_at: datetime
    event: Optional[EventResponse] = None


class CaseDecisionRequest(BaseModel):
    action: str = Field(..., description="Action: 'VERIFIED', 'ESCALATED', or 'REJECTED'")
    notes: str = Field(..., min_length=3, description="Analyst justification notes")


class BlockDecisionRequest(BaseModel):
    action: str = Field(..., description="Action: 'RELEASE' or 'ESCALATE'")
    reason: str = Field(..., min_length=5, description="Mandatory rationale for releasing or escalating a block")
