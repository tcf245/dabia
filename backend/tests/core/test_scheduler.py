import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from dabia.core.scheduler import Scheduler
from dabia.models.user_card_association import UserCardAssociation
from dabia.models.card import Card
from dabia.models.user import User
import uuid

@pytest.fixture
def scheduler(db_session: Session):
    return Scheduler(db_session)

@pytest.fixture
def test_user(db_session: Session):
    user = User(id=uuid.uuid4(), email="test@example.com", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    return user

from dabia.models.deck import Deck

@pytest.fixture
def test_deck(db_session: Session):
    deck = Deck(id=uuid.uuid4(), name="Test Deck")
    db_session.add(deck)
    db_session.commit()
    return deck

@pytest.fixture
def test_card(db_session: Session, test_deck):
    card = Card(
        id=uuid.uuid4(),
        deck_id=test_deck.id,
        sentence_template="Test sentence",
        target_word="test",
        reading="tesuto",
        sentence_translation="Test translation"
    )
    db_session.add(card)
    db_session.commit()
    return card

def test_new_card_association(scheduler, db_session, test_user, test_card):
    # Test first review of a new card
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=4, response_time_ms=1000)
    
    assert assoc.repetitions == 1
    # V2: Interval is calculated from stability (0.6) -> approx 0.063
    assert assoc.interval < 1.0
    assert assoc.stability == 0.6
    assert assoc.proficiency_level == 1 # Stability < 2
    # Ease factor is not strictly used in v2 core logic but kept for compatibility
    # assert assoc.ease_factor == 2.5 
    assert assoc.lapses_count == 0

def test_correct_answer_progression(scheduler, db_session, test_user, test_card):
    # 1st review (Correct)
    # 1st review (Correct)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=4, response_time_ms=1000)
    assert assoc.interval < 1.0 # V2: 0.063
    assert assoc.repetitions == 1
    assert assoc.stability == 0.6

    # 2nd review (Correct)
    # S_new = 0.6 * (1 + 0.2 * (4 - 2)) = 0.84
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=4, response_time_ms=1000)
    assert assoc.stability == 0.84
    assert assoc.repetitions == 2
    # Interval = -0.84 * ln(0.9) = 0.088
    assert assoc.interval > 0.06
    assert assoc.interval < 1.0

    # 3rd review (Correct)
    # S_new = 0.84 * 1.4 = 1.176
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=4, response_time_ms=1000)
    assert abs(assoc.stability - 1.176) < 0.001
    assert assoc.repetitions == 3
    # Interval = -1.176 * ln(0.9) = 0.123
    assert assoc.interval > 0.1

def test_incorrect_answer_lapse(scheduler, db_session, test_user, test_card):
    # Setup a learned card
    assoc = UserCardAssociation(
        user_id=test_user.id,
        card_id=test_card.id,
        interval=10.0,
        ease_factor=2.5,
        repetitions=3,
        lapses_count=0,
        next_review_at=datetime.now(),
        stability=10.0 # V2 field
    )
    db_session.add(assoc)
    db_session.commit()

    # Fail the card (Quality 2)
    # Fail the card (Quality 2)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=2, response_time_ms=1000)
    
    assert assoc.repetitions == 0
    assert assoc.lapses_count == 1
    assert assoc.interval == 0.007 # V2: Short Queue (10 mins) for any failure
    # assert assoc.ease_factor < 2.5 # EF not strictly used in v2 core logic

def test_get_next_card_overdue(scheduler, db_session, test_user, test_card):
    # Setup an overdue card
    past = datetime.now() - timedelta(days=1)
    assoc = UserCardAssociation(
        user_id=test_user.id,
        card_id=test_card.id,
        next_review_at=past,
        interval=1,
        repetitions=1
    )
    db_session.add(assoc)
    db_session.commit()

    next_card, user_assoc, meta = scheduler.get_next_card(test_user.id)
    assert next_card.id == test_card.id
    assert user_assoc is not None
    assert meta['type'] == 'review'

def test_get_next_card_new(scheduler, db_session, test_user, test_card):
    # Ensure no associations exist
    # test_card is new for test_user
    
    next_card, user_assoc, meta = scheduler.get_next_card(test_user.id)
    assert next_card.id == test_card.id
    assert user_assoc is None  # New cards don't have associations yet
    assert meta['type'] == 'new'
