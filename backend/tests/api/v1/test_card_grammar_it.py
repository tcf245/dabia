import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from dabia import models
from dabia.api.deps import get_current_user_id
from dabia.database import get_db
from dabia.main import app

client = TestClient(app)


@pytest.fixture(scope="function")
def override_get_db(db_session: Session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session):
    user = models.User(id=uuid.uuid4(), email="grammar@example.com", hashed_password="fake_hash")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user_id] = lambda: user.id
    return user


def create_card(db: Session) -> models.Card:
    deck = models.Deck(id=uuid.uuid4(), name="Grammar Deck")
    db.add(deck)
    db.commit()

    card = models.Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="私は__飲みます。",
        target_word="コーヒーを",
        reading="こーひーを",
        hint="coffee",
        sentence="私はコーヒーを飲みます。",
        sentence_furigana="わたしはこーひーをのみます。",
        sentence_translation="I drink coffee.",
    )
    db.add(card)
    db.commit()
    return card


def test_get_card_grammar_returns_sorted_annotations(db_session: Session, override_get_db, test_user):
    card = create_card(db_session)

    particle_point = models.GrammarPoint(
        id=uuid.uuid4(),
        slug="particle-o",
        title="Particle を",
        short_meaning="Marks the direct object.",
        category="particle",
        jlpt_level="N5",
        formation="noun + を + verb",
        notes="Used with transitive verbs.",
    )
    predicate_point = models.GrammarPoint(
        id=uuid.uuid4(),
        slug="polite-non-past",
        title="Polite Non-Past",
        short_meaning="Polite present/future verb form.",
        category="conjugation",
        jlpt_level="N5",
        formation="verb stem + ます",
        notes="Common polite sentence ending.",
    )
    db_session.add_all([particle_point, predicate_point])
    db_session.flush()

    db_session.add_all(
        [
            models.CardGrammarAnnotation(
                id=uuid.uuid4(),
                card_id=card.id,
                grammar_point_id=predicate_point.id,
                surface_text="飲みます",
                start_index=7,
                end_index=11,
                role_label="predicate",
                explanation_for_sentence="The predicate is in polite non-past form.",
                display_order=2,
                confidence=0.98,
                source="manual",
            ),
            models.CardGrammarAnnotation(
                id=uuid.uuid4(),
                card_id=card.id,
                grammar_point_id=particle_point.id,
                surface_text="を",
                start_index=5,
                end_index=6,
                role_label="object-marker",
                explanation_for_sentence="を marks コーヒー as the direct object.",
                display_order=1,
                confidence=0.99,
                source="manual",
            ),
        ]
    )
    db_session.commit()

    response = client.get(f"/api/v1/cards/{card.id}/grammar")

    assert response.status_code == 200
    payload = response.json()
    assert payload["card_id"] == str(card.id)
    assert len(payload["annotations"]) == 2
    assert payload["annotations"][0]["grammar_point"]["slug"] == "particle-o"
    assert payload["annotations"][1]["grammar_point"]["slug"] == "polite-non-past"
    assert payload["annotations"][0]["role_label"] == "object-marker"
    assert payload["annotations"][1]["explanation_for_sentence"] == "The predicate is in polite non-past form."


def test_get_card_grammar_returns_empty_annotations_for_card_without_grammar(
    db_session: Session, override_get_db, test_user
):
    card = create_card(db_session)

    response = client.get(f"/api/v1/cards/{card.id}/grammar")

    assert response.status_code == 200
    payload = response.json()
    assert payload["card_id"] == str(card.id)
    assert payload["annotations"] == []


def test_get_card_grammar_returns_404_for_missing_card(db_session: Session, override_get_db, test_user):
    response = client.get(f"/api/v1/cards/{uuid.uuid4()}/grammar")

    assert response.status_code == 404
