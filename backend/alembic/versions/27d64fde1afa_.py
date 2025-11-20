"""empty message

Revision ID: 27d64fde1afa
Revises: a495263f4bf5, c48103ddeb17
Create Date: 2025-11-17 23:29:16.697972

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '27d64fde1afa'
down_revision: Union[str, Sequence[str], None] = ('a495263f4bf5', 'c48103ddeb17')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
