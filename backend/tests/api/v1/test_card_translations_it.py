"""Cards are served in the learner's language, falling back from the full tag to its base language and then to
Chinese, field by field. No language list lives in code: importing rows is enough to add one."""
import os
import uuid

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from dabia import models
from dabia.api.deps import get_current_user_id
from dabia.core.i18n import language_chain, localize, localize_many, resolve_language
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
    user = models.User(id=uuid.uuid4(), email="i18n@example.com", hashed_password="fake_hash")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user_id] = lambda: user.id
    return user


@pytest.fixture
def card(db_session: Session):
    deck = models.Deck(id=uuid.uuid4(), name=f"I18n Deck {uuid.uuid4()}")
    db_session.add(deck)
    card = models.Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="妹は__に通っています",
        target_word="高校",
        reading="こうこう",
        hint="高中",
        sentence="妹は高校に通っています",
        sentence_translation="妹妹在上高中",
    )
    db_session.add(card)
    db_session.add(models.CardTranslation(card_id=card.id, language="zh", hint="高中", sentence_translation="妹妹在上高中"))
    db_session.commit()
    return card


def add_english(db_session, card, hint="high school", sentence_translation="My younger sister attends high school."):
    db_session.add(models.CardTranslation(card_id=card.id, language="en", hint=hint, sentence_translation=sentence_translation))
    db_session.commit()


def test_a_card_is_served_in_english_when_asked(db_session, override_get_db, test_user, card):
    add_english(db_session, card)
    data = client.get(f"/api/v1/cards/{card.id}?lang=en").json()
    assert data["target"]["hint"] == "high school"
    assert data["sentence_translation"] == "My younger sister attends high school."
    assert data["language"] == "en"
    assert data["sentence"] == "妹は高校に通っています"  # the Japanese side never changes


def test_without_a_language_the_card_is_chinese(db_session, override_get_db, test_user, card):
    add_english(db_session, card)
    data = client.get(f"/api/v1/cards/{card.id}").json()
    assert data["target"]["hint"] == "高中" and data["language"] == "zh"


def test_an_untranslated_card_falls_back_to_chinese(db_session, override_get_db, test_user, card):
    data = client.get(f"/api/v1/cards/{card.id}?lang=en").json()
    assert data["target"]["hint"] == "高中"
    assert data["sentence_translation"] == "妹妹在上高中"
    assert data["language"] == "zh"


def test_a_missing_sentence_translation_falls_back_alone(db_session, override_get_db, test_user, card):
    add_english(db_session, card, sentence_translation=None)
    data = client.get(f"/api/v1/cards/{card.id}?lang=en").json()
    assert data["target"]["hint"] == "high school"
    assert data["sentence_translation"] == "妹妹在上高中"


def test_a_card_without_any_translation_rows_uses_its_own_columns(db_session, override_get_db, test_user, card):
    db_session.query(models.CardTranslation).filter_by(card_id=card.id).delete()
    db_session.commit()
    data = client.get(f"/api/v1/cards/{card.id}?lang=en").json()
    assert data["target"]["hint"] == "高中" and data["language"] == "zh"


def test_the_next_card_comes_in_the_requested_language(db_session, override_get_db, test_user, card):
    add_english(db_session, card)
    data = client.post("/api/v1/session/next-card?lang=en").json()
    assert data["card"]["card_id"] == str(card.id)
    assert data["card"]["target"]["hint"] == "high school"
    assert data["card"]["language"] == "en"


@pytest.mark.parametrize(
    "requested, chain",
    [
        (None, ["zh"]), ("", ["zh"]), ("en", ["en", "zh"]), ("en-US", ["en-us", "en", "zh"]),
        ("EN_gb", ["en-gb", "en", "zh"]), ("zh-CN", ["zh-cn", "zh"]), ("zh-Hant-TW", ["zh-hant-tw", "zh-hant", "zh"]),
        ("fr", ["fr", "zh"]), ("not a tag!", ["zh"]), ("e", ["zh"]),
    ],
)
def test_requested_languages_fall_back_from_the_full_tag_to_the_base_and_then_chinese(requested, chain):
    assert language_chain(requested) == chain
    assert resolve_language(requested) == chain[0]


def test_a_regional_request_uses_the_base_language(db_session, override_get_db, test_user, card):
    add_english(db_session, card)
    data = client.get(f"/api/v1/cards/{card.id}?lang=en-GB").json()
    assert data["target"]["hint"] == "high school" and data["language"] == "en"


