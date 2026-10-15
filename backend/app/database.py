import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

database_url = settings.DATABASE_URL or "sqlite:///./fraudshield.db"

# Handle standard postgres URI dialect compatibility
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

engine_kwargs = {"pool_pre_ping": True}
if database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that provides a SQLAlchemy session per request and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Creates database tables and executes initial seed if empty."""
    # Import all models so metadata knows about them
    import backend.app.models.user
    import backend.app.models.event
    import backend.app.models.alert
    import backend.app.models.verification
    import backend.app.models.audit
    import backend.app.models.settings

    Base.metadata.create_all(bind=engine)

    # Run seed data
    from backend.app.seed.seed_data import seed_database
    seed_database()
