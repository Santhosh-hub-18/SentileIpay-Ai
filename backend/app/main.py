import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api.health import router as health_router
from backend.app.api.auth import router as auth_router
from backend.app.api.events import router as events_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.verification import router as verification_router
from backend.app.api.blocks import router as blocks_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.settings import router as settings_router
from backend.app.api.audit import router as audit_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database tables and sample data on startup."""
    init_db()
    yield


app = FastAPI(
    title="FraudShield – Real-Time Fraud Detection System",
    description=(
        "Security-analyst SOC dashboard backend for hackathon problem PS-002 (FinTech & Cybersecurity). "
        "Evaluates simulated financial operations with transparent 0-100 risk scoring and tiered interventions. "
        "NOTICE: All accounts, transactions, messages, and telephone calls are fictional and simulated."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(verification_router, prefix="/api")
app.include_router(blocks_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(audit_router, prefix="/api")

# Static files and frontend client hosting
FRONTEND_DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or docs routes
        if full_path.startswith("api") or full_path in ("docs", "redoc", "openapi.json"):
            return None
        file_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))
else:
    @app.get("/")
    def root_placeholder():
        return {
            "name": "FraudShield API",
            "version": "1.0.0",
            "status": "online",
            "documentation": "/docs",
            "notice": "Frontend build directory not yet mounted. API is fully operational under /api."
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
