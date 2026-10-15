import json
from typing import Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.settings import RiskConfig
from backend.app.models.user import User
from backend.app.schemas.settings import RiskConfigSchema
from backend.app.services.scoring_engine import (
    DEFAULT_WEIGHTS,
    scoring_engine
)
from backend.app.seed.seed_data import DEFAULT_ACTION_RANGES
from backend.app.services.audit_service import log_audit
from backend.app.api.deps import require_admin_user, get_current_user

router = APIRouter(prefix="/settings", tags=["Risk Settings"])


def get_default_config_dict() -> Dict[str, Any]:
    """Provides fallback configuration dictionary if no database row exists."""
    return {
        "label_notice": "Configurable demonstration values, not validated fraud predictions",
        "criteria_weights": DEFAULT_WEIGHTS,
        "action_ranges": DEFAULT_ACTION_RANGES,
        "otp_expiry_seconds": 300,
        "max_otp_attempts": 3,
        "simulated_sms_template": (
            "Security alert: We detected unusual activity on your account. "
            "If this was not you, please contact your bank immediately."
        )
    }


@router.get("", response_model=RiskConfigSchema)
def get_risk_settings(db: Session = Depends(get_db)):
    """Retrieves active criteria weights, boundary action ranges, and simulation settings."""
    config_row = db.query(RiskConfig).filter(RiskConfig.id == "active_config").first()
    if not config_row:
        return RiskConfigSchema(**get_default_config_dict())

    try:
        data = json.loads(config_row.config_json)
        return RiskConfigSchema(**data)
    except Exception:
        return RiskConfigSchema(**get_default_config_dict())


@router.put("", response_model=RiskConfigSchema)
def update_risk_settings(
    payload: RiskConfigSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user)
):
    """
    Updates risk scoring weights and boundary thresholds.
    Enforces that weights sum to 100 and ranges cover 0-100 continuously without gaps or overlaps.
    ADMIN PRIVILEGES REQUIRED.
    """
    config_row = db.query(RiskConfig).filter(RiskConfig.id == "active_config").first()
    old_config = json.loads(config_row.config_json) if config_row else get_default_config_dict()

    new_config_dict = payload.model_dump()
    json_str = json.dumps(new_config_dict)

    if not config_row:
        config_row = RiskConfig(
            id="active_config",
            config_json=json_str,
            updated_by=admin.username,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(config_row)
    else:
        config_row.config_json = json_str
        config_row.updated_by = admin.username
        config_row.updated_at = datetime.now(timezone.utc)

    # Sync live scoring engine weights
    scoring_engine.weights = payload.criteria_weights

    # Record audit log
    log_audit(
        db=db,
        action_type="SETTINGS_UPDATED",
        actor=admin.username,
        details={
            "admin_user": admin.username,
            "weights": payload.criteria_weights,
            "notice": payload.label_notice
        }
    )

    db.commit()
    db.refresh(config_row)

    return RiskConfigSchema(**new_config_dict)
