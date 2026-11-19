"""Which learner language a card is served in.

No list of languages lives in code: a language is available as soon as card_translations has rows for it, so adding
one is a data import (see .ai/decisions/003-card-content-i18n.md). Language codes are lowercase BCP 47 tags such as
"en", "ja", "pt-br" or "zh-hant". A request falls back from the full tag to its base language and then to Chinese,
field by field, so a card that is not yet translated still shows its meaning instead of nothing.
"""
import re
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from dabia import models

DEFAULT_LANGUAGE = "zh"  # the original content language: every card has it
LANGUAGE_TAG = re.compile(r"[a-z]{2,3}(?:-[a-z0-9]{2,8})*")


def normalize_language(tag: Optional[str]) -> Optional[str]:
    """'en_US' -> 'en-us'. Returns None for anything that is not a language tag."""
    if not tag:
        return None
    normalized = tag.strip().lower().replace("_", "-")
    return normalized if LANGUAGE_TAG.fullmatch(normalized) else None


def language_chain(requested: Optional[str]) -> list[str]:
    """The languages to try, best first: 'pt-br' -> ['pt-br', 'pt', 'zh']."""
    chain: list[str] = []
    tag = normalize_language(requested)
    if tag:
        parts = tag.split("-")
        chain = ["-".join(parts[:size]) for size in range(len(parts), 0, -1)]
    return [*dict.fromkeys([*chain, DEFAULT_LANGUAGE])]


def resolve_language(requested: Optional[str]) -> str:
    """The first choice for a request; whether rows exist for it is decided per card by `localize`."""
    return language_chain(requested)[0]


@dataclass(frozen=True)
class LocalizedContent:
    hint: Optional[str]
    sentence_translation: Optional[str]
    language: str  # the language of the hint actually served, after any fallback


def _pick(card: models.Card, rows: dict[str, models.CardTranslation], chain: list[str]) -> LocalizedContent:
    found = [rows[language] for language in chain if language in rows]

    def first(field: str) -> Optional[str]:
        values = [getattr(row, field) for row in found if getattr(row, field)]
        return values[0] if values else getattr(card, field)

    served = next((row.language for row in found if row.hint), DEFAULT_LANGUAGE)
    return LocalizedContent(first("hint"), first("sentence_translation"), served)


def localize(db: Session, card: models.Card, requested: Optional[str]) -> LocalizedContent:
    chain = language_chain(requested)
    rows = {
        row.language: row
        for row in db.query(models.CardTranslation).filter(
            models.CardTranslation.card_id == card.id, models.CardTranslation.language.in_(chain),
        )
    }
    return _pick(card, rows, chain)


def localize_many(db: Session, cards: list[models.Card], requested: Optional[str]) -> dict:
    """`localize` for many cards with one query: {card_id: LocalizedContent}."""
    if not cards:
        return {}
    chain = language_chain(requested)
    by_card: dict = {card.id: {} for card in cards}
    for row in db.query(models.CardTranslation).filter(
        models.CardTranslation.card_id.in_(list(by_card)), models.CardTranslation.language.in_(chain),
    ):
        by_card[row.card_id][row.language] = row
    return {card.id: _pick(card, by_card[card.id], chain) for card in cards}


def available_languages(db: Session) -> list[tuple[str, int]]:
    """Each language that has translations, with the number of cards it covers; the default language first."""
    rows = (
        db.query(models.CardTranslation.language, func.count(models.CardTranslation.id))
        .group_by(models.CardTranslation.language)
        .all()
    )
    return sorted(((language, count) for language, count in rows), key=lambda row: (row[0] != DEFAULT_LANGUAGE, row[0]))
