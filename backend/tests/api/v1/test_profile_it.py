import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, UTC
import uuid
from dabia.models.review_log import ReviewLog
from dabia.models.user_card_association import UserCardAssociation
from dabia.models.card import Card
from dabia.models.card_translation import CardTranslation
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


@pytest.mark.anyio
async def test_get_garden_threshold_and_fields(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(User(id=user_id, email="garden-threshold@example.com"))

    deck_id = uuid.uuid4()
    db_session.add(Deck(id=deck_id, name="Threshold Deck"))

    cards_by_level = {}
    for level in range(1, 6):
        card = Card(
            id=uuid.uuid4(),
            deck_id=deck_id,
            target_word=f"word{level}",
            reading=f"reading{level}",
            hint=f"hint{level}",
            sentence_template="__",
        )
        assoc = UserCardAssociation(
            user_id=user_id,
            card_id=card.id,
            proficiency_level=level,
        )
        db_session.add_all([card, assoc])
        cards_by_level[level] = card

    db_session.commit()

    token = create_access_token(data={"sub": str(user_id)})
    response = await client.get("/api/v1/profile/garden", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

    by_level = {item["level"]: item for item in data}
    for level in range(1, 5):
        assert by_level[level]["type"] == "review"
    assert by_level[5]["type"] == "learned"

    for level, card in cards_by_level.items():
        item = by_level[level]
        assert item["card_id"] == str(card.id)
        assert item["text"] == card.target_word
        assert item["reading"] == card.reading
        assert item["romaji"] == card.reading
        assert item["hint"] == card.hint


@pytest.mark.anyio
async def test_get_garden_ordering_and_limits(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(User(id=user_id, email="garden-order@example.com"))

    deck_id = uuid.uuid4()
    db_session.add(Deck(id=deck_id, name="Ordering Deck"))

    base = datetime.now(UTC).replace(tzinfo=None)

    for i in range(10):
        card = Card(
            id=uuid.uuid4(),
            deck_id=deck_id,
            target_word=f"learn-{i}",
            reading=f"learn-reading-{i}",
            hint=f"learn-hint-{i}",
            sentence_template="__",
        )
        assoc = UserCardAssociation(
            user_id=user_id,
            card_id=card.id,
            proficiency_level=(i % 4) + 1,
            next_review_at=base + timedelta(minutes=i),
            last_reviewed_at=base - timedelta(minutes=i),
        )
        db_session.add_all([card, assoc])

    for i in range(7):
        card = Card(
            id=uuid.uuid4(),
            deck_id=deck_id,
            target_word=f"master-{i}",
            reading=f"master-reading-{i}",
            hint=f"master-hint-{i}",
            sentence_template="__",
        )
        assoc = UserCardAssociation(
            user_id=user_id,
            card_id=card.id,
            proficiency_level=5,
            next_review_at=base + timedelta(days=30),
            last_reviewed_at=base - timedelta(hours=i),
        )
        db_session.add_all([card, assoc])

    null_master_card = Card(
        id=uuid.uuid4(),
        deck_id=deck_id,
        target_word="master-null",
        reading="master-reading-null",
        hint="master-hint-null",
        sentence_template="__",
    )
    db_session.add_all([
        null_master_card,
        UserCardAssociation(
            user_id=user_id,
            card_id=null_master_card.id,
            proficiency_level=5,
            next_review_at=base + timedelta(days=30),
            last_reviewed_at=None,
        ),
    ])
    db_session.commit()

    token = create_access_token(data={"sub": str(user_id)})
    response = await client.get("/api/v1/profile/garden", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    review_items = [item for item in data if item["type"] == "review"]
    learned_items = [item for item in data if item["type"] == "learned"]

    assert [item["text"] for item in review_items] == [f"learn-{i}" for i in range(8)]
    assert [item["text"] for item in learned_items] == [f"master-{i}" for i in range(6)]


@pytest.mark.anyio
async def test_get_garden_mastered_null_last_reviewed_at_last(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(User(id=user_id, email="garden-nulls@example.com"))

    deck_id = uuid.uuid4()
    db_session.add(Deck(id=deck_id, name="Nulls Deck"))

    base = datetime.now(UTC).replace(tzinfo=None)
    entries = [
        ("null-last", None),
        ("older", base - timedelta(hours=2)),
        ("recent", base - timedelta(hours=1)),
    ]
    for word, reviewed_at in entries:
        card = Card(
            id=uuid.uuid4(),
            deck_id=deck_id,
            target_word=word,
            reading=word,
            hint=word,
            sentence_template="__",
        )
        assoc = UserCardAssociation(
            user_id=user_id,
            card_id=card.id,
            proficiency_level=5,
            next_review_at=base + timedelta(days=30),
            last_reviewed_at=reviewed_at,
        )
        db_session.add_all([card, assoc])
    db_session.commit()

    token = create_access_token(data={"sub": str(user_id)})
    response = await client.get("/api/v1/profile/garden", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    learned_items = [item for item in response.json() if item["type"] == "learned"]
    assert [item["text"] for item in learned_items] == ["recent", "older", "null-last"]


@pytest.mark.anyio
async def test_get_garden_localizes_hint_with_lang_and_falls_back(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(User(id=user_id, email="garden-i18n@example.com"))

    deck_id = uuid.uuid4()
    db_session.add(Deck(id=deck_id, name="I18n Garden Deck"))

    card_translated = Card(
        id=uuid.uuid4(),
        deck_id=deck_id,
        target_word="花",
        reading="はな",
        hint="花",
        sentence_template="__",
    )
    card_no_rows = Card(
        id=uuid.uuid4(),
        deck_id=deck_id,
        target_word="水",
        reading="みず",
        hint="水",
        sentence_template="__",
    )
    card_zh_only = Card(
        id=uuid.uuid4(),
        deck_id=deck_id,
        target_word="山",
        reading="やま",
        hint="山",
        sentence_template="__",
    )
    db_session.add_all([card_translated, card_no_rows, card_zh_only])
    db_session.flush()

    db_session.add_all([
        CardTranslation(card_id=card_translated.id, language="zh", hint="花"),
        CardTranslation(card_id=card_translated.id, language="en", hint="flower"),
        CardTranslation(card_id=card_zh_only.id, language="zh", hint="山"),
        UserCardAssociation(user_id=user_id, card_id=card_translated.id, proficiency_level=5),
        UserCardAssociation(user_id=user_id, card_id=card_no_rows.id, proficiency_level=2),
        UserCardAssociation(user_id=user_id, card_id=card_zh_only.id, proficiency_level=3),
    ])
    db_session.commit()

    token = create_access_token(data={"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    en_response = await client.get("/api/v1/profile/garden?lang=en", headers=headers)
    assert en_response.status_code == 200
    en_hints = {item["text"]: item["hint"] for item in en_response.json()}
    assert en_hints == {"花": "flower", "水": "水", "山": "山"}

    default_response = await client.get("/api/v1/profile/garden", headers=headers)
    assert default_response.status_code == 200
    default_hints = {item["text"]: item["hint"] for item in default_response.json()}
    assert default_hints == {"花": "花", "水": "水", "山": "山"}
