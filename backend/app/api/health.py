from fastapi import APIRouter
from backend.app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Health check endpoint providing service state and simulation notice."""
    return {
        "status": "healthy",
        "service": "FraudShield Real-Time Fraud Detection System",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database_backend": settings.DB_BACKEND,
        "simulation_mode": True,
        "disclaimer": settings.SIMULATION_DISCLAIMER,
    }
