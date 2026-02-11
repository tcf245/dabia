
import os
import sqlalchemy
from sqlalchemy import create_engine, text, Column, String, UUID, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import uuid

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/dbname")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define simplified models with corrected table and column names
class Card(Base):
    __tablename__ = "cards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id"))
    sentence_template = Column(String)
    target_word = Column(String, nullable=False)
    reading = Column(String)
    hint = Column(String) # Corrected from gloss
    audio_url = Column(String) # Corrected from word_audio_filename
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sentence = Column(String) # Corrected from full_example_sentence
    sentence_furigana = Column(String) # Corrected from sentence_with_furigana
    sentence_translation = Column(String)
    sentence_audio_url = Column(String) # Corrected from sentence_audio_filename
    guid = Column(String)

    def __repr__(self):
        return f"<Card(id='{self.id}', target_word='{self.target_word}', hint='{self.hint}')>"

class UserCardAssociation(Base):
    __tablename__ = "user_card_associations"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id"), primary_key=True)
    proficiency_level = Column(Integer, default=1) # Corrected column name
    next_review_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    interval = Column(Float, default=0.0)
    ease_factor = Column(Float, default=2.5)
    repetitions = Column(Integer, default=0) # Corrected column name
    lapses_count = Column(Integer, default=0)
    last_reviewed_at = Column(DateTime) # Corrected column name
    stability = Column(Float, default=0.0)

    def __repr__(self):
        return (
            f"<UserCardAssociation(user_id='{self.user_id}', "
            f"card_id='{self.card_id}', proficiency_level='{self.proficiency_level}', "
            f"next_review_at='{self.next_review_at}')>"
        )


def query_data():
    db = SessionLocal()
    try:
        print("--- Cards Table Data (First 5 rows) ---")
        cards = db.query(Card).limit(5).all()
        if cards:
            for card in cards:
                print(f"ID: {card.id}, Word: {card.target_word}, Reading: {card.reading}, Hint: {card.hint}, Sentence: {card.sentence}")
        else:
            print("No cards found.")

        print("\n--- UserCardAssociations Table Data (First 5 rows) ---")
        associations = db.query(UserCardAssociation).limit(5).all()
        if associations:
            for assoc in associations:
                print(f"User ID: {assoc.user_id}, Card ID: {assoc.card_id}, Proficiency Level: {assoc.proficiency_level}, Next Review: {assoc.next_review_at}, Interval: {assoc.interval}, Repetitions: {assoc.repetitions}, Ease Factor: {assoc.ease_factor}, Stability: {assoc.stability}")
        else:
            print("No user card associations found.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    query_data()
