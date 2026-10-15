from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator


class CriterionBreakdown(BaseModel):
    criterion: str = Field(..., description="Criterion identifier")
    name: str = Field(..., description="Human-readable criterion label")
    points: int = Field(..., description="Points awarded for this criterion")
    max_points: int = Field(..., description="Configured maximum points for this criterion")
    triggered: bool = Field(..., description="Whether this criterion was triggered")
    explanation: str = Field(..., description="Detailed explanation of why it was or was not triggered")


class RiskAssessmentResponse(BaseModel):
    id: str
    event_id: str
    total_score: int
    risk_level: str
    recommended_action: str
    action_message: Optional[str] = None
    delivery_status: str
    criteria_breakdown: List[CriterionBreakdown]
    is_test_data: bool
    evaluated_at: datetime


class EventCreate(BaseModel):
    customer_id: str = Field(..., json_schema_extra={"example": "CUST-8492"})
    customer_name: str = Field(..., json_schema_extra={"example": "Sarah Jenkins"})
    customer_email: Optional[str] = "sarah.jenkins@example.com"
    customer_phone: Optional[str] = "+1-555-0182"
    event_type: str = Field("PAYMENT", description="PAYMENT or LOGIN", json_schema_extra={"example": "PAYMENT"})

    amount: float = Field(0.0, ge=0.0, json_schema_extra={"example": 125.50})
    currency: str = Field("USD", json_schema_extra={"example": "USD"})

    device_id: str = Field(..., json_schema_extra={"example": "DEV-MACBOOK-PRO-01"})
    device_known: bool = Field(True, json_schema_extra={"example": True})

    ip_address: str = Field("192.168.1.100", json_schema_extra={"example": "198.51.100.42"})
    location_city: str = Field("San Francisco", json_schema_extra={"example": "San Francisco"})
    location_country: str = Field("United States", json_schema_extra={"example": "United States"})
    location_known: bool = Field(True, json_schema_extra={"example": True})

    beneficiary_id: Optional[str] = None
    beneficiary_name: Optional[str] = None
    is_new_beneficiary: bool = False

    failed_login_attempts: int = Field(0, ge=0)
    hourly_transaction_count: int = Field(1, ge=1)
    timestamp: Optional[datetime] = None


class EventResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    event_type: str
    amount: float
    currency: str
    device_id: str
    device_known: bool
    ip_address: str
    location_city: str
    location_country: str
    location_known: bool
    beneficiary_id: Optional[str] = None
    beneficiary_name: Optional[str] = None
    is_new_beneficiary: bool
    failed_login_attempts: int
    hourly_transaction_count: int
    status: str
    timestamp: datetime
    risk_assessment: Optional[RiskAssessmentResponse] = None


class SimulateEventRequest(BaseModel):
    scenario: str = Field(
        ...,
        description="Scenario type: 'normal', 'suspicious_tx', 'suspicious_login', 'high_risk_payment', 'critical_block', or 'random'"
    )


class TestScoreRequest(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Exact score to test (0 to 100 inclusive)")
    customer_name: Optional[str] = "Test Subject Alpha"
    amount: Optional[float] = 250.00
    event_type: Optional[str] = "PAYMENT"

    @field_validator("score")
    @classmethod
    def validate_score_range(cls, v: int) -> int:
        if v < 0 or v > 100:
            raise ValueError("Score must be between 0 and 100")
        return v
