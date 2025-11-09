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
down_revision: Union[str, Sequence[str], None] = '9bfa2422445f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed the database with the initial deck and cards."""
    pass


def downgrade() -> None:
    """Remove the initial seeded data."""
    pass

