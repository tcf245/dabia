import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, UTC
import uuid
from dabia.models.review_log import ReviewLog
from dabia.models.user_card_association import UserCardAssociation
from dabia.models.card import Card
from dabia.models.deck import Deck
from dabia.models.user import User
from dabia.core.security import create_access_token

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_get_heatmap_success(client, db_session):
    # Setup user
    user_id = uuid.uuid4()
    user = User(id=user_id, email="heatmap@example.com")
    db_session.add(user)
    db_session.commit()
    
    token = create_access_token(data={"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Setup deck and card for foreign key constraints
    deck_id = uuid.uuid4()
    db_session.add(Deck(id=deck_id, name="Heatmap Deck"))
    card_id = uuid.uuid4()
    db_session.add(Card(id=card_id, deck_id=deck_id, target_word="test", reading="test", sentence_template="Test __."))
    db_session.commit()
    
    now = datetime.now(UTC)
    
    # Today
    for _ in range(10):
        db_session.add(ReviewLog(user_id=user_id, card_id=card_id, is_correct=True, response_time_ms=100, reviewed_at=now))
    
    # Yesterday
    yesterday = now - timedelta(days=1)
    for _ in range(25):
        db_session.add(ReviewLog(user_id=user_id, card_id=card_id, is_correct=True, response_time_ms=100, reviewed_at=yesterday))
        
    # Day before
    day_before = now - timedelta(days=2)
    for _ in range(3):
        db_session.add(ReviewLog(user_id=user_id, card_id=card_id, is_correct=True, response_time_ms=100, reviewed_at=day_before))
        
    db_session.commit()
    
    response = await client.get("/api/v1/profile/heatmap", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # We expect 3 entries (sparse return)
    assert len(data) == 3
    
    # Verify levels
    levels = {item['date']: item['level'] for item in data}
    assert levels[str(now.date())] == 2
    assert levels[str(yesterday.date())] == 4
    assert levels[str(day_before.date())] == 1

@pytest.mark.anyio
async def test_get_garden_success(client, db_session):
    # Setup user
    user_id = uuid.uuid4()
    user = User(id=user_id, email="garden@example.com")
    db_session.add(user)
    
    # Setup deck and cards
    deck_id = uuid.uuid4()
    deck = Deck(id=deck_id, name="Test Deck")
    db_session.add(deck)
    
    # Card 1: Mastered (Level 5)
    card1 = Card(id=uuid.uuid4(), deck_id=deck_id, target_word="apple", reading="apple", sentence_template="I eat an __.")
    assoc1 = UserCardAssociation(user_id=user_id, card_id=card1.id, proficiency_level=5)
    
    # Card 2: Review (Level 2)
    card2 = Card(id=uuid.uuid4(), deck_id=deck_id, target_word="banana", reading="banana", sentence_template="I like __.")
    assoc2 = UserCardAssociation(user_id=user_id, card_id=card2.id, proficiency_level=2)
    
    # Card 3: Learning (Level 1)
    card3 = Card(id=uuid.uuid4(), deck_id=deck_id, target_word="cherry", reading="cherry", sentence_template="A __ is red.")
    assoc3 = UserCardAssociation(user_id=user_id, card_id=card3.id, proficiency_level=1)
    
    db_session.add_all([card1, card2, card3, assoc1, assoc2, assoc3])
    db_session.commit()
    
    token = create_access_token(data={"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    response = await client.get("/api/v1/profile/garden", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # We expect 3 words
    assert len(data) == 3
    
    types = {item['text']: item['type'] for item in data}
    assert types["apple"] == "learned"
    assert types["banana"] == "review"
    assert types["cherry"] == "review"
