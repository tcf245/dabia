from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from typing import Any

from dabia.database import get_db
from dabia.api.deps import get_current_user_id
from dabia import models, schemas
from dabia.core.storage import storage_provider

router = APIRouter()

@router.get("/{card_id}", response_model=schemas.Card)
def get_card(
    card_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id)
) -> Any:
    """
    Get a specific card by ID.
    """
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Get user proficiency if available
    user_assoc = (
        db.query(models.UserCardAssociation)
        .filter(
            models.UserCardAssociation.user_id == current_user_id,
            models.UserCardAssociation.card_id == card_id
        )
        .first()
    )
    
    proficiency_level = user_assoc.proficiency_level if user_assoc else 0

    return schemas.Card(
        card_id=card.id,
        deck=schemas.DeckInfo.model_validate(card.deck),
        sentence_template=card.sentence_template,
        target=schemas.CardTarget(word=card.target_word, hint=card.hint),
        reading=card.reading,
        audio_url=storage_provider.get_url(card.audio_url),
        sentence=card.sentence,
        sentence_furigana=card.sentence_furigana,
        sentence_translation=card.sentence_translation,
        sentence_audio_url=storage_provider.get_url(card.sentence_audio_url),
        proficiency_level=proficiency_level,
    )
