import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_serializer

LEARNING_LEVELS = ("1", "2", "3", "4")


def empty_levels() -> dict[str, int]:
    return {level: 0 for level in LEARNING_LEVELS}


class ProgressCounts(BaseModel):
    total: int = 0
    mastered: int = 0
    learning: int = 0
    not_started: int = 0
    learning_by_level: dict[str, int] = Field(default_factory=empty_levels)


class DeckProgress(ProgressCounts):
    deck_id: uuid.UUID
    name: str
    is_active: bool


class WordsProgressResponse(BaseModel):
    decks: list[DeckProgress]
    aggregate: ProgressCounts


class WordDeck(BaseModel):
    id: uuid.UUID
    name: str


class WordItem(BaseModel):
    card_id: uuid.UUID
    deck: WordDeck
    word: str
    reading: Optional[str] = None
    hint: Optional[str] = None
    sentence: Optional[str] = None
    sentence_furigana: Optional[str] = None
    sentence_translation: Optional[str] = None
    audio_url: Optional[str] = None
    sentence_audio_url: Optional[str] = None
    language: str
    proficiency_level: int
    status: Literal["learning", "mastered"]
    first_seen_at: Optional[datetime] = None
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    review_count: int = 0
    correct_count: int = 0
    accuracy: Optional[float] = None
    lapses_count: int = 0

    @field_serializer("first_seen_at", "last_reviewed_at", "next_review_at")
    def utc(self, value: Optional[datetime]) -> Optional[str]:
        """Timestamps are stored as naive UTC; say so on the wire."""
        if value is None:
            return None
        return value.replace(tzinfo=None).isoformat(timespec="seconds") + "Z"


class WordsListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[WordItem]
