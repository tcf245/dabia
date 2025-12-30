from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dabia.database import get_db
from dabia.api.v1 import session as session_router
from dabia.api.v1 import cards as cards_router
from dabia.api.v1 import auth as auth_router
from dabia.api.v1 import profile as profile_router
from dabia.api.v1 import stats as stats_router
from dabia.api.v1 import decks as decks_router
from dabia.core.logging import logger

app = FastAPI(
    title="Dabia API",
    description="API for the Dabia language learning platform.",
    version="0.1.0"
)

# Set up CORS
# In a production app, you should be more restrictive than this.
# For this MVP, we'll allow the Vercel preview URLs and the main frontend URL.
origins = [
    "*" # Allow all URLs
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Refresh-Token"], # Allow frontend to read refreshed tokens
)

from dabia.core.middleware import LoggingMiddleware
from dabia.core.token_refresh_middleware import TokenRefreshMiddleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(TokenRefreshMiddleware)


# Include routers
# Include routers
app.include_router(session_router.router, prefix="/api/v1/session", tags=["Session"])
app.include_router(cards_router.router, prefix="/api/v1/cards", tags=["Cards"])
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(profile_router.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(stats_router.router, prefix="/api/v1/stats", tags=["Stats"])
app.include_router(decks_router.router, prefix="/api/v1/decks", tags=["Decks"])


@app.get("/")
async def root():
    return {"message": "Welcome to Dabia! (ダビア)"}


@app.get("/api/v1/health-check")
def health_check(db: Session = Depends(get_db)):
    # This endpoint will try to connect to the database and execute a simple query.
    # If it returns successfully, it means the database connection is working.
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