def test_a_regional_variant_wins_over_its_base(db_session, override_get_db, test_user, card):
    add_english(db_session, card)
    db_session.add(models.CardTranslation(card_id=card.id, language="pt-br", hint="ensino médio"))
    db_session.add(models.CardTranslation(card_id=card.id, language="pt", hint="secundário"))
    db_session.commit()
    data = client.get(f"/api/v1/cards/{card.id}?lang=pt-BR").json()
    assert data["target"]["hint"] == "ensino médio" and data["language"] == "pt-br"
    assert data["sentence_translation"] == "妹妹在上高中"  # no Portuguese sentence yet: Chinese, not empty


def test_a_new_language_works_from_data_alone(db_session, override_get_db, test_user, card):
    """Adding a language is an import, not a code change."""
    db_session.add(models.CardTranslation(card_id=card.id, language="vi", hint="trường trung học", sentence_translation="Em gái tôi học cấp ba."))
    db_session.commit()
    data = client.get(f"/api/v1/cards/{card.id}?lang=vi").json()
    assert data["target"]["hint"] == "trường trung học" and data["language"] == "vi"
    languages = {row["code"]: row["cards"] for row in client.get("/api/v1/languages").json()["languages"]}
    assert languages["vi"] >= 1


def test_the_language_list_puts_the_default_first_and_needs_no_login(db_session, override_get_db, card):
    add_english(db_session, card)
    app.dependency_overrides.pop(get_current_user_id, None)
    response = client.get("/api/v1/languages")
    assert response.status_code == 200
    body = response.json()
    assert body["default"] == "zh"
    codes = [row["code"] for row in body["languages"]]
    assert codes[0] == "zh" and "en" in codes


def test_deleting_a_card_deletes_its_translations(db_session, card):
    db_session.delete(card)
    db_session.commit()
    assert db_session.query(models.CardTranslation).filter_by(card_id=card.id).count() == 0


def test_the_migration_copies_existing_chinese_content(db_engine):
    """Existing rows become 'zh' translations; downgrading and upgrading again must leave the schema at head."""
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "..", "..", "alembic.ini"))
    command.downgrade(cfg, "9b4c214ac860")
    deck_id, card_id, bare_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    try:
        with db_engine.begin() as conn:
            conn.execute(sa.text("INSERT INTO decks (id, name) VALUES (:id, :name)"), {"id": deck_id, "name": f"migr-{deck_id}"})
            conn.execute(
                sa.text(
                    "INSERT INTO cards (id, deck_id, sentence_template, target_word, hint, sentence_translation) "
                    "VALUES (:id, :deck, '__', '丸', '圆', '画圈'), (:bare, :deck, '__', '何', NULL, NULL)"
                ),
                {"id": card_id, "bare": bare_id, "deck": deck_id},
            )
        command.upgrade(cfg, "head")
        with db_engine.connect() as conn:
            rows = conn.execute(
                sa.text("SELECT card_id, language, hint, sentence_translation FROM card_translations WHERE card_id IN (:a, :b)"),
                {"a": card_id, "b": bare_id},
            ).all()
        assert [(r.card_id, r.language, r.hint, r.sentence_translation) for r in rows] == [(card_id, "zh", "圆", "画圈")]
    finally:
        command.upgrade(cfg, "head")
        with db_engine.begin() as conn:
            conn.execute(sa.text("DELETE FROM card_translations WHERE card_id IN (:a, :b)"), {"a": card_id, "b": bare_id})
            conn.execute(sa.text("DELETE FROM cards WHERE deck_id = :d"), {"d": deck_id})
            conn.execute(sa.text("DELETE FROM decks WHERE id = :d"), {"d": deck_id})


