"""Add card_translations and copy the existing Chinese content into it

Revision ID: b7e1c2d3f4a5
Revises: 9b4c214ac860
Create Date: 2026-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7e1c2d3f4a5'
down_revision: Union[str, Sequence[str], None] = '9b4c214ac860'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create card_translations and copy every card's current hint and sentence translation as 'zh'.

    The columns on cards are kept: they remain the fallback, and older clients keep working.
    """
    op.create_table(
        'card_translations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('card_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('language', sa.String(length=16), nullable=False),
        sa.Column('hint', sa.String(), nullable=True),
        sa.Column('sentence_translation', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('card_id', 'language', name='uq_card_translations_card_language'),
    )
    op.create_index(op.f('ix_card_translations_card_id'), 'card_translations', ['card_id'], unique=False)
    op.execute(
        """
        INSERT INTO card_translations (id, card_id, language, hint, sentence_translation)
        SELECT md5(random()::text || id::text)::uuid, id, 'zh', hint, sentence_translation  -- no pgcrypto or PG13 needed
        FROM cards
        WHERE hint IS NOT NULL OR sentence_translation IS NOT NULL
        """
    )


def downgrade() -> None:
    """Drop card_translations; the Chinese content is still on cards."""
    op.drop_index(op.f('ix_card_translations_card_id'), table_name='card_translations')
    op.drop_table('card_translations')
