"""The learner's own words: progress per deck (and, in later PRs, the word list and CSV export).

A card is Mastered at level 5, Learning at levels 1-4, and Not started when the user has no association row for it.
See .ai/specs/word-review.md section 2.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from dabia import models
from dabia.api.deps import get_current_user
from dabia.core.srs_constants import PROFICIENCY_MASTERED
from dabia.database import get_db
from dabia.schemas.words import DeckProgress, ProgressCounts, WordsProgressResponse

router = APIRouter()


def active_deck_ids(user: models.User) -> list[uuid.UUID]:
    """The user's stored active decks as UUIDs, skipping anything malformed."""
    ids = []
    for value in user.active_deck_ids or []:
        try:
            ids.append(value if isinstance(value, uuid.UUID) else uuid.UUID(str(value)))
        except ValueError:
            continue
    return ids


def studied_deck_ids(db: Session, user_id: uuid.UUID) -> list[uuid.UUID]:
    rows = (
        db.query(models.Card.deck_id)
        .join(models.UserCardAssociation, models.UserCardAssociation.card_id == models.Card.id)
        .filter(models.UserCardAssociation.user_id == user_id)
        .distinct()
        .all()
    )
    return [row[0] for row in rows]


def add_level(counts: ProgressCounts, level: int, count: int) -> None:
    if level >= PROFICIENCY_MASTERED:
        counts.mastered += count
    elif level >= 1:
        counts.learning += count
        counts.learning_by_level[str(level)] += count


@router.get("/progress", response_model=WordsProgressResponse)
def get_progress(
    deck_id: Optional[list[uuid.UUID]] = Query(None),
    include_studied: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mastered / Learning / Not started counts for each requested deck, plus their sum."""
    active = active_deck_ids(current_user)
    requested = list(deck_id) if deck_id else list(active)
    if include_studied:
        requested += studied_deck_ids(db, current_user.id)
    requested = list(dict.fromkeys(requested))  # keep order, drop duplicates

    decks = {
        deck.id: deck for deck in db.query(models.Deck).filter(models.Deck.id.in_(requested)).all()
    } if requested else {}
    ordered_ids = [deck_uuid for deck_uuid in requested if deck_uuid in decks]

    totals = dict(
        db.query(models.Card.deck_id, func.count(models.Card.id))
        .filter(models.Card.deck_id.in_(ordered_ids))
        .group_by(models.Card.deck_id)
        .all()
    ) if ordered_ids else {}

    level_rows = (
        db.query(models.Card.deck_id, models.UserCardAssociation.proficiency_level, func.count())
        .join(models.UserCardAssociation, models.UserCardAssociation.card_id == models.Card.id)
        .filter(models.UserCardAssociation.user_id == current_user.id, models.Card.deck_id.in_(ordered_ids))
        .group_by(models.Card.deck_id, models.UserCardAssociation.proficiency_level)
        .all()
    ) if ordered_ids else []

    entries = {
        deck_uuid: DeckProgress(
            deck_id=deck_uuid,
            name=decks[deck_uuid].name,
            is_active=deck_uuid in active,
            total=totals.get(deck_uuid, 0),
        )
        for deck_uuid in ordered_ids
    }
    aggregate = ProgressCounts()
    for deck_uuid, level, count in level_rows:
        add_level(entries[deck_uuid], level, count)
        add_level(aggregate, level, count)

    for entry in entries.values():
        entry.not_started = max(entry.total - entry.mastered - entry.learning, 0)
        aggregate.total += entry.total
    aggregate.not_started = max(aggregate.total - aggregate.mastered - aggregate.learning, 0)

    return WordsProgressResponse(decks=list(entries.values()), aggregate=aggregate)
