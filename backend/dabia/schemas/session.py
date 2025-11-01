from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid

class PreviousAnswer(BaseModel):
    card_id: uuid.UUID = Field(..., alias='cardId')
    is_correct: bool = Field(..., alias='isCorrect')
    response_time_ms: int = Field(..., gt=0, alias='responseTimeMs')

    class Config:
        populate_by_name = True

class CardTarget(BaseModel):
    word: str
    hint: Optional[str] = None

class Card(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    card_id: uuid.UUID
    sentence_template: str
    target: CardTarget
    audio_url: Optional[str] = None
    proficiency_level: int

class SessionProgress(BaseModel):
    completed_today: int
    goal_today: int

class NextCardResponse(BaseModel):
    card: Optional[Card]
    session_progress: SessionProgress
