"""Remove initial seed data from database

Revision ID: a495263f4bf5
Revises: 0f56efae7d2b
Create Date: 2025-11-09 19:18:48.046858

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a495263f4bf5'
down_revision: Union[str, Sequence[str], None] = '0f56efae7d2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    """Downgrade schema."""
    pass
