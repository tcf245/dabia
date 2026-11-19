import uuid

from pydantic import BaseModel, Field

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
