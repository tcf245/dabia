"""Seed initial deck data

Revision ID: 9d0995b907da
Revises: 925386a31194
Create Date: 2025-11-04 20:42:26.516517

"""
import csv
import os
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d0995b907da'
down_revision: Union[str, Sequence[str], None] = '925386a31194'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed the database with the initial deck and cards."""
    # Create a UUID for the new deck
    deck_id = uuid.uuid4()

    # Define the decks table structure for insertion
    decks_table = sa.table(
        "decks",
        sa.column("id", sa.dialects.postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )

    # Insert the new deck
    op.bulk_insert(
        decks_table,
        [
            {
                "id": deck_id,
                "name": "Default Japanese Deck",
                "description": "Common Japanese particles and words.",
            }
        ],
    )

    # Define the cards table structure for insertion
    cards_table = sa.table(
        "cards",
        sa.column("id", sa.dialects.postgresql.UUID(as_uuid=True)),
        sa.column("deck_id", sa.dialects.postgresql.UUID(as_uuid=True)),
        sa.column("sentence_template", sa.String),
        sa.column("target_word", sa.String),
        sa.column("reading", sa.String),
        sa.column("hint", sa.String),
        sa.column("audio_url", sa.String),
        sa.column("sentence", sa.String),
        sa.column("sentence_furigana", sa.String),
        sa.column("sentence_translation", sa.String),
        sa.column("sentence_audio_url", sa.String),
    )

    # Read the CSV and prepare card data for insertion
    data_path = os.path.join(os.path.dirname(__file__), "../../data/test_deck.csv")
    cards_data = []
    with open(data_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cards_data.append(
                {
                    "id": uuid.uuid4(),
                    "deck_id": deck_id,
                    "sentence_template": row["sentence_template"],
                    "target_word": row["target_word"],
                    "reading": row["reading"],
                    "hint": row["hint"],
                    "audio_url": row["audio_url"],
                    "sentence": row["sentence"],
                    "sentence_furigana": row["sentence_furigana"],
                    "sentence_translation": row["sentence_translation"],
                    "sentence_audio_url": row["sentence_audio_url"],
                }
            )

    # Bulk insert the card data
    if cards_data:
        op.bulk_insert(cards_table, cards_data)


def downgrade() -> None:
    """Remove the initial seeded data."""
    # It's complex to know the exact UUIDs to delete, so we will delete based on the deck name.
    # This is not perfectly robust, but sufficient for this seeding script.
    # A more robust solution might involve storing the UUID in a well-known location.
    
    # First, get the deck_id for the deck we want to delete
    connection = op.get_bind()
    decks_table = sa.table(
        "decks",
        sa.column("id", sa.dialects.postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
    )
    deck_result = connection.execute(
        sa.select(decks_table.c.id).where(decks_table.c.name == "Default Japanese Deck")
    ).fetchone()

    if deck_result:
        deck_id_to_delete = deck_result[0]

        # Delete cards associated with the deck
        op.execute(
            f"DELETE FROM cards WHERE deck_id = '{deck_id_to_delete}'"
        )

        # Delete the deck itself
        op.execute(
            f"DELETE FROM decks WHERE id = '{deck_id_to_delete}'"
        )



def downgrade() -> None:
    """Remove the initial seeded data."""
    # It's complex to know the exact UUIDs to delete, so we will delete based on the deck name.
    # This is not perfectly robust, but sufficient for this seeding script.
    # A more robust solution might involve storing the UUID in a well-known location.
    
    # First, get the deck_id for the deck we want to delete
    connection = op.get_bind()
    decks_table = sa.table(
        "decks",
        sa.column("id", sa.dialects.postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
    )
    deck_result = connection.execute(
        sa.select(decks_table.c.id).where(decks_table.c.name == "Default Japanese Deck")
    ).fetchone()

    if deck_result:
        deck_id_to_delete = deck_result[0]

        # Delete cards associated with the deck
        op.execute(
            f"DELETE FROM cards WHERE deck_id = '{deck_id_to_delete}'"
        )

        # Delete the deck itself
        op.execute(
            f"DELETE FROM decks WHERE id = '{deck_id_to_delete}'"
        )

