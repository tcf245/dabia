"""Add grammar skeleton tables

Revision ID: 3f6219f4a2c1
Revises: 9b4c214ac860
Create Date: 2026-03-15 22:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "3f6219f4a2c1"
down_revision: Union[str, Sequence[str], None] = "9b4c214ac860"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "grammar_points",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("short_meaning", sa.Text(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("jlpt_level", sa.String(), nullable=True),
        sa.Column("formation", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grammar_points_slug"), "grammar_points", ["slug"], unique=True)
    op.create_index(op.f("ix_grammar_points_category"), "grammar_points", ["category"], unique=False)
    op.create_index(op.f("ix_grammar_points_jlpt_level"), "grammar_points", ["jlpt_level"], unique=False)

    op.create_table(
        "card_grammar_annotations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("grammar_point_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("surface_text", sa.String(), nullable=False),
        sa.Column("start_index", sa.Integer(), nullable=True),
        sa.Column("end_index", sa.Integer(), nullable=True),
        sa.Column("role_label", sa.String(), nullable=True),
        sa.Column("explanation_for_sentence", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source", sa.String(), server_default="manual", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["grammar_point_id"], ["grammar_points.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_card_grammar_annotations_card_id"), "card_grammar_annotations", ["card_id"], unique=False)
    op.create_index(
        op.f("ix_card_grammar_annotations_grammar_point_id"),
        "card_grammar_annotations",
        ["grammar_point_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_card_grammar_annotations_grammar_point_id"), table_name="card_grammar_annotations")
    op.drop_index(op.f("ix_card_grammar_annotations_card_id"), table_name="card_grammar_annotations")
    op.drop_table("card_grammar_annotations")
    op.drop_index(op.f("ix_grammar_points_jlpt_level"), table_name="grammar_points")
    op.drop_index(op.f("ix_grammar_points_category"), table_name="grammar_points")
    op.drop_index(op.f("ix_grammar_points_slug"), table_name="grammar_points")
    op.drop_table("grammar_points")
