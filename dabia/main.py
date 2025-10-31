from fastapi import FastAPI

app = FastAPI(
    title="Dabia API",
    description="API for the Dabia language learning platform.",
    version="0.1.0",
)

@app.get("/")
async def root():
    return {"message": "Welcome to Dabia! (哒比呀)"}
