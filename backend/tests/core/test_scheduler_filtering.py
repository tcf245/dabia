import pytest
import uuid
from datetime import datetime, timedelta, timezone
from dabia.core.scheduler import Scheduler
from dabia.models.user import User
from dabia.models.deck import Deck
from dabia.models.card import Card
from dabia.models.user_card_association import UserCardAssociation

def test_scheduler_filters_by_active_decks_overdue(db_session):
    # Setup
    user_id = uuid.uuid4()
    deck1 = Deck(id=uuid.uuid4(), name="Deck 1")
    deck2 = Deck(id=uuid.uuid4(), name="Deck 2")
    user = User(id=user_id, email="test@example.com", active_deck_ids=[str(deck1.id)])
    
    db_session.add(deck1)
    db_session.add(deck2)
    db_session.add(user)
    
    # Create two cards, both overdue
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    card1 = Card(id=uuid.uuid4(), deck_id=deck1.id, target_word="word1", sentence_template="...")
    card2 = Card(id=uuid.uuid4(), deck_id=deck2.id, target_word="word2", sentence_template="...")
    db_session.add(card1)
    db_session.add(card2)
    
    assoc1 = UserCardAssociation(user_id=user_id, card_id=card1.id, next_review_at=now - timedelta(days=1), proficiency_level=1)
    assoc2 = UserCardAssociation(user_id=user_id, card_id=card2.id, next_review_at=now - timedelta(days=1), proficiency_level=1)
    db_session.add(assoc1)
    db_session.add(assoc2)
    db_session.commit()
    
    scheduler = Scheduler(db_session)
    
    # Should only return card from deck1
    next_card, assoc, meta = scheduler.get_next_card(user_id)
    assert next_card.id == card1.id
    assert next_card.deck_id == deck1.id

def test_scheduler_filters_by_active_decks_new(db_session):
    # Setup
    user_id = uuid.uuid4()
    deck1 = Deck(id=uuid.uuid4(), name="Deck 1")
    deck2 = Deck(id=uuid.uuid4(), name="Deck 2")
    user = User(id=user_id, email="test@example.com", active_deck_ids=[str(deck1.id)])
    
    db_session.add(deck1)
    db_session.add(deck2)
    db_session.add(user)
    
    # Create two new cards (no association)
    card1 = Card(id=uuid.uuid4(), deck_id=deck1.id, target_word="word1", sentence_template="...")
    card2 = Card(id=uuid.uuid4(), deck_id=deck2.id, target_word="word2", sentence_template="...")
    db_session.add(card1)
    db_session.add(card2)
    db_session.commit()
    
    scheduler = Scheduler(db_session)
    
    # Should only return card from deck1
    next_card, assoc, meta = scheduler.get_next_card(user_id)
    assert next_card.id == card1.id
    assert next_card.deck_id == deck1.id

def test_scheduler_handles_empty_active_decks(db_session):
    # Setup
    user_id = uuid.uuid4()
    deck1 = Deck(id=uuid.uuid4(), name="Deck 1")
    user = User(id=user_id, email="test@example.com", active_deck_ids=[])
    
    db_session.add(deck1)
    db_session.add(user)
    
    card1 = Card(id=uuid.uuid4(), deck_id=deck1.id, target_word="word1", sentence_template="...")
    db_session.add(card1)
    db_session.commit()
    
    scheduler = Scheduler(db_session)
    next_card, assoc, meta = scheduler.get_next_card(user_id)
    assert next_card is not None # Should return card1 since no filter applied

def test_scheduler_handles_invalid_deck_uuid(db_session):
    # Setup
    user_id = uuid.uuid4()
    deck1 = Deck(id=uuid.uuid4(), name="Deck 1")
    user = User(id=user_id, email="test@example.com", active_deck_ids=["not-a-uuid", str(deck1.id)])
    
    db_session.add(deck1)
    db_session.add(user)
    
    card1 = Card(id=uuid.uuid4(), deck_id=deck1.id, target_word="word1", sentence_template="...")
    db_session.add(card1)
    db_session.commit()
    
    scheduler = Scheduler(db_session)
    next_card, assoc, meta = scheduler.get_next_card(user_id)
    assert next_card.id == card1.id

def test_scheduler_update_card_state_correct(db_session):
    user_id = uuid.uuid4()
    user = User(id=user_id, email=f"test_{uuid.uuid4()}@example.com")
    deck = Deck(id=uuid.uuid4(), name="Test Deck")
    card = Card(id=uuid.uuid4(), deck_id=deck.id, target_word="test", sentence_template="...")
    db_session.add(user)
    db_session.add(deck)
    db_session.add(card)
    db_session.commit()
    
    scheduler = Scheduler(db_session)
    # Correct answer (quality 4)
    assoc = scheduler.update_card_state(user_id=user_id, card_id=card.id, quality=4, response_time_ms=1000)
    assert assoc.proficiency_level == 5 # New -> Correct -> Mastered
    assert assoc.repetitions == 1

def test_scheduler_update_card_state_incorrect(db_session):
    user_id = uuid.uuid4()
    user = User(id=user_id, email=f"test_{uuid.uuid4()}@example.com")
    deck = Deck(id=uuid.uuid4(), name="Test Deck")
    card = Card(id=uuid.uuid4(), deck_id=deck.id, target_word="test", sentence_template="...")
    db_session.add(user)
    db_session.add(deck)
    db_session.add(card)
    db_session.commit()
    
    scheduler = Scheduler(db_session)
    # Incorrect answer (quality 2)
    assoc = scheduler.update_card_state(user_id=user_id, card_id=card.id, quality=2, response_time_ms=1000)
    assert assoc.proficiency_level == 2 # New -> Incorrect -> Hard
    assert assoc.repetitions == 0 # Reset to 0
    assert assoc.lapses_count == 1
