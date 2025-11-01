from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
import uuid

from dabia.main import app
from dabia import models
from dabia.database import get_db
from dabia.api.v1.session import get_current_user_id

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = next(get_db())
    try:
        # Clean up any previous test data before starting
        db.query(models.ReviewLog).delete()
        db.query(models.UserCardAssociation).delete()
        db.query(models.User).delete()
        db.query(models.Card).delete()
        db.commit()
        yield db
    finally:
        # Clean up created test data
        db.query(models.ReviewLog).delete()
        db.query(models.UserCardAssociation).delete()
        db.query(models.User).delete()
        db.query(models.Card).delete()
        db.commit()

def test_get_next_card_with_previous_answer_e2e(db_session: Session):
    """End-to-End test for the /next-card endpoint."""
    # 1. Setup: Create a dummy user and card in the DB
    user_id = uuid.uuid4()
    card_id = uuid.uuid4()

    user = models.User(id=user_id, email="test@example.com", hashed_password="fake_hash")
    card = models.Card(id=card_id, sentence_template="Test sentence __.", target_word="word")
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

    log_entry = db_session.query(models.ReviewLog).first()
    assert log_entry is not None
    assert log_entry.user_id == user.id
    assert log_entry.card_id == card.id

    # Cleanup dependency override
    app.dependency_overrides = {}

def test_full_learning_loop_e2e(db_session: Session):
    """Tests a full, two-step learning loop: get first card, answer it, get second card."""
    # 1. Setup: Create a user and at least two cards
    user_id = uuid.uuid4()
    user = models.User(id=user_id, email="test-loop@example.com", hashed_password="fake_hash")
    card1 = models.Card(id=uuid.uuid4(), sentence_template="Card 1 __.", target_word="one")
    card2 = models.Card(id=uuid.uuid4(), sentence_template="Card 2 __.", target_word="two")
    db_session.add(user)
    db_session.add(card1)
    db_session.add(card2)
    db_session.commit()

    # Override the user ID dependency
    app.dependency_overrides[get_current_user_id] = lambda: user_id

    # 2. First call: Get the first card (empty body)
    response1 = client.post("/api/v1/session/next-card", json=None)
    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["card"] is not None
    first_card_id = data1["card"]["card_id"]

    # 3. Second call: Answer the first card and get the second one
    response2 = client.post(
        "/api/v1/session/next-card",
        json={
            "card_id": first_card_id,
            "is_correct": True,
            "response_time_ms": 3000
        }
    )
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["card"] is not None
    second_card_id = data2["card"]["card_id"]

    # 4. Final Assertion: The two cards should be different
    assert first_card_id != second_card_id

    # Cleanup
    app.dependency_overrides = {}
