import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configure test environment variables before importing app
os.environ["DATABASE_URL"] = "sqlite:///./test_fraudshield.db"
os.environ["ENVIRONMENT"] = "testing"

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.seed.seed_data import seed_database

TEST_DATABASE_URL = "sqlite:///./test_fraudshield.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Sets up a clean test database with schema and seed data for the test session."""
    # Ensure all tables created
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Override get_db in app
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed initial test data
    from backend.app import database
    database.SessionLocal = TestingSessionLocal
    database.engine = test_engine
    seed_database(force=True)

    yield

    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_fraudshield.db"):
        try:
            os.remove("./test_fraudshield.db")
        except Exception:
            pass


@pytest.fixture
def db_session():
    """Provides a fresh database session for a test function."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """FastAPI test client fixture."""
    with TestClient(app) as test_client:
        yield test_client
