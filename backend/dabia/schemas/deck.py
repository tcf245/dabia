from pydantic import BaseModel, ConfigDict
import uuid
from typing import Optional, List

class Deck(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    
    # Extended fields
    count: Optional[int] = 0
    difficulty: Optional[str] = None
    tags: List[str] = []

class DeckSettings(BaseModel):
    active_deck_ids: List[uuid.UUID]
