import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from dabia.main import app
from dabia.database import get_db
from dabia.models.user import User

client = TestClient(app)

# Mock DB
@pytest.fixture
def mock_db():
    return MagicMock(spec=Session)

@pytest.fixture
def override_get_db(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides = {}

def test_google_login_new_user(mock_db, override_get_db):
    # Mock Google ID Token verification
    with patch("dabia.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google_123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "http://example.com/avatar.jpg"
        }
        
        # Mock DB query to return None (user not found)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        response = client.post("/api/v1/auth/login/google", json={"token": "fake_token"})
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        
        # Verify user creation
        mock_db.add.assert_called_once()
        created_user = mock_db.add.call_args[0][0]
        assert isinstance(created_user, User)
        assert created_user.email == "test@example.com"
        assert created_user.google_id == "google_123"

def test_google_login_existing_user(mock_db, override_get_db):
    # Mock Google ID Token verification
    with patch("dabia.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google_123",
            "email": "test@example.com",
            "name": "Updated Name",
            "picture": "http://example.com/new_avatar.jpg"
        }
        
        # Mock existing user
        existing_user = User(
            id="uuid-123",
            email="test@example.com",
            google_id="google_123",
            full_name="Old Name",
            avatar_url="http://example.com/old.jpg"
        )
        mock_db.query.return_value.filter.return_value.first.return_value = existing_user
        
        response = client.post("/api/v1/auth/login/google", json={"token": "fake_token"})
        
        assert response.status_code == 200
        
        # Verify user update
        assert existing_user.full_name == "Updated Name"
        assert existing_user.avatar_url == "http://example.com/new_avatar.jpg"
        mock_db.commit.assert_called()

def test_google_login_invalid_token(mock_db, override_get_db):
    with patch("dabia.api.v1.auth.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.side_effect = ValueError("Invalid token")
        
        response = client.post("/api/v1/auth/login/google", json={"token": "invalid_token"})
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid Google token"
