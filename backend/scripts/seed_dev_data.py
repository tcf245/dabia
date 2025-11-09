import csv
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dabia.models.deck import Deck
from dabia.models.card import Card
from dabia.core.config import settings

def seed_data():
    """Seed the database with test data."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Check if the deck already exists
        deck_name = "Default Japanese Deck"
        deck = session.query(Deck).filter_by(name=deck_name).first()
        if not deck:
            deck = Deck(
                name=deck_name,
                description="Common Japanese particles and words.",
            )
            session.add(deck)
            session.commit()
            session.refresh(deck)

        # Read the CSV and prepare card data for insertion
        data_path = os.path.join(os.path.dirname(__file__), "../data/test_deck.csv")
        with open(data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Check if the card already exists
                card = session.query(Card).filter_by(sentence_template=row["sentence_template"], target_word=row["target_word"]).first()
                if not card:
                    card = Card(
                        deck_id=deck.id,
                        sentence_template=row["sentence_template"],
                        target_word=row["target_word"],
                        reading=row["reading"],
                        hint=row["hint"],
                        audio_url=row["audio_url"],
                        sentence=row["sentence"],
                        sentence_furigana=row["sentence_furigana"],
                        sentence_translation=row["sentence_translation"],
                        sentence_audio_url=row["sentence_audio_url"],
                    )
                    session.add(card)
        session.commit()
        print("Successfully seeded the database with test data.")
    finally:
        session.close()

if __name__ == "__main__":
    seed_data()
