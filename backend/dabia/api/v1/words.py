"""The learner's own words: progress per deck, the word list and its CSV export.

A card is Mastered at level 5, Learning at levels 1-4, and Not started when the user has no association row for it.
See .ai/specs/word-review.md section 2.
"""
import csv
import io
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from dabia import models
from dabia.api.deps import get_current_user
from dabia.core.i18n import language_chain, localize_many
from dabia.core.srs_constants import PROFICIENCY_MASTERED
from dabia.core.storage import storage_provider
from dabia.core.word_search import Candidate, score
from dabia.database import get_db
from dabia.schemas.words import (
    DeckProgress, ProgressCounts, WordDeck, WordItem, WordsListResponse, WordsProgressResponse,
)

router = APIRouter()
DEMO_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")  # signed-out visitors share it


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


SortKey = Literal["relevance", "last_reviewed", "next_review", "level", "first_seen", "lapses"]
DEFAULT_ORDER = {
    "relevance": "desc", "last_reviewed": "desc", "next_review": "asc", "level": "asc", "first_seen": "asc",
    "lapses": "desc",
}


@dataclass
class WordFilters:
    """The filters shared by the list and the export, so both return exactly the same rows."""
    deck_id: Optional[list[uuid.UUID]] = None
    all_decks: bool = False
    status: Literal["all", "learning", "mastered"] = "all"
    level: Optional[list[int]] = None
    q: Optional[str] = None
    sort: Optional[SortKey] = None
    order: Optional[Literal["asc", "desc"]] = None
    lang: Optional[str] = None


def word_filters(
    deck_id: Optional[list[uuid.UUID]] = Query(None),
    all_decks: bool = False,
    status: Literal["all", "learning", "mastered"] = "all",
    level: Optional[list[int]] = Query(None),
    q: Optional[str] = Query(None, max_length=64),
    sort: Optional[SortKey] = None,
    order: Optional[Literal["asc", "desc"]] = None,
    lang: Optional[str] = None,
) -> WordFilters:
    if level and (status != "learning" or any(not 1 <= value <= 4 for value in level)):
        raise HTTPException(status_code=422, detail="level takes 1-4 and only applies to status=learning")
    query = (q or "").strip() or None
    if sort == "relevance" and not query:
        raise HTTPException(status_code=422, detail="sort=relevance needs a search query")
    return WordFilters(deck_id, all_decks, status, level, query, sort, order, lang)


def _sort_value(row, sort: str):
    """A comparable value for one sort key; missing timestamps sort last whatever the order."""
    value = {
        "last_reviewed": row.last_reviewed_at,
        "next_review": row.next_review_at,
        "level": row.proficiency_level,
        "first_seen": row.created_at,
        "lapses": row.lapses_count,
    }[sort]
    return value


