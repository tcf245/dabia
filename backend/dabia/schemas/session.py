from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid

class PreviousAnswer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    card_id: uuid.UUID = Field(..., alias='cardId')
    is_correct: bool = Field(..., alias='isCorrect')
    response_time_ms: int = Field(..., gt=0, alias='responseTimeMs')

class CardTarget(BaseModel):
    word: str
    hint: Optional[str] = None

class DeckInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str

class Card(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    card_id: uuid.UUID
    deck: DeckInfo
    sentence_template: str
    target: CardTarget
    reading: Optional[str] = None
    audio_url: Optional[str] = None
    sentence: Optional[str] = None
    sentence_furigana: Optional[str] = None
    sentence_translation: Optional[str] = None
    sentence_audio_url: Optional[str] = None
    proficiency_level: int

class SessionProgress(BaseModel):
    completed_today: int
    goal_today: int

class NextCardResponse(BaseModel):
    card: Optional[Card]
    session_progress: SessionProgress
