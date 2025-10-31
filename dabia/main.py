from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from dabia.database import get_db

app = FastAPI(
    title="Dabia API",
    description="API for the Dabia language learning platform.",
    version="0.1.0",
)

@app.get("/")
async def root():
    return {"message": "Welcome to Dabia! (哒比呀)"}


@app.get("/api/v1/health-check")
def health_check(db: Session = Depends(get_db)):
    # This endpoint will try to connect to the database and execute a simple query.
    # If it returns successfully, it means the database connection is working.
    db.execute("SELECT 1")
    return {"status": "ok"}
