import os
from pathlib import Path

from sqlalchemy.orm import Session

from dabia.models import Card, Deck
from scripts.import_data import main as import_data_main


def test_import_n2_grammar_deck_creates_dedicated_deck_with_cards(db_session: Session):
    csv_path = Path(__file__).resolve().parents[2] / "data" / "jlpt_n2_grammar_deck.csv"

    import_data_main(csv_path, os.environ["DATABASE_URL"])

    deck = db_session.query(Deck).filter(Deck.name == "dabia-jlpt::N2 Grammar").one()
    cards = db_session.query(Card).filter(Card.deck_id == deck.id).all()

    assert deck.description == "JLPT N2 grammar patterns from the local Japanese N2 Grammar wiki note."
    assert deck.difficulty == "Advanced"
    assert deck.tags == ["JLPT N2", "Grammar"]
    assert len(cards) == 160
    assert any(card.target_word == "～おかげで / ～おかげだ" for card in cards)
