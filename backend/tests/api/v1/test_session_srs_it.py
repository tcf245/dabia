import os
# Set dummy DATABASE_URL before importing app to avoid validation error
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/testdb"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from dabia.main import app
from dabia.database import get_db
from dabia.models.user import User
from dabia.models.card import Card
from dabia.models.deck import Deck
from dabia.models.user_card_association import UserCardAssociation
import uuid
from datetime import datetime, timedelta

@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_data(db_session: Session):
    # Create User
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    user = db_session.query(User).filter_by(id=user_id).first()
    if not user:
        user = User(id=user_id, email="test@example.com", hashed_password="hash")
        db_session.add(user)
    
    # Create Deck
    deck = Deck(id=uuid.uuid4(), name="Integration Test Deck")
    db_session.add(deck)
    
    # Create Card
    card = Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="Integration Test Sentence",
        target_word="integration",
        reading="integureeshon",
        sentence_translation="Integration Test Translation"
    )
    db_session.add(card)
    
    db_session.commit()
    return {"user": user, "card": card, "deck": deck}

def test_next_card_flow(client, test_data, db_session):
    card_id = str(test_data["card"].id)
    
    # 1. Get next card (should be the new card)
    response = client.post("/api/v1/session/next-card")
    assert response.status_code == 200
    data = response.json()
    assert data["card"]["card_id"] == card_id
    assert data["card"]["proficiency_level"] == 0

    # 2. Submit answer (Correct, Quality 4)
    payload = {
        "cardId": card_id,
        "isCorrect": True,
        "responseTimeMs": 1000,
        "quality": 4
    }
    response = client.post("/api/v1/session/next-card", json=payload)
    assert response.status_code == 200
    
    # Verify DB update
    assoc = db_session.query(UserCardAssociation).filter_by(
        user_id=test_data["user"].id, card_id=test_data["card"].id
    ).first()
    assert assoc is not None
    assert assoc.repetitions == 1
    # V2: Interval is calculated from stability (0.6) -> approx 0.063
    # assert assoc.interval == 1.0  <-- OLD V1 assertion
    assert assoc.interval < 1.0 
    assert assoc.stability == 0.6
    assert assoc.proficiency_level == 1

def test_next_card_overdue_priority(client, test_data, db_session):
    # Manually set up an overdue card
    user_id = test_data["user"].id
    card_id = test_data["card"].id
    
    assoc = UserCardAssociation(
        user_id=user_id,
        card_id=card_id,
        proficiency_level=1,
        interval=1.0,
        repetitions=1,
        next_review_at=datetime.now() - timedelta(days=1), # Overdue
        ease_factor=2.5,
        lapses_count=0,
        stability=1.0 # V2 field
    )
    db_session.add(assoc)
    db_session.commit()

    # Request next card
    response = client.post("/api/v1/session/next-card")
    assert response.status_code == 200
    data = response.json()
    
    # Should return the overdue card
    assert data["card"]["card_id"] == str(card_id)

def test_session_progress_increment(client, test_data, db_session):
    card_id = str(test_data["card"].id)
    
    # 1. Initial State: 0 reviews today
    response = client.post("/api/v1/session/next-card")
    assert response.status_code == 200
    data = response.json()
    assert data["session_progress"]["completed_today"] == 0

    # 2. Submit Answer 1
    payload = {
        "cardId": card_id,
        "isCorrect": True,
        "responseTimeMs": 1000,
        "quality": 4
    }
    response = client.post("/api/v1/session/next-card", json=payload)
    assert response.status_code == 200
    data = response.json()
    # The response contains the progress *after* the submission is processed
    # So it should be 1 now.
    assert data["session_progress"]["completed_today"] == 1

    # 3. Submit Answer 2 (Simulating another card review, reusing same card for simplicity)
    # In real SRS, next card would be different, but for counting logic it doesn't matter
    response = client.post("/api/v1/session/next-card", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["session_progress"]["completed_today"] == 2
