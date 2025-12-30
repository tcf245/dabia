from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
import uuid

from dabia.main import app
from dabia import models
from dabia.database import get_db
from dabia.api.deps import get_current_user

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
    return user

def test_list_decks(db_session: Session, override_get_db):
    # Setup: Create a deck
    deck = models.Deck(name="Test Deck", difficulty="Intermediate")
    db_session.add(deck)
    db_session.commit()

    response = client.get("/api/v1/decks/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(d["name"] == "Test Deck" for d in data)

def test_get_deck_settings(db_session: Session, override_get_db, test_user):
    # Set active decks for the test user
    test_user.active_deck_ids = [str(uuid.uuid4())]
    db_session.commit()

    # Mock the get_current_user dependency
    app.dependency_overrides[get_current_user] = lambda: test_user
    
    try:
        response = client.get("/api/v1/decks/settings")
        assert response.status_code == 200
        data = response.json()
        assert "active_deck_ids" in data
        assert len(data["active_deck_ids"]) == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_update_deck_settings(db_session: Session, override_get_db, test_user):
    app.dependency_overrides[get_current_user] = lambda: test_user
    
    try:
        new_deck_id = str(uuid.uuid4())
        payload = {"active_deck_ids": [new_deck_id]}
        response = client.put("/api/v1/decks/settings", json=payload)
        assert response.status_code == 200
        
        # Verify in DB
        db_session.refresh(test_user)
        assert test_user.active_deck_ids == [new_deck_id]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