def select_word_ids(db: Session, user: models.User, filters: WordFilters) -> list[uuid.UUID]:
    """Card IDs of the user's learned words matching the filters, in display order."""
    if filters.all_decks:
        deck_ids = studied_deck_ids(db, user.id)
    else:
        deck_ids = list(filters.deck_id) if filters.deck_id else active_deck_ids(user)
    if not deck_ids:
        return []

    uca = models.UserCardAssociation
    query = (
        db.query(
            models.Card.id, models.Card.target_word, models.Card.reading, models.Card.hint,
            uca.proficiency_level, uca.last_reviewed_at, uca.next_review_at, uca.created_at, uca.lapses_count,
        )
        .join(uca, uca.card_id == models.Card.id)
        .filter(uca.user_id == user.id, uca.proficiency_level >= 1, models.Card.deck_id.in_(deck_ids))
    )
    if filters.status == "mastered":
        query = query.filter(uca.proficiency_level >= PROFICIENCY_MASTERED)
    elif filters.status == "learning":
        query = query.filter(uca.proficiency_level < PROFICIENCY_MASTERED)
        if filters.level:
            query = query.filter(uca.proficiency_level.in_(filters.level))
    rows = query.all()

    scores: dict[uuid.UUID, float] = {}
    if filters.q:
        meanings = localized_hints(db, rows, filters.lang)
        for row in rows:
            value = score(filters.q, Candidate(row.target_word, row.reading, meanings.get(row.id)))
            if value > 0:
                scores[row.id] = value
        rows = [row for row in rows if row.id in scores]

    sort = filters.sort or ("relevance" if filters.q else "last_reviewed")
    descending = (filters.order or DEFAULT_ORDER[sort]) == "desc"
    secondary = "last_reviewed"

    def key(row):
        primary = scores[row.id] if sort == "relevance" else _sort_value(row, sort)
        tie = _sort_value(row, secondary) if sort == "relevance" else None
        return primary, tie

    # Stable multi-pass sort: card id, then the secondary key (relevance only), then the primary key.
    rows.sort(key=lambda row: str(row.id))
    if sort == "relevance":
        rows = _sorted_nulls_last(rows, lambda row: key(row)[1], descending=True)
    rows = _sorted_nulls_last(rows, lambda row: key(row)[0], descending=descending)
    return [row.id for row in rows]


def _sorted_nulls_last(rows, value, descending: bool):
    present = [row for row in rows if value(row) is not None]
    missing = [row for row in rows if value(row) is None]
    return sorted(present, key=value, reverse=descending) + missing


def localized_hints(db: Session, rows, lang: Optional[str]) -> dict[uuid.UUID, Optional[str]]:
    """Served meaning per card for matching, with the same fallback as the cards themselves."""
    chain = language_chain(lang)
    best: dict[uuid.UUID, tuple[int, str]] = {}
    ids = [row.id for row in rows]
    for start in range(0, len(ids), 1000):
        for card_id, language, hint in db.query(
            models.CardTranslation.card_id, models.CardTranslation.language, models.CardTranslation.hint,
        ).filter(
            models.CardTranslation.card_id.in_(ids[start:start + 1000]),
            models.CardTranslation.language.in_(chain),
            models.CardTranslation.hint.isnot(None),
        ):
            rank = chain.index(language)
            if hint and (card_id not in best or rank < best[card_id][0]):
                best[card_id] = (rank, hint)
    return {row.id: best[row.id][1] if row.id in best else row.hint for row in rows}


def load_words(db: Session, user: models.User, card_ids: list[uuid.UUID], lang: Optional[str]) -> list[WordItem]:
    """Full items for the given cards, in the given order."""
    if not card_ids:
        return []
    uca = models.UserCardAssociation
    pairs = (
        db.query(models.Card, uca)
        .join(uca, uca.card_id == models.Card.id)
        .options(joinedload(models.Card.deck))
        .filter(uca.user_id == user.id, models.Card.id.in_(card_ids))
        .all()
    )
    by_id = {card.id: (card, assoc) for card, assoc in pairs}
    content = localize_many(db, [card for card, _ in pairs], lang)
    reviews = {
        card_id: (total, correct or 0)
        for card_id, total, correct in db.query(
            models.ReviewLog.card_id,
            func.count(models.ReviewLog.id),
            func.sum(case((models.ReviewLog.is_correct.is_(True), 1), else_=0)),
        )
        .filter(models.ReviewLog.user_id == user.id, models.ReviewLog.card_id.in_(card_ids))
        .group_by(models.ReviewLog.card_id)
    }

    items = []
    for card_id in card_ids:
        card, assoc = by_id[card_id]
        localized = content[card_id]
        total, correct = reviews.get(card_id, (0, 0))
        items.append(WordItem(
            card_id=card.id,
            deck=WordDeck(id=card.deck.id, name=card.deck.name),
            word=card.target_word,
            reading=card.reading,
            hint=localized.hint,
            sentence=card.sentence,
            sentence_furigana=card.sentence_furigana,
            sentence_translation=localized.sentence_translation,
            audio_url=storage_provider.get_url(card.audio_url) if card.audio_url else None,
            sentence_audio_url=storage_provider.get_url(card.sentence_audio_url) if card.sentence_audio_url else None,
            language=localized.language,
            proficiency_level=assoc.proficiency_level,
            status="mastered" if assoc.proficiency_level >= PROFICIENCY_MASTERED else "learning",
            first_seen_at=assoc.created_at,
            last_reviewed_at=assoc.last_reviewed_at,
            next_review_at=assoc.next_review_at,
            review_count=total,
            correct_count=correct,
            accuracy=round(100 * correct / total, 1) if total else None,
            lapses_count=assoc.lapses_count,
        ))
    return items


