from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from backend.app.database import Base


class RiskConfig(Base):
    """Configuration storage for weights, boundary ranges, and simulation parameters."""

    __tablename__ = "risk_configs"

    id = Column(String(50), primary_key=True, default="active_config")
    config_json = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(String(50), default="SYSTEM")
