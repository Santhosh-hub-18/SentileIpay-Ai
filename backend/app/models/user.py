import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from backend.app.database import Base


class User(Base):
    """User model for demo analyst and administrator authentication."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="analyst")  # 'analyst' or 'admin'
    full_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