def test_the_english_import_matches_cards_by_guid_and_can_be_rolled_back(db_engine):
    """The data migration fills English rows for cards whose guid is in the CSV and skips guids with no card."""
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "..", "..", "alembic.ini"))
    command.downgrade(cfg, "b7e1c2d3f4a5")
    deck_id, card_id = uuid.uuid4(), uuid.uuid4()
    try:
        with db_engine.begin() as conn:
            conn.execute(sa.text("INSERT INTO decks (id, name) VALUES (:id, :name)"), {"id": deck_id, "name": f"en-{deck_id}"})
            conn.execute(
                sa.text(
                    "INSERT INTO cards (id, deck_id, guid, sentence_template, target_word, hint) "
                    "VALUES (:id, :deck, '469b5ba2-a0bb-11ef-9eca-75d1f1bae144', '__', '高校', '高中')"
                ),
                {"id": card_id, "deck": deck_id},
            )
        command.upgrade(cfg, "head")
        with db_engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT hint, sentence_translation FROM card_translations WHERE card_id = :c AND language = 'en'"),
                {"c": card_id},
            ).one()
            total = conn.execute(sa.text("SELECT count(*) FROM card_translations WHERE language = 'en'")).scalar()
        assert row.hint == "high school; senior high school"
        assert row.sentence_translation == "My younger sister attends high school."
        assert total == 1  # the other 10,306 guids have no card in this database and are skipped
        command.downgrade(cfg, "b7e1c2d3f4a5")
        with db_engine.connect() as conn:
            assert conn.execute(sa.text("SELECT count(*) FROM card_translations WHERE language = 'en'")).scalar() == 0
    finally:
        command.upgrade(cfg, "head")
        with db_engine.begin() as conn:
            conn.execute(sa.text("DELETE FROM card_translations WHERE card_id = :c"), {"c": card_id})
            conn.execute(sa.text("DELETE FROM cards WHERE id = :c"), {"c": card_id})
            conn.execute(sa.text("DELETE FROM decks WHERE id = :d"), {"d": deck_id})


def test_localize_many_empty_input_issues_no_queries(db_session: Session):
    query_count = 0
    bind = db_session.get_bind()

    def count_query(*_args, **_kwargs):
        nonlocal query_count
        query_count += 1

    sa.event.listen(bind, "before_cursor_execute", count_query)
    try:
        assert localize_many(db_session, [], "en") == {}
    finally:
        sa.event.remove(bind, "before_cursor_execute", count_query)

    assert query_count == 0


def test_localize_many_issues_one_query_and_matches_localize(db_session: Session):
    deck = models.Deck(id=uuid.uuid4(), name=f"I18n Many Deck {uuid.uuid4()}")
    db_session.add(deck)
    db_session.flush()

    card_full = models.Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="__",
        target_word="花",
        reading="はな",
        hint="花朵",
        sentence_translation="这是一朵花。",
    )
    card_partial = models.Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="__",
        target_word="水",
        reading="みず",
        hint="水",
        sentence_translation="我想喝水。",
    )
    card_regional = models.Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="__",
        target_word="高校",
        reading="こうこう",
        hint="高中",
        sentence_translation="妹妹在上高中。",
    )
    card_bare = models.Card(
        id=uuid.uuid4(),
        deck_id=deck.id,
        sentence_template="__",
        target_word="山",
        reading="やま",
        hint="山",
        sentence_translation="那座山很高。",
    )
    cards = [card_full, card_partial, card_regional, card_bare]
    db_session.add_all(cards)
    db_session.add_all([
        models.CardTranslation(card_id=card_full.id, language="zh", hint="花朵", sentence_translation="这是一朵花。"),
        models.CardTranslation(card_id=card_full.id, language="en", hint="flower", sentence_translation="This is a flower."),
        models.CardTranslation(card_id=card_partial.id, language="zh", hint="水", sentence_translation="我想喝水。"),
        models.CardTranslation(card_id=card_partial.id, language="en", hint="water", sentence_translation=None),
        models.CardTranslation(card_id=card_regional.id, language="zh", hint="高中", sentence_translation="妹妹在上高中。"),
        models.CardTranslation(card_id=card_regional.id, language="pt", hint="secundario", sentence_translation=None),
        models.CardTranslation(card_id=card_regional.id, language="pt-br", hint="ensino medio", sentence_translation=None),
    ])
    db_session.commit()

    bind = db_session.get_bind()
    for requested in ("en", "pt-BR", None):
        expected = {c.id: localize(db_session, c, requested) for c in cards}

        query_count = 0

        def count_query(*_args, **_kwargs):
            nonlocal query_count
            query_count += 1

        sa.event.listen(bind, "before_cursor_execute", count_query)
        try:
            actual = localize_many(db_session, cards, requested)
        finally:
            sa.event.remove(bind, "before_cursor_execute", count_query)

        assert query_count == 1
        assert actual == expected
