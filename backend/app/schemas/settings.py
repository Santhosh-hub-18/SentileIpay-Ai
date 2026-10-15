from typing import Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class CriterionWeight(BaseModel):
    id: str
    name: str
    weight: int = Field(..., ge=0, le=100)
    description: str


class ActionRange(BaseModel):
    key: str
    name: str
    min_score: int = Field(..., ge=0, le=100)
    max_score: int = Field(..., ge=0, le=100)
    color: str
    action_label: str
    description: str


class RiskConfigSchema(BaseModel):
    label_notice: str = "Configurable demonstration values, not validated fraud predictions"
    criteria_weights: Dict[str, int]
    action_ranges: List[ActionRange]
    otp_expiry_seconds: int = Field(300, ge=30, le=3600)
    max_otp_attempts: int = Field(3, ge=1, le=10)
    simulated_sms_template: str = (
        "Security alert: We detected unusual activity on your account. "
        "If this was not you, please contact your bank immediately."
    )

    @model_validator(mode="after")
    def validate_rules(self):
        # 1. Validate weights sum to 100
        total_weight = sum(self.criteria_weights.values())
        if total_weight != 100:
            raise ValueError(f"Criteria weights must sum exactly to 100 (current sum: {total_weight})")

        # 2. Validate ranges cover 0 to 100 without gaps or overlaps
        sorted_ranges = sorted(self.action_ranges, key=lambda r: r.min_score)
        if len(sorted_ranges) != 5:
            raise ValueError("Exactly 5 action ranges must be configured (Normal, Send Message, OTP, Call, Block)")

        if sorted_ranges[0].min_score != 0:
            raise ValueError(f"The first range must start at 0 (currently starts at {sorted_ranges[0].min_score})")

        if sorted_ranges[-1].max_score != 100:
            raise ValueError(f"The last range must end at 100 (currently ends at {sorted_ranges[-1].max_score})")

        for i in range(len(sorted_ranges)):
            r = sorted_ranges[i]
            if r.min_score > r.max_score:
                raise ValueError(f"Range {r.key} has min_score {r.min_score} greater than max_score {r.max_score}")
            if i > 0:
                prev_r = sorted_ranges[i - 1]
                if r.min_score != prev_r.max_score + 1:
                    raise ValueError(
                        f"Gap or overlap detected between {prev_r.key} (ends at {prev_r.max_score}) "
                        f"and {r.key} (starts at {r.min_score}). Ranges must be continuous."
                    )

        return self
