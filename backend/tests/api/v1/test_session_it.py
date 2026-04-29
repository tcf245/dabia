from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest
import uuid
from datetime import datetime, timedelta, UTC

from dabia.main import app
from dabia import models
from dabia.database import get_db
from dabia.database import get_db
from dabia.api.deps import get_current_user_id
from dabia.core.config import settings

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
    
    data = response.json()
    assert data["previous_card_id"] == str(card.id)
    
    db_session.refresh(card)
    assoc = db_session.query(models.UserCardAssociation).filter_by(card_id=card.id, user_id=test_user.id).one()

    # SRS v3: L1 (New) -> Correct -> L5 (Mastered)
    assert assoc.proficiency_level == 5
    # Interval ~ 30 days
    assert 29.0 < assoc.interval < 31.0
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

    data = response.json()
    assert data["previous_card_id"] == str(card.id)

    db_session.refresh(card)
    assoc = db_session.query(models.UserCardAssociation).filter_by(card_id=card.id, user_id=test_user.id).one()

    # SRS v3: L1 (New) -> Incorrect -> L2 (Hard)
    assert assoc.proficiency_level == 2
    assert assoc.lapses_count == 1
    # Interval ~ 90s (0.001 days)
    assert assoc.interval < 0.01


def test_get_next_card_prioritizes_annotated_cards_when_grammar_debug_enabled(
    db_session: Session, override_get_db, test_user
):
    original_enabled = settings.GRAMMAR_DEBUG_ENABLED
    original_source = settings.GRAMMAR_DEBUG_SOURCE
    settings.GRAMMAR_DEBUG_ENABLED = True
    settings.GRAMMAR_DEBUG_SOURCE = "auto-rule-v1"

    try:
        deck = models.Deck(id=uuid.uuid4(), name="Grammar Debug Deck")
        db_session.add(deck)
        db_session.commit()

        plain_card = create_card(db_session, deck)
        annotated_card = create_card(db_session, deck)

        grammar_point = models.GrammarPoint(
            id=uuid.uuid4(),
            slug="particle-o",
            title="Particle を",
            short_meaning="Marks the direct object.",
            category="particle",
            jlpt_level="N5",
            formation="noun + を + verb",
            notes="Used with transitive verbs.",
        )
        db_session.add(grammar_point)
        db_session.flush()
        db_session.add(
            models.CardGrammarAnnotation(
                id=uuid.uuid4(),
                card_id=annotated_card.id,
                grammar_point_id=grammar_point.id,
                surface_text="を",
                start_index=2,
                end_index=3,
                role_label="object-marker",
                explanation_for_sentence="を marks the direct object in this card.",
                display_order=1,
                confidence=0.9,
                source="auto-rule-v1",
            )
        )
        db_session.commit()

        response = client.post("/api/v1/session/next-card")

        assert response.status_code == 200
        assert response.json()["card"]["card_id"] == str(annotated_card.id)
        assert response.json()["card"]["card_id"] != str(plain_card.id)
    finally:
        settings.GRAMMAR_DEBUG_ENABLED = original_enabled
        settings.GRAMMAR_DEBUG_SOURCE = original_source
