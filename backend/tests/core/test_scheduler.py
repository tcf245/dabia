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
    # Test first review of a new card (L1 -> Correct -> L5)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=4, response_time_ms=1000)
    
    assert assoc.repetitions == 1
    # SRS v3: L5 Interval ~ 30 days
    assert 29.0 < assoc.interval < 31.0
    # Stability not used in v3 logic
    # assert assoc.stability == 0.6
    assert assoc.proficiency_level == 5
    assert assoc.lapses_count == 0

def test_correct_answer_progression(scheduler, db_session, test_user, test_card):
    # 1. New (L1) -> Correct -> Mastered (L5)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=4, response_time_ms=1000)
    assert assoc.proficiency_level == 5
    assert 29.0 < assoc.interval < 31.0

    # 2. Mastered (L5) -> Correct -> Mastered (L5) (Maintain)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=5, response_time_ms=1000)
    assert assoc.proficiency_level == 5
    assert 29.0 < assoc.interval < 31.0
    
    # Reset to L2 check logic manually for test coverage complexity
    assoc.proficiency_level = 2
    assoc.repetitions = 0
    db_session.commit()

    # 3. Hard (L2) -> Correct -> Learning (L3)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=3, response_time_ms=1000)
    assert assoc.proficiency_level == 3
    # Interval ~ 300s (5 mins = 0.0035 days)
    assert 0.003 < assoc.interval < 0.004

    # 4. Learning (L3) -> Correct -> Easy (L4)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=3, response_time_ms=1000)
    assert assoc.proficiency_level == 4
    # Interval ~ 7 days
    assert 6.9 < assoc.interval < 7.1

def test_incorrect_answer_lapse(scheduler, db_session, test_user, test_card):
    # Setup a learned card (L5)
    assoc = UserCardAssociation(
        user_id=test_user.id,
        card_id=test_card.id,
        interval=30.0,
        ease_factor=2.5,
        repetitions=5,
        lapses_count=0,
        next_review_at=datetime.now(),
        proficiency_level=5
    )
    db_session.add(assoc)
    db_session.commit()

    # Fail the card (L5 -> Incorrect -> L3 Learning)
    assoc = scheduler.update_card_state(test_user.id, test_card.id, quality=2, response_time_ms=1000)
    
    assert assoc.repetitions == 0 # Reset repetitions logic in code
    assert assoc.lapses_count == 1
    assert assoc.proficiency_level == 3
    # Interval ~ 300s (0.0035 days)
    assert 0.003 < assoc.interval < 0.005

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

def test_get_next_card_skips_mastered_overdue(scheduler, db_session, test_user, test_deck):
    # Setup a mastered card that is overdue
    mastered_card = Card(
        id=uuid.uuid4(),
        deck_id=test_deck.id,
        sentence_template="Mastered sentence",
        target_word="mastered",
        reading="masutado",
        sentence_translation="Mastered translation"
    )
    new_card = Card(
        id=uuid.uuid4(),
        deck_id=test_deck.id,
        sentence_template="New sentence",
        target_word="new",
        reading="nyuu",
        sentence_translation="New translation"
    )
    db_session.add_all([mastered_card, new_card])
    db_session.commit()

    past = datetime.now() - timedelta(days=1)
    assoc = UserCardAssociation(
        user_id=test_user.id,
        card_id=mastered_card.id,
        next_review_at=past,
        interval=30,
        repetitions=5,
        proficiency_level=5
    )
    db_session.add(assoc)
    db_session.commit()

    next_card, user_assoc, meta = scheduler.get_next_card(test_user.id)
    assert next_card.id == new_card.id
    assert user_assoc is None
    assert meta["type"] == "new"
