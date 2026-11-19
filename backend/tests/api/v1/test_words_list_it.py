import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from dabia import models
from dabia.api.deps import get_current_user
from dabia.database import get_db
from dabia.main import app

client = TestClient(app)
NOW = datetime(2026, 11, 19, 12, 0, 0)


@pytest.fixture
def user(db_session: Session):
    user = models.User(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.clear()


@pytest.fixture
def deck(db_session: Session, user):
    deck = models.Deck(id=uuid.uuid4(), name=f"deck-{uuid.uuid4()}")
    db_session.add(deck)
    user.active_deck_ids = [str(deck.id)]
    db_session.commit()
    return deck


def add_word(db, user, deck, word, reading, hint, level, *, reviewed_ago_h=1, due_in_h=1, first_seen_days=10,
             lapses=0, en_hint=None):
    card = models.Card(
        id=uuid.uuid4(), deck_id=deck.id, target_word=word, reading=reading, hint=hint,
        sentence_template="__", sentence=f"{word}です。", sentence_translation=f"zh {word}",
    )
    db.add(card)
    db.flush()
    if en_hint:
        db.add(models.CardTranslation(card_id=card.id, language="en", hint=en_hint))
    if level:
        db.add(models.UserCardAssociation(
            user_id=user.id, card_id=card.id, proficiency_level=level,
            last_reviewed_at=NOW - timedelta(hours=reviewed_ago_h),
            next_review_at=NOW + timedelta(hours=due_in_h),
            created_at=NOW - timedelta(days=first_seen_days),
            lapses_count=lapses,
        ))
    db.commit()
    return card


def words(params=None):
    response = client.get("/api/v1/words", params=params or {})
    assert response.status_code == 200, response.text
    return response.json()


def test_lists_only_learned_words_with_status_and_fields(db_session, user, deck):
    eat = add_word(db_session, user, deck, "食べる", "たべる", "吃", 2, lapses=1)
    add_word(db_session, user, deck, "花", "はな", "花", 5)
    add_word(db_session, user, deck, "水", "みず", "水", 0)  # not started
    db_session.add_all([
        models.ReviewLog(user_id=user.id, card_id=eat.id, is_correct=True, response_time_ms=1000),
        models.ReviewLog(user_id=user.id, card_id=eat.id, is_correct=False, response_time_ms=1000),
        models.ReviewLog(user_id=user.id, card_id=eat.id, is_correct=True, response_time_ms=1000),
    ])
    db_session.commit()

    data = words()

    assert data["total"] == 2
    item = next(i for i in data["items"] if i["word"] == "食べる")
    assert item["status"] == "learning"
    assert item["proficiency_level"] == 2
    assert item["reading"] == "たべる"
    assert item["hint"] == "吃"
    assert item["sentence"] == "食べるです。"
    assert item["deck"]["id"] == str(deck.id)
    assert item["review_count"] == 3
    assert item["correct_count"] == 2
    assert item["accuracy"] == 66.7
    assert item["lapses_count"] == 1
    assert item["first_seen_at"].endswith("Z")
    assert next(i for i in data["items"] if i["word"] == "花")["status"] == "mastered"


@pytest.mark.parametrize("status, expected", [
    ("learning", {"a", "b"}), ("mastered", {"c"}), ("all", {"a", "b", "c"}),
])
def test_status_filter(db_session, user, deck, status, expected):
    add_word(db_session, user, deck, "a", "あ", "", 1)
    add_word(db_session, user, deck, "b", "い", "", 4)  # level 4 is still learning
    add_word(db_session, user, deck, "c", "う", "", 5)

    assert {i["word"] for i in words({"status": status})["items"]} == expected


def test_level_filter_requires_learning_status(db_session, user, deck):
    add_word(db_session, user, deck, "a", "あ", "", 1)
    add_word(db_session, user, deck, "b", "い", "", 2)
    add_word(db_session, user, deck, "c", "う", "", 3)

    data = words([("status", "learning"), ("level", 1), ("level", 3)])
    assert {i["word"] for i in data["items"]} == {"a", "c"}
    assert client.get("/api/v1/words", params={"status": "all", "level": 1}).status_code == 422


def test_pagination_is_stable_and_total_matches(db_session, user, deck):
    for n in range(7):
        add_word(db_session, user, deck, f"w{n}", f"r{n}", "", 2, reviewed_ago_h=1)  # identical sort keys

    pages = [words({"limit": 3, "offset": offset}) for offset in (0, 3, 6)]

    seen = [i["card_id"] for page in pages for i in page["items"]]
    assert all(page["total"] == 7 for page in pages)
    assert len(seen) == 7 and len(set(seen)) == 7


@pytest.mark.parametrize("sort, order, first", [
    ("last_reviewed", None, "recent"),
    ("next_review", None, "due"),
    ("level", None, "weak"),
    ("first_seen", None, "old"),
    ("lapses", None, "lapsy"),
    ("level", "desc", "recent"),
])
def test_sorts(db_session, user, deck, sort, order, first):
    add_word(db_session, user, deck, "recent", "a", "", 4, reviewed_ago_h=1, due_in_h=50, first_seen_days=5)
    add_word(db_session, user, deck, "due", "b", "", 3, reviewed_ago_h=30, due_in_h=-5, first_seen_days=5)
    add_word(db_session, user, deck, "weak", "c", "", 1, reviewed_ago_h=40, due_in_h=10, first_seen_days=5)
    add_word(db_session, user, deck, "old", "d", "", 2, reviewed_ago_h=50, due_in_h=20, first_seen_days=90)
    add_word(db_session, user, deck, "lapsy", "e", "", 2, reviewed_ago_h=60, due_in_h=30, first_seen_days=5, lapses=9)

    params = {"sort": sort, **({"order": order} if order else {})}
    assert words(params)["items"][0]["word"] == first


def test_fuzzy_search_ranks_best_match_first(db_session, user, deck):
    add_word(db_session, user, deck, "食べ物", "たべもの", "food", 2)
    add_word(db_session, user, deck, "食べる", "たべる", "to eat", 2)
    add_word(db_session, user, deck, "花", "はな", "flower", 5)

    assert [i["word"] for i in words({"q": "taberu"})["items"]] == ["食べる"]
    assert {i["word"] for i in words({"q": "タベ"})["items"]} == {"食べ物", "食べる"}
    assert [i["word"] for i in words({"q": "食べる"})["items"]][0] == "食べる"  # exact beats prefix-only matches
    assert [i["word"] for i in words({"q": "flowr"})["items"]] == ["花"]
    assert words({"q": "dog"})["total"] == 0


def test_search_matches_localized_meaning(db_session, user, deck):
    add_word(db_session, user, deck, "花", "はな", "花朵", 5, en_hint="flower")

    assert words({"q": "flower", "lang": "en"})["total"] == 1
    item = words({"q": "flower", "lang": "en"})["items"][0]
    assert item["hint"] == "flower"
    assert item["language"] == "en"


def test_relevance_sort_without_query_is_rejected(user, deck):
    assert client.get("/api/v1/words", params={"sort": "relevance"}).status_code == 422


def test_all_decks_includes_inactive_decks_with_history(db_session, user, deck):
    other = models.Deck(id=uuid.uuid4(), name=f"other-{uuid.uuid4()}")
    db_session.add(other)
    db_session.commit()
    add_word(db_session, user, deck, "a", "あ", "", 2)
    add_word(db_session, user, other, "b", "い", "", 2)

    assert {i["word"] for i in words()["items"]} == {"a"}
    assert {i["word"] for i in words({"all_decks": "true"})["items"]} == {"a", "b"}
    assert {i["word"] for i in words({"deck_id": str(other.id)})["items"]} == {"b"}


def test_other_users_words_never_appear(db_session, user, deck):
    other = models.User(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(other)
    db_session.commit()
    add_word(db_session, other, deck, "theirs", "あ", "", 5)

    assert words({"all_decks": "true"})["total"] == 0
