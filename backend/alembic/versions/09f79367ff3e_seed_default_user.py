"""seed_default_user

Revision ID: 09f79367ff3e
Revises: 9d0995b907da
Create Date: 2025-11-05 14:39:23.630338

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import uuid


# revision identifiers, used by Alembic.
revision: str = '09f79367ff3e'
down_revision: Union[str, Sequence[str], None] = '925386a31194'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed a default user for development and testing."""
    # We need a default user to associate with review logs, especially for
    # the hardcoded user ID in the `get_current_user_id` dependency.
    op.execute(
        """
        INSERT INTO users (id, email, hashed_password)
        VALUES ('00000000-0000-0000-0000-000000000000', 'default-user@example.com', 'default-password')
        ON CONFLICT (id) DO NOTHING;
        """
    )


def downgrade() -> None:
    """Remove the default user."""
    op.execute(
        """
        DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000000';
        """
    )