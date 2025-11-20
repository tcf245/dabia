"""add stability to user_card_associations

Revision ID: 2643e4bd7ddb
Revises: ed103b27e3e8
Create Date: 2025-11-20 01:11:37.624596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2643e4bd7ddb'
down_revision: Union[str, Sequence[str], None] = 'ed103b27e3e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user_card_associations', sa.Column('stability', sa.Float(), nullable=False, server_default='0.0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user_card_associations', 'stability')
