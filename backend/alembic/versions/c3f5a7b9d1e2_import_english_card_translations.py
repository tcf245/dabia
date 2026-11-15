"""Import English hints and sentence translations into card_translations

Revision ID: c3f5a7b9d1e2
Revises: b7e1c2d3f4a5
Create Date: 2026-11-16 00:00:00.000000

Data, not schema: seed data goes through Alembic (ADR 002), so every environment gets the same content when it
upgrades. The CSV (`alembic/data/card_translations_en.csv`, columns guid,hint,sentence_translation) was generated
from the Chinese content and validated for row count, empty fields and leftover CJK characters; see ADR 003.
Rows are matched to cards by guid; a guid with no card is skipped, so the migration also runs on an empty database.
Re-running it updates the English rows in place.
"""
import csv
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3f5a7b9d1e2'
down_revision: Union[str, Sequence[str], None] = 'b7e1c2d3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LANGUAGE = "en"
DATA = Path(__file__).resolve().parent.parent / "data" / "card_translations_en.csv"
CHUNK = 1000


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DROP TABLE IF EXISTS incoming_translations"))
    bind.execute(sa.text(
        "CREATE TEMPORARY TABLE incoming_translations (guid text PRIMARY KEY, hint text, sentence_translation text)"
    ))
    with DATA.open(encoding="utf-8", newline="") as f:
        rows = [
            {"guid": r["guid"], "hint": r["hint"] or None, "sentence_translation": r["sentence_translation"] or None}
            for r in csv.DictReader(f)
        ]
    insert = sa.text(
        "INSERT INTO incoming_translations (guid, hint, sentence_translation) VALUES (:guid, :hint, :sentence_translation)"
    )
    for start in range(0, len(rows), CHUNK):
        bind.execute(insert, rows[start:start + CHUNK])
    bind.execute(sa.text(
        """
        INSERT INTO card_translations (id, card_id, language, hint, sentence_translation)
        SELECT md5(random()::text || c.id::text)::uuid, c.id, :language, i.hint, i.sentence_translation
        FROM incoming_translations i JOIN cards c ON c.guid = i.guid
        ON CONFLICT (card_id, language)
        DO UPDATE SET hint = EXCLUDED.hint, sentence_translation = EXCLUDED.sentence_translation, updated_at = now()
        """
    ), {"language": LANGUAGE})
    bind.execute(sa.text("DROP TABLE incoming_translations"))


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM card_translations WHERE language = 'en'"))
