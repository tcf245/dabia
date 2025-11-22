from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from dabia.core.config import settings

# Initialize engine as None. It will be created on the first request.
engine = None
SessionLocal: sessionmaker[Session] | None = None

def get_db():
    global engine, SessionLocal
    
    # Create engine and session factory only on the first call
    if engine is None or SessionLocal is None:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,  # Verify connections before using
            pool_size=10,        # Maintain 10 connections in the pool
            max_overflow=20,     # Allow up to 20 additional connections
            pool_recycle=3600,   # Recycle connections after 1 hour
            pool_timeout=30,     # Wait up to 30s for a connection
            echo_pool=False,     # Set to True for debugging
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
