import pytest
from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from dabia.core.token_refresh_middleware import TokenRefreshMiddleware
from dabia.core.security import create_access_token
from dabia.core.config import settings

def test_middleware_no_auth_header():
    app = FastAPI()
    app.add_middleware(TokenRefreshMiddleware)
    
    @app.get("/")
    async def root():
        return {"msg": "ok"}
    
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert "X-Refresh-Token" not in response.headers

def test_middleware_invalid_auth_header():
    app = FastAPI()
    app.add_middleware(TokenRefreshMiddleware)
    
    @app.get("/")
    async def root():
        return {"msg": "ok"}
    
    client = TestClient(app)
    response = client.get("/", headers={"Authorization": "Invalid token"})
    assert response.status_code == 200
    assert "X-Refresh-Token" not in response.headers

def test_middleware_invalid_token_content():
    app = FastAPI()
    app.add_middleware(TokenRefreshMiddleware)
    
    @app.get("/")
    async def root():
        return {"msg": "ok"}
    
    client = TestClient(app)
    response = client.get("/", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 200
    assert "X-Refresh-Token" not in response.headers

def test_middleware_valid_token_no_refresh_needed():
    app = FastAPI()
    app.add_middleware(TokenRefreshMiddleware)
    
    @app.get("/")
    async def root():
        return {"msg": "ok"}
    
    # Recently issued token (age < 24h)
    token = create_access_token(data={"sub": "user1"})
    
    client = TestClient(app)
    response = client.get("/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "X-Refresh-Token" not in response.headers

def test_middleware_valid_token_refresh_needed_iat():
    app = FastAPI()
    app.add_middleware(TokenRefreshMiddleware)
    
    @app.get("/")
    async def root():
        return {"msg": "ok"}
    
    # Old token (age > 24h)
    old_iat = datetime.now(timezone.utc) - timedelta(hours=25)
    token = create_access_token(
        data={"sub": "user1", "iat": old_iat},
        expires_delta=timedelta(days=7)
    )
    
    client = TestClient(app)
    response = client.get("/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "X-Refresh-Token" in response.headers

def test_middleware_valid_token_refresh_needed_no_iat_exp_fallback():
    app = FastAPI()
    app.add_middleware(TokenRefreshMiddleware)
    
    @app.get("/")
    async def root():
        return {"msg": "ok"}
    
    # Token expiring soon (remaining < 6 days) but no iat
    # If it was issued for 7 days, and expires in 5 days, it's 2 days old.
    exp = datetime.now(timezone.utc) + timedelta(days=5)
    from jose import jwt
    token = jwt.encode(
        {"sub": "user1", "exp": exp},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    client = TestClient(app)
    response = client.get("/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "X-Refresh-Token" in response.headers
