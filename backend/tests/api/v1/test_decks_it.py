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

def test_deck_metadata_inference(db_session: Session, override_get_db):
    # Test JLPT inference
    deck1 = models.Deck(name="JLPT N1 Vocabulary")
    # Test Business/Daily inference
    deck2 = models.Deck(name="Daily Business Japanese")
    db_session.add(deck1)
    db_session.add(deck2)
    db_session.commit()

    response = client.get("/api/v1/decks/")
    assert response.status_code == 200
    data = response.json()
    
    d1 = next(d for d in data if d["name"] == "JLPT N1 Vocabulary")
    assert d1["difficulty"] == "Expert"
    assert "JLPT N1" in d1["tags"]
    
    d2 = next(d for d in data if d["name"] == "Daily Business Japanese")
    assert d2["difficulty"] == "Advanced"
    assert "Business" in d2["tags"]
    assert "Daily" in d2["tags"]

def test_deck_settings_with_invalid_uuids(db_session: Session, override_get_db, test_user):
    # active_deck_ids containing invalid strings
    test_user.active_deck_ids = ["not-a-uuid", str(uuid.uuid4())]
    db_session.commit()
    
    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        response = client.get("/api/v1/decks/settings")
        assert response.status_code == 200
        data = response.json()
        # The invalid one should be skipped, only the valid one returned
        assert len(data["active_deck_ids"]) == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)
