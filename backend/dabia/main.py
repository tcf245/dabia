from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dabia.core.logging import logger

app = FastAPI(
    title="Dabia API",
    description="API for the Dabia language learning platform.",
    version="0.1.0"
)

# Deferred Initialization Helper
def complete_setup(app: FastAPI):
    # Only run this once for actual business requests
    if hasattr(app.state, "setup_done"):
        return
        
    logger.info("Performing lazy initialization of routers and heavy modules...")
    
    from dabia.api.v1 import session, cards, auth, profile, stats
    app.include_router(session.router, prefix="/api/v1/session", tags=["Session"])
    app.include_router(cards.router, prefix="/api/v1/cards", tags=["Cards"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
    app.include_router(stats.router, prefix="/api/v1/stats", tags=["Stats"])
    
    app.state.setup_done = True
    logger.info("Lazy initialization complete.")

@app.middleware("http")
async def setup_middleware(request, call_next):
    # Preflight (OPTIONS) requests are handled by CORSMiddleware (outermost) 
    # and should NOT trigger heavy module initialization.
    if request.method != "OPTIONS":
        complete_setup(app)
    return await call_next(request)

# Set up Middlewares (Added in REVERSE order of execution)
from dabia.core.middleware import LoggingMiddleware
from dabia.core.token_refresh_middleware import TokenRefreshMiddleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(TokenRefreshMiddleware)

# CORSMiddleware MUST be added LAST to be the outermost (handling preflights before setup_middleware)
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Refresh-Token"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to Dabia! (ダビア)"}


@app.get("/api/v1/health-check")
def health_check():
    from sqlalchemy.orm import Session
    from sqlalchemy import text
    from dabia.database import get_db
    
    # Simple dependency injection simulation or direct use
    db_gen = get_db()
    db: Session = next(db_gen)
    try:
        # This endpoint will try to connect to the database and execute a simple query.
        # If it returns successfully, it means the database connection is working.
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    finally:
        # Properly close the generator/session
        try:
            next(db_gen)
        except StopIteration:
            pass
