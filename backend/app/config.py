import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env file."""

    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"

    # Database settings (Dual backend: PostgreSQL or SQLite)
    DB_BACKEND: str = "sqlite"
    DATABASE_URL: str = "sqlite:///./fraudshield.db"

    # Authentication secrets (Development defaults - replace in Replit Secrets / Production)
    JWT_SECRET_KEY: str = "fraudshield-super-secret-jwt-key-2026-hackathon-ps002"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Demo credentials for Analyst and Admin
    DEMO_ANALYST_USER: str = "analyst"
    DEMO_ANALYST_PASSWORD: str = "FraudShield2026!"
    DEMO_ADMIN_USER: str = "admin"
    DEMO_ADMIN_PASSWORD: str = "AdminShield2026!"

    # System disclaimers
    SIMULATION_DISCLAIMER: str = (
        "FraudShield operates solely on simulated events for hackathon PS-002. "
        "No real banking accounts, payment rails, SMS messages, or telephone calls are involved."
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
