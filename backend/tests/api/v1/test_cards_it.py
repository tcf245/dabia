import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone

from dabia import models
from dabia.main import app
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

def create_card(db: Session, deck: models.Deck, overrides: dict = None, user: models.User = None) -> models.Card:
    card_data = {
        "id": uuid.uuid4(),
        "deck_id": deck.id,
        "sentence_template": "Test sentence __",
        "target_word": "word",
        "reading": "reading",
        "hint": "hint",
        "audio_url": "audio.mp3",
        "sentence": "Test sentence word",
        "sentence_furigana": "Test sentence word",
        "sentence_translation": "Test translation",
        "sentence_audio_url": "sentence_audio.mp3",
    }
    if overrides:
        card_data.update(overrides)
    
    card = models.Card(**card_data)
    db.add(card)
    
    if user:
        assoc = models.UserCardAssociation(
            user_id=user.id,
            card_id=card.id,
            proficiency_level=0
        )
        db.add(assoc)
        
    db.commit()
    return card

def test_get_card_by_id(db_session: Session, override_get_db, test_user):
    # Arrange
    deck = models.Deck(id=uuid.uuid4(), name="Test Deck")
    db_session.add(deck)
    db_session.commit()
    
    card = create_card(db_session, deck, user=test_user)
    
    # Act
    response = client.get(f"/api/v1/cards/{card.id}")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["card_id"] == str(card.id)
    assert data["target"]["word"] == "word"
    assert data["proficiency_level"] == 0

def test_get_card_not_found(db_session: Session, override_get_db, test_user):
    # Act
    response = client.get(f"/api/v1/cards/{uuid.uuid4()}")
    
    # Assert
    assert response.status_code == 404
