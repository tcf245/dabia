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
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
