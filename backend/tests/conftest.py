import os
# Set dummy DATABASE_URL to satisfy Pydantic validation during test collection
# The actual tests will override this with the Testcontainer URL via the fixture
os.environ.setdefault("DATABASE_URL", "postgresql://dummy:dummy@localhost:5432/dummy")

import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command
import os

@pytest.fixture(scope="session")
def db_engine():
    """Fixture for a test database engine."""
    
    # If running in CI with a service container, use that
    if os.getenv("USE_SERVICE_CONTAINER") == "true":
        db_url = os.getenv("DATABASE_URL")
        engine = create_engine(db_url)
        
        # Migrations are already run by the CI step 'Run Database Migrations',
        # but running them again here ensures the DB is ready even if running pytest locally 
        # against a docker-compose setup without prior migration.
        # It's idempotent so it's safe.
        alembic_ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
        alembic_cfg = Config(alembic_ini_path)
        command.upgrade(alembic_cfg, "head")
        
        yield engine
        # We don't dispose the engine here as it's just a connection to the external service
        
    else:
        # Local execution: Spin up a Testcontainer
        with PostgresContainer("postgres:13") as postgres:
            # Set the database URL for the test session
            os.environ["DATABASE_URL"] = postgres.get_connection_url()
            
            # Create an engine
            engine = create_engine(postgres.get_connection_url())

            # Run Alembic migrations
            alembic_ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
            alembic_cfg = Config(alembic_ini_path)
            command.upgrade(alembic_cfg, "head")

            yield engine

            # The container will be stopped automatically
        
@pytest.fixture(scope="function")
def db_session(db_engine):
    """Fixture for a test database session."""
    connection = db_engine.connect()
    transaction = connection.begin()
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
