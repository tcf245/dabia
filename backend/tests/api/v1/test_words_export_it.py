import csv
import io
import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from dabia import models
from dabia.api.deps import get_current_user
from dabia.database import get_db
from dabia.main import app

client = TestClient(app)
DEMO_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")
HEADER = [
    "word", "reading", "meaning", "meaning_language", "status", "level", "deck", "sentence",
    "sentence_translation", "first_seen_at", "last_reviewed_at", "next_review_at", "review_count",
    "correct_count", "accuracy", "lapses", "card_id",
]


@pytest.fixture
def user(db_session: Session):
    user = models.User(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    deck = models.Deck(id=uuid.uuid4(), name=f"JLPT N4+N5 {uuid.uuid4().hex[:6]}")
    db_session.add_all([user, deck])
    user.active_deck_ids = [str(deck.id)]
    db_session.commit()
    user.deck = deck
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.clear()


def add_word(db, user, deck, word, hint, level, reading="よみ"):
    card = models.Card(id=uuid.uuid4(), deck_id=deck.id, target_word=word, reading=reading, hint=hint,
                       sentence_template="__", sentence=f"{word}です。")
    db.add(card)
    db.flush()
    db.add(models.UserCardAssociation(user_id=user.id, card_id=card.id, proficiency_level=level,
                                      last_reviewed_at=datetime(2026, 11, 1), next_review_at=datetime(2026, 12, 1)))
    db.commit()
    return card


def read_csv(response):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    raw = response.content
    assert raw.startswith("﻿".encode("utf-8"))  # BOM for Excel
    return list(csv.reader(io.StringIO(raw.decode("utf-8-sig"))))


def test_export_has_header_and_japanese_round_trips(db_session, user):
    add_word(db_session, user, user.deck, "食べる", "to eat", 3, reading="たべる")

    rows = read_csv(client.get("/api/v1/words/export"))

    assert rows[0] == HEADER
    record = dict(zip(HEADER, rows[1]))
    assert record["word"] == "食べる"
    assert record["reading"] == "たべる"
    assert record["status"] == "learning"
    assert record["level"] == "3"
    assert record["deck"] == user.deck.name
    assert record["last_reviewed_at"] == "2026-11-01T00:00:00Z"
    assert record["review_count"] == "0"
    assert record["accuracy"] == ""


def test_formula_like_cells_are_neutralized(db_session, user):
    add_word(db_session, user, user.deck, "=HYPERLINK(\"x\")", "+1", 2)

    record = dict(zip(HEADER, read_csv(client.get("/api/v1/words/export"))[1]))

    assert record["word"] == "'=HYPERLINK(\"x\")"
    assert record["meaning"] == "'+1"


def test_export_rows_match_the_list_for_the_same_filters(db_session, user):
    for n, level in enumerate([1, 2, 4, 5, 5]):
        add_word(db_session, user, user.deck, f"w{n}", f"m{n}", level)

    for params in ({}, {"status": "learning"}, {"status": "mastered"}, {"q": "w1"}, {"all_decks": "true"}):
        listed = [i["card_id"] for i in client.get("/api/v1/words", params={**params, "limit": 100}).json()["items"]]
        exported = [row[-1] for row in read_csv(client.get("/api/v1/words/export", params=params))[1:]]
        assert exported == listed, params


def test_export_streams_more_than_one_internal_page(db_session, user):
    deck = user.deck
    cards = [models.Card(id=uuid.uuid4(), deck_id=deck.id, target_word=f"w{n}", reading="r", sentence_template="__")
             for n in range(1203)]
    db_session.add_all(cards)
    db_session.flush()
    db_session.add_all([models.UserCardAssociation(user_id=user.id, card_id=c.id, proficiency_level=2) for c in cards])
    db_session.commit()

    assert len(read_csv(client.get("/api/v1/words/export"))) == 1204


def test_filename_names_the_scope(db_session, user):
    add_word(db_session, user, user.deck, "a", "", 2)

    single = client.get("/api/v1/words/export", params={"status": "learning"}).headers["content-disposition"]
    everything = client.get("/api/v1/words/export", params={"all_decks": "true"}).headers["content-disposition"]

    assert single.startswith("attachment;")
    assert "jlpt-n4-n5" in single and "-learning-" in single and single.count(".csv") >= 1
    assert "all-decks" in everything


def test_demo_user_cannot_export(db_session, user):
    demo = models.User(id=DEMO_USER_ID, email="demo@example.com")
    if not db_session.get(models.User, DEMO_USER_ID):
        db_session.add(demo)
        db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: db_session.get(models.User, DEMO_USER_ID)

    response = client.get("/api/v1/words/export")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in to export"


def test_content_disposition_is_exposed_to_the_browser():
    exposed = client.get("/", headers={"Origin": "http://localhost:5173"}).headers.get(
        "access-control-expose-headers", "")
    assert "content-disposition" in exposed.lower()
    assert "x-refresh-token" in exposed.lower()
