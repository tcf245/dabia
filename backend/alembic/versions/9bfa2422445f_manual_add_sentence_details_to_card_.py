"""manual: add sentence details to card model

Revision ID: 9bfa2422445f
Revises: 09f79367ff3e
Create Date: 2025-11-07 22:39:06.311933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9bfa2422445f'
down_revision: Union[str, Sequence[str], None] = '09f79367ff3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('cards', sa.Column('sentence', sa.String(), nullable=True))
    op.add_column('cards', sa.Column('sentence_furigana', sa.String(), nullable=True))
    op.add_column('cards', sa.Column('sentence_translation', sa.String(), nullable=True))
    op.add_column('cards', sa.Column('sentence_audio_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('cards', 'sentence_audio_url')
    op.drop_column('cards', 'sentence_translation')
    op.drop_column('cards', 'sentence_furigana')
    op.drop_column('cards', 'sentence')
