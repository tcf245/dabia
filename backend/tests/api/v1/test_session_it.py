from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
import uuid
from datetime import datetime, timedelta, UTC

from dabia.main import app
from dabia import models
from dabia.database import get_db
from dabia.api.v1.session import get_current_user_id

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

def create_card(db_session, deck, assoc_data=None, user=None):
    card = models.Card(
        id=uuid.uuid4(), 
        deck_id=deck.id, 
        target_word=f"word_{uuid.uuid4()}", 
        reading="reading",
        sentence_template="Sentence with __."
    )
    db_session.add(card)
    if assoc_data and user:
        assoc = models.UserCardAssociation(
            user_id=user.id,
            card_id=card.id,
            **assoc_data
        )
        db_session.add(assoc)
    db_session.commit()
    return card

def test_get_next_card_returns_new_card(db_session: Session, override_get_db, test_user):
    deck = models.Deck(id=uuid.uuid4(), name="Test Deck")
    db_session.add(deck)
    card = create_card(db_session, deck) # Card without association

    response = client.post("/api/v1/session/next-card")
    assert response.status_code == 200
    data = response.json()
    assert data["card"]["card_id"] == str(card.id)
    assert data["card"]["proficiency_level"] == 0



def test_get_next_card_prioritizes_due_review_cards(db_session: Session, override_get_db, test_user):
    deck = models.Deck(id=uuid.uuid4(), name="Test Deck")
    db_session.add(deck)

    # New card (lower priority)
    create_card(db_session, deck)
    # Due review card (higher priority)
    review_card = create_card(db_session, deck, {"proficiency_level": 3, "next_review_at": datetime.now(UTC) - timedelta(days=1)}, test_user)

    response = client.post("/api/v1/session/next-card")
    assert response.status_code == 200
    assert response.json()["card"]["card_id"] == str(review_card.id)

def test_answer_correctly_updates_srs_data(db_session: Session, override_get_db, test_user):
    deck = models.Deck(id=uuid.uuid4(), name="Test Deck")
    db_session.add(deck)
    card = create_card(db_session, deck, {"proficiency_level": 1, "interval": 1, "next_review_at": datetime.now(UTC), "stability": 0.6}, test_user)

    response = client.post(
        "/api/v1/session/next-card",
        json={"card_id": str(card.id), "is_correct": True, "response_time_ms": 1000}
    )
    assert response.status_code == 200
    
    db_session.refresh(card)
    assoc = db_session.query(models.UserCardAssociation).filter_by(card_id=card.id, user_id=test_user.id).one()

    assert assoc.proficiency_level == 1
    # V2: Interval is calculated from stability (0.6) -> approx 0.063
    assert assoc.interval < 1.0 
    assert assoc.next_review_at.replace(tzinfo=UTC) > datetime.now(UTC)

def test_answer_incorrectly_updates_srs_data(db_session: Session, override_get_db, test_user):
    deck = models.Deck(id=uuid.uuid4(), name="Test Deck")
    db_session.add(deck)
    card = create_card(db_session, deck, {"proficiency_level": 1, "ease_factor": 2.5, "interval": 1, "stability": 0.9}, test_user)

    response = client.post(
        "/api/v1/session/next-card",
        json={"card_id": str(card.id), "is_correct": False, "response_time_ms": 1000}
    )
    assert response.status_code == 200

    db_session.refresh(card)
    assoc = db_session.query(models.UserCardAssociation).filter_by(card_id=card.id, user_id=test_user.id).one()

    assert assoc.proficiency_level == 0 # Demoted to New/Needs Practice
    assert assoc.lapses_count == 1
    # assert assoc.ease_factor < 2.5 # EF not strictly used
    assert assoc.interval == 0.007 # Reset to Short Queue (10 mins)