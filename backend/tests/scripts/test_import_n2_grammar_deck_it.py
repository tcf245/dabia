import os
import csv
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
    assert any(
        card.target_word == "おかげで"
        and card.sentence_template == "先生のご指導の__、大学院の試験に合格した。"
        for card in cards
    )


def test_import_updates_existing_cards_for_regenerated_deck_rows(db_session: Session, tmp_path: Path):
    old_csv = tmp_path / "old.csv"
    new_csv = tmp_path / "new.csv"
    guid = "fixed-guid-1"

    old_row = [
        "dabia-jlpt::N2 Grammar",
        guid,
        "～っぽい",
        "",
        "",
        "N / V-ます形去掉ます",
        "语气、倾向、状态与神态表达 | 容易…的",
        "",
        "",
        "",
        "",
        "今日は風が強くて、ほこりっぽい。",
        "今日は風が強くて、ほこりっぽい。",
        "今天风很大，感觉空气里到处都灰蒙蒙的。",
        "",
        "",
    ]
    new_row = [
        "dabia-jlpt::N2 Grammar",
        guid,
        "っぽい",
        "",
        "",
        "N / V-ます形去掉ます",
        "语气、倾向、状态与神态表达 | 容易…的",
        "",
        "",
        "",
        "",
        "今日は風が強くて、ほこり__。",
        "今日は風が強くて、ほこりっぽい。",
        "今天风很大，感觉空气里到处都灰蒙蒙的。",
        "",
        "jlpt_n2_grammar/fixed-guid-1.mp3",
    ]

    for path, row in [(old_csv, old_row), (new_csv, new_row)]:
        with path.open("w", encoding="utf-8", newline="") as handle:
            csv.writer(handle).writerow(row)

    import_data_main(old_csv, os.environ["DATABASE_URL"])
    import_data_main(new_csv, os.environ["DATABASE_URL"])

    db_session.expire_all()
    card = db_session.query(Card).filter(Card.guid == guid).one()
    assert card.target_word == "っぽい"
    assert card.sentence_template == "今日は風が強くて、ほこり__。"
    assert card.sentence_audio_url == "jlpt_n2_grammar/fixed-guid-1.mp3"
