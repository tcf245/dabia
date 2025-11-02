"""Seed initial test deck data

Revision ID: 7b5a7b8555d7
Revises: 8f1df2aa5c9f
Create Date: 2025-11-01 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, UUID
import uuid
import csv
import os

# revision identifiers, used by Alembic.
revision = '7b5a7b8555d7'
down_revision = '8f1df2aa5c9f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Define table structure for bulk insert
    users_table = table('users',
        column('id', UUID),
        column('email', String),
        column('hashed_password', String)
    )
    decks_table = table('decks',
        column('id', UUID),
        column('name', String),
        column('description', String)
    )
    cards_table = table('cards',
        column('id', UUID),
        column('deck_id', UUID),
        column('sentence_template', String),
        column('target_word', String),
        column('reading', String),
        column('hint', String)
    )

    # Seed the default user for MVP
    op.bulk_insert(users_table, [
        {
            'id': '00000000-0000-0000-0000-000000000000',
            'email': 'test@example.com',
            'hashed_password': 'fake_password_hash'
        }
    ])

    # Create the Test Deck
    test_deck_id = uuid.uuid4()
    op.bulk_insert(decks_table, [
        {
            'id': test_deck_id,
            'name': 'Test Deck',
            'description': 'A deck for testing and validation.'
        }
    ])

    # Read data from CSV and prepare for bulk insert
    data_file = os.path.join(os.path.dirname(__file__), '../../data/test_deck.csv')
    cards_to_insert = []
    with open(data_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cards_to_insert.append({
                'id': uuid.uuid4(),
                'deck_id': test_deck_id,
                'sentence_template': row['sentence_template'],
                'target_word': row['target_word'],
                'reading': row['reading'],
                'hint': row['hint']
            })
    
    if cards_to_insert:
        op.bulk_insert(cards_table, cards_to_insert)


def downgrade() -> None:
    # In a real scenario, you might want to be more specific
    # but for this MVP, deleting all cards and decks is fine.
    op.execute("DELETE FROM cards")
    op.execute("DELETE FROM decks")