@router.get("", response_model=WordsListResponse)
def list_words(
    filters: WordFilters = Depends(word_filters),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """The user's learned words, filtered, searched and sorted, one page at a time."""
    ids = select_word_ids(db, current_user, filters)
    page = ids[offset:offset + limit]
    return WordsListResponse(
        total=len(ids), limit=limit, offset=offset, items=load_words(db, current_user, page, filters.lang),
    )


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


EXPORT_BATCH = 500
EXPORT_COLUMNS = [
    "word", "reading", "meaning", "meaning_language", "status", "level", "deck", "sentence",
    "sentence_translation", "first_seen_at", "last_reviewed_at", "next_review_at", "review_count",
    "correct_count", "accuracy", "lapses", "card_id",
]
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value) -> str:
    """CSV text for one value; text that a spreadsheet would run as a formula is prefixed with a quote."""
    if value is None:
        return ""
    text = str(value)
    return f"'{text}" if text.startswith(FORMULA_PREFIXES) else text


def export_row(item: WordItem) -> list[str]:
    timestamps = item.model_dump(mode="json", include={"first_seen_at", "last_reviewed_at", "next_review_at"})
    values = [
        item.word, item.reading, item.hint, item.language, item.status, item.proficiency_level, item.deck.name,
        item.sentence, item.sentence_translation, timestamps["first_seen_at"], timestamps["last_reviewed_at"],
        timestamps["next_review_at"], item.review_count, item.correct_count, item.accuracy, item.lapses_count,
        item.card_id,
    ]
    return [safe_cell(value) for value in values]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "deck"


def export_filename(db: Session, user: models.User, filters: WordFilters) -> str:
    if filters.all_decks:
        scope = "all-decks"
    else:
        deck_ids = list(filters.deck_id) if filters.deck_id else active_deck_ids(user)
        names = [name for (name,) in db.query(models.Deck.name).filter(models.Deck.id.in_(deck_ids))] if deck_ids else []
        scope = slug(names[0]) if len(names) == 1 else "selected-decks"
    parts = ["dabia-words", scope]
    if filters.status != "all":
        parts.append(filters.status)
    parts.append(datetime.now(timezone.utc).strftime("%Y%m%d"))
    return "-".join(parts) + ".csv"


@router.get("/export")
def export_words(
    filters: WordFilters = Depends(word_filters),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """The same rows as the list for the same filters, all pages, as a UTF-8 CSV with a BOM for Excel."""
    if current_user.id == DEMO_USER_ID:
        raise HTTPException(status_code=401, detail="Sign in to export")

    ids = select_word_ids(db, current_user, filters)
    buffer = io.StringIO()
    buffer.write("﻿")
    writer = csv.writer(buffer)  # RFC 4180 quoting, CRLF line endings
    writer.writerow(EXPORT_COLUMNS)
    for start in range(0, len(ids), EXPORT_BATCH):
        for item in load_words(db, current_user, ids[start:start + EXPORT_BATCH], filters.lang):
            writer.writerow(export_row(item))

    filename = export_filename(db, current_user, filters)
    return Response(
        content=buffer.getvalue().encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}"},
    )
