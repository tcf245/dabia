"""add srs fields to user_card_associations

Revision ID: ed103b27e3e8
Revises: 27d64fde1afa
Create Date: 2025-11-19 20:01:02.736597

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed103b27e3e8'
down_revision: Union[str, Sequence[str], None] = '27d64fde1afa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Alter interval from Integer to Float
    op.alter_column('user_card_associations', 'interval',
               existing_type=sa.Integer(),
               type_=sa.Float(),
               existing_nullable=False,
               existing_server_default='0')

    # Add new columns
    op.add_column('user_card_associations', sa.Column('repetitions', sa.Integer(), server_default='0', nullable=False))
    op.add_column('user_card_associations', sa.Column('lapses_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('user_card_associations', sa.Column('last_reviewed_at', sa.DateTime(), nullable=True))
    
    # Create index on next_review_at
    op.create_index(op.f('ix_user_card_associations_next_review_at'), 'user_card_associations', ['next_review_at'], unique=False)

    # Drop old column 'lapses'
    op.drop_column('user_card_associations', 'lapses')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('user_card_associations', sa.Column('lapses', sa.Integer(), server_default='0', nullable=False))
    op.drop_index(op.f('ix_user_card_associations_next_review_at'), table_name='user_card_associations')
    op.drop_column('user_card_associations', 'last_reviewed_at')
    op.drop_column('user_card_associations', 'lapses_count')
    op.drop_column('user_card_associations', 'repetitions')
    
    op.alter_column('user_card_associations', 'interval',
               existing_type=sa.Float(),
               type_=sa.Integer(),
               existing_nullable=False,
               existing_server_default='0')
