from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
import uuid

from dabia.main import app
from dabia import models
from dabia.database import get_db
from dabia.api.deps import get_current_user_id

client = TestClient(app)

@pytest.fixture(scope="function")
def override_get_db(db_session: Session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session: Session):
    user = models.User(id=uuid.uuid4(), email="test@example.com", hashed_password="fake_hash")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user_id] = lambda: user.id
    return user

def test_get_daily_summary_returns_stats(db_session: Session, override_get_db, test_user):
    # Act
    # We expect this endpoint to return stats for the *current* day
    response = client.get("/api/v1/stats/daily-summary")

    # Assert
    # Expecting 404 now because endpoint is not implemented
    # But for TDD "Red" verification, we assert 200 and expect failure
    assert response.status_code == 200
    data = response.json()
    
    assert "to_learn_count" in data
    assert "learned_count" in data
    assert "reinforced_count" in data
    assert "total_answered" in data
    assert "total_time_seconds" in data
    assert "new_words_count" in data
    assert "accuracy" in data
    
    # Types check
    assert isinstance(data["to_learn_count"], int)
    assert isinstance(data["accuracy"], float)
