"""make next_review_at not null

Revision ID: 3827163d4321
Revises: 2643e4bd7ddb
Create Date: 2025-11-20 11:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3827163d4321'
down_revision = '2643e4bd7ddb'
branch_labels = None
depends_on = None


def upgrade():
    # Update existing nulls to avoid failure when setting NOT NULL
    op.execute("UPDATE user_card_associations SET next_review_at = NOW() WHERE next_review_at IS NULL")
    
    op.alter_column('user_card_associations', 'next_review_at',
               existing_type=sa.DateTime(),
               nullable=False)


def downgrade():
    op.alter_column('user_card_associations', 'next_review_at',
               existing_type=sa.DateTime(),
               nullable=True)
