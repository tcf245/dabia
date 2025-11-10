from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
import uuid

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

def test_get_next_card_with_previous_answer_e2e(db_session: Session, override_get_db):
    """End-to-End test for the /next-card endpoint."""
    # 1. Setup: Create a dummy deck, user, and card in the DB
    user_id = uuid.uuid4()
    card_id = uuid.uuid4()
    deck = models.Deck(id=uuid.uuid4(), name="Test Deck")
    user = models.User(id=user_id, email="test@example.com", hashed_password="fake_hash")
    card = models.Card(id=card_id, deck_id=deck.id, sentence_template="Test sentence __.", target_word="word", reading="wado")
    db_session.add(deck)
    db_session.add(user)
    db_session.add(card)
    db_session.commit()

    # Override the user ID dependency for this test
    app.dependency_overrides[get_current_user_id] = lambda: user_id

    # 2. Make the API call with a previous answer
    response = client.post(
        "/api/v1/session/next-card",
        json={
            "card_id": str(card.id),
            "is_correct": True,
            "response_time_ms": 1234
        }
    )

    # 3. Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["card"] is not None
    assert data["card"]["reading"] == "wado"

    log_entry = db_session.query(models.ReviewLog).first()
    assert log_entry is not None
    assert log_entry.user_id == user.id
    assert log_entry.card_id == card.id

    # Cleanup dependency override
    app.dependency_overrides = {}



