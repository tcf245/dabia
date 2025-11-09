"""empty message

Revision ID: 0f56efae7d2b
Revises: 9d0995b907da, d8fba10e8363
Create Date: 2025-11-09 19:18:22.106404

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f56efae7d2b'
down_revision: Union[str, Sequence[str], None] = ('9d0995b907da', 'd8fba10e8363')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
