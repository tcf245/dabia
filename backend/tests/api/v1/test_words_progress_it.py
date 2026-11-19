import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from dabia import models
from dabia.api.deps import get_current_user
from dabia.database import get_db
from dabia.main import app

client = TestClient(app)


@pytest.fixture
def user(db_session: Session):
    user = models.User(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.clear()


def make_deck(db: Session, name: str, size: int) -> tuple[models.Deck, list[models.Card]]:
    deck = models.Deck(id=uuid.uuid4(), name=f"{name}-{uuid.uuid4()}")
    db.add(deck)
    cards = [
        models.Card(id=uuid.uuid4(), deck_id=deck.id, target_word=f"w{i}", reading=f"r{i}", sentence_template="__")
        for i in range(size)
    ]
    db.add_all(cards)
    db.commit()
    return deck, cards


def learn(db: Session, user: models.User, cards: list[models.Card], levels: list[int]) -> None:
    for card, level in zip(cards, levels):
        db.add(models.UserCardAssociation(user_id=user.id, card_id=card.id, proficiency_level=level))
    db.commit()


def test_counts_mastered_learning_and_not_started_for_active_deck(db_session: Session, user):
    deck, cards = make_deck(db_session, "n5", 10)
    learn(db_session, user, cards, [1, 2, 2, 3, 4, 5, 5])
    user.active_deck_ids = [str(deck.id)]
    db_session.commit()

    response = client.get("/api/v1/words/progress")

    assert response.status_code == 200
    data = response.json()
    assert len(data["decks"]) == 1
    entry = data["decks"][0]
    assert entry["deck_id"] == str(deck.id)
    assert entry["name"] == deck.name
    assert entry["is_active"] is True
    assert entry["total"] == 10
    assert entry["mastered"] == 2
    assert entry["learning"] == 5  # level 4 counts as learning
    assert entry["not_started"] == 3
    assert entry["learning_by_level"] == {"1": 1, "2": 2, "3": 1, "4": 1}
    assert data["aggregate"] == {
        "total": 10, "mastered": 2, "learning": 5, "not_started": 3,
        "learning_by_level": {"1": 1, "2": 2, "3": 1, "4": 1},
    }


def test_explicit_deck_ids_override_active_decks_and_aggregate_sums(db_session: Session, user):
    deck_a, cards_a = make_deck(db_session, "a", 4)
    deck_b, cards_b = make_deck(db_session, "b", 6)
    learn(db_session, user, cards_a, [5, 3])
    learn(db_session, user, cards_b, [5, 5, 5])
    user.active_deck_ids = [str(deck_a.id)]
    db_session.commit()

    response = client.get(
        "/api/v1/words/progress", params=[("deck_id", str(deck_a.id)), ("deck_id", str(deck_b.id))]
    )

    data = response.json()
    by_id = {d["deck_id"]: d for d in data["decks"]}
    assert by_id[str(deck_b.id)]["is_active"] is False
    assert by_id[str(deck_b.id)]["mastered"] == 3
    assert data["aggregate"]["total"] == 10
    assert data["aggregate"]["mastered"] == 4
    assert data["aggregate"]["learning"] == 1
    assert data["aggregate"]["not_started"] == 5


def test_unknown_deck_ids_are_ignored(db_session: Session, user):
    deck, _ = make_deck(db_session, "known", 3)

    response = client.get(
        "/api/v1/words/progress", params=[("deck_id", str(deck.id)), ("deck_id", str(uuid.uuid4()))]
    )

    assert response.status_code == 200
    assert [d["deck_id"] for d in response.json()["decks"]] == [str(deck.id)]


def test_other_users_progress_is_never_counted(db_session: Session, user):
    deck, cards = make_deck(db_session, "shared", 5)
    other = models.User(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(other)
    db_session.commit()
    learn(db_session, other, cards, [5, 5, 5, 5, 5])
    learn(db_session, user, cards[:1], [2])

    entry = client.get("/api/v1/words/progress", params={"deck_id": str(deck.id)}).json()["decks"][0]

    assert entry["mastered"] == 0
    assert entry["learning"] == 1
    assert entry["not_started"] == 4


def test_include_studied_adds_inactive_decks_with_history_only(db_session: Session, user):
    active, _ = make_deck(db_session, "active", 2)
    studied, studied_cards = make_deck(db_session, "studied", 3)
    untouched, _ = make_deck(db_session, "untouched", 3)
    learn(db_session, user, studied_cards, [1])
    user.active_deck_ids = [str(active.id)]
    db_session.commit()

    ids = [d["deck_id"] for d in client.get(
        "/api/v1/words/progress", params={"include_studied": "true"}
    ).json()["decks"]]

    assert ids[0] == str(active.id)
    assert str(studied.id) in ids
    assert str(untouched.id) not in ids


def test_no_active_decks_and_no_params_returns_empty(db_session: Session, user):
    data = client.get("/api/v1/words/progress").json()

    assert data["decks"] == []
    assert data["aggregate"] == {
        "total": 0, "mastered": 0, "learning": 0, "not_started": 0,
        "learning_by_level": {"1": 0, "2": 0, "3": 0, "4": 0},
    }
