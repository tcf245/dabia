import argparse
import csv
import sys
from pathlib import Path
from typing import Dict, Any, List, Generator

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, sessionmaker

# Add the project root to the Python path to allow importing from 'dabia'
sys.path.append(str(Path(__file__).resolve().parents[1]))

from dabia.models import Card, Deck

CHUNK_SIZE = 500

def chunk_reader(reader: csv.DictReader, size: int) -> Generator[List[Dict[str, Any]], None, None]:
    """Yields chunks of rows from a CSV reader."""
    chunk = []
    for i, row in enumerate(reader):
        if i % size == 0 and i > 0:
            yield chunk
            chunk = []
        chunk.append(row)
    if chunk:
        yield chunk

def get_or_create_deck(db: Session, deck_name: str, cache: Dict[str, Any]) -> Any:
    """Gets a deck from the cache or DB, or creates it if it doesn't exist."""
    if deck_name in cache:
        return cache[deck_name]

    deck = db.query(Deck).filter(Deck.name == deck_name).first()
    if deck:
        print(f"Found existing deck: '{deck_name}' (ID: {deck.id})")
        cache[deck_name] = deck.id
        return deck.id
    
    print(f"Deck '{deck_name}' not found, creating new one...")
    new_deck = Deck(name=deck_name, description=f"Cards from Anki export: {deck_name}")
    db.add(new_deck)
    db.flush()  # Flush to get the new ID without committing the transaction
    print(f"Created new deck: '{deck_name}' (ID: {new_deck.id})")
    cache[deck_name] = new_deck.id
    return new_deck.id

def get_session(db_url: str = None) -> Session:
    """Gets a database session, creating a new engine if a db_url is provided."""
    if db_url:
        print(f"Connecting to custom database...")
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    else:
        from dabia.database import get_db
        print("Connecting to default database from .env file...")
        return next(get_db())

def main(csv_path: Path, db_url: str = None):
    """Main function to import card data from a CSV file."""
    print(f"--- Starting data import from {csv_path} ---")

    db: Session = get_session(db_url)
    deck_cache: Dict[str, Any] = {}

    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            total_processed = 0
            card_mappings = []

            for i, row in enumerate(reader):
                # Skip metadata lines
                if not row or row[0].startswith('#'):
                    continue

                # Sanitize the deck name by taking the first two parts if split by '::'
                raw_deck_name = row[0]
                deck_parts = raw_deck_name.split('::')
                deck_name = '::'.join(deck_parts[:2]) if len(deck_parts) > 1 else raw_deck_name

                guid = row[1]
                word = row[2]
                reading = row[5]
                gloss = row[6] # Hint
                word_audio_raw = row[8]
                sentence = row[11]
                sentence_furigana = row[12]
                sentence_translation = row[13]
                sentence_audio_raw = row[15]

                deck_id = get_or_create_deck(db, deck_name, deck_cache)

                word_audio = word_audio_raw.replace('[sound:', '').replace(']', '')
                sentence_audio = sentence_audio_raw.replace('[sound:', '').replace(']', '')

                card_mappings.append({
                    "guid": guid,
                    "deck_id": deck_id,
                    "sentence_template": sentence.replace(word, "__"), # Create a simple cloze
                    "target_word": word,
                    "reading": reading,
                    "hint": gloss,
                    "audio_url": word_audio or None,
                    "sentence": sentence,
                    "sentence_furigana": sentence_furigana,
                    "sentence_translation": sentence_translation,
                    "sentence_audio_url": sentence_audio or None,
                })

                # Process in chunks
                if len(card_mappings) >= CHUNK_SIZE:
                    print(f"Processing chunk of {len(card_mappings)} cards...")
                    stmt = insert(Card).values(card_mappings)
                    stmt = stmt.on_conflict_do_nothing(index_elements=['guid'])
                    db.execute(stmt)
                    db.commit()
                    total_processed += len(card_mappings)
                    card_mappings = []

            # Process any remaining cards
            if card_mappings:
                print(f"Processing final chunk of {len(card_mappings)} cards...")
                stmt = insert(Card).values(card_mappings)
                stmt = stmt.on_conflict_do_nothing(index_elements=['guid'])
                db.execute(stmt)
                db.commit()
                total_processed += len(card_mappings)

    except FileNotFoundError:
        print(f"Error: File not found at {csv_path}", file=sys.stderr)
        sys.exit(1)
    except IndexError as e:
        print(f"CSV format error: A row has fewer columns than expected. Error: {e}", file=sys.stderr)
        print(f"Problematic row number: {i+1}, content: {row}", file=sys.stderr)
        db.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

    print(f"--- Data import complete. Processed {total_processed} rows. ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import card data from a CSV file into the database.")
    parser.add_argument("csv_path", type=Path, help="The absolute path to the notes.csv file.")
    parser.add_argument("--db-url", type=str, help="Optional: The full database connection URL. Overrides the .env file.")
    args = parser.parse_args()

    main(args.csv_path, args.db_url)
