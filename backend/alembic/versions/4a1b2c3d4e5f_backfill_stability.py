"""backfill stability

Revision ID: 4a1b2c3d4e5f
Revises: 3827163d4321
Create Date: 2025-11-20 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a1b2c3d4e5f'
down_revision = '3827163d4321'
branch_labels = None
depends_on = None


def upgrade():
    # Backfill null stability with 0.0
    op.execute("UPDATE user_card_associations SET stability = 0.0 WHERE stability IS NULL")
    
    # Ensure it's not null (redundant if previous migration worked, but safe)
    op.alter_column('user_card_associations', 'stability',
               existing_type=sa.Float(),
               nullable=False)


def downgrade():
    pass
