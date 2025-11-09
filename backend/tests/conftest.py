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
    with PostgresContainer("postgres:13") as postgres:
        # Set the database URL for the test session
        os.environ["DATABASE_URL"] = postgres.get_connection_url()
        
        # Create an engine
        engine = create_engine(postgres.get_connection_url())

        # Run Alembic migrations
        alembic_cfg = Config("alembic.ini")
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
