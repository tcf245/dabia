import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GrammarPointSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    short_meaning: str
    category: str
    jlpt_level: Optional[str] = None
    formation: Optional[str] = None
    notes: Optional[str] = None


class CardGrammarAnnotation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    surface_text: str
    start_index: Optional[int] = None
    end_index: Optional[int] = None
    role_label: Optional[str] = None
    explanation_for_sentence: str
    display_order: int
    confidence: Optional[float] = None
    source: str
    grammar_point: GrammarPointSummary


class CardGrammarResponse(BaseModel):
    card_id: uuid.UUID
    annotations: list[CardGrammarAnnotation]
