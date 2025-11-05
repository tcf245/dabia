from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from alembic.config import Config
from alembic import command
import os

from dabia.database import get_db
from dabia.api.v1 import session as session_router

def run_migrations():
    # Path to your alembic.ini file
    alembic_ini_path = os.path.join(os.path.dirname(__file__), '..', 'alembic.ini')
    alembic_cfg = Config(alembic_ini_path)
    
    # Get the database URL from environment variables
    # This ensures that the migration runs on the correct database
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # Run the 'upgrade head' command
    command.upgrade(alembic_cfg, "head")

# Run migrations on startup
run_migrations()

app = FastAPI(
    title="Dabia API",
    description="API for the Dabia language learning platform.",
    version="0.1.0",
)

# Set up CORS
# In a production app, you should be more restrictive than this.
# For this MVP, we'll allow the Vercel preview URLs and the main frontend URL.
origins = [
    "http://localhost:5173",
    "http://localhost:3000", # Common port for React dev servers
    "https://dabia-frontend.vercel.app", # Your main frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://dabia-frontend-.*-erics-projects-a59ebbfd.vercel.app|http://localhost:.*", # Regex for Vercel preview URLs and all localhost ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(session_router.router, prefix="/api/v1/session", tags=["Session"])


@app.get("/")
async def root():
    return {"message": "Welcome to Dabia! (ダビア)"}


@app.get("/api/v1/health-check")
def health_check(db: Session = Depends(get_db)):
    # This endpoint will try to connect to the database and execute a simple query.
    # If it returns successfully, it means the database connection is working.
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
