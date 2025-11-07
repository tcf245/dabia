from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import uuid
from typing import Optional
from datetime import datetime, UTC

from dabia import models, schemas
from dabia.core.storage import storage_provider
from dabia.database import get_db

router = APIRouter()

# This is a temporary dependency to simulate getting a user ID from an auth token.
# In a real app, this would be a sophisticated function that decodes a JWT.
# Adding a comment to force a rebuild.
async def get_current_user_id() -> uuid.UUID:
    # For now, we return a hardcoded UUID.
    # This allows us to easily override it in tests.
    return uuid.UUID("00000000-0000-0000-0000-000000000000")

@router.post("/next-card", response_model=schemas.NextCardResponse)
def get_next_card(
    answer: Optional[schemas.PreviousAnswer] = None,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id)
):
    """
    Retrieves the next card for the user's learning session.
    If a previous answer is provided, it's first recorded in the review log.
    """
    if answer:
        # 1. Save the previous answer to the review log
        review_log_entry = models.ReviewLog(
            user_id=current_user_id,
            card_id=answer.card_id,
            is_correct=answer.is_correct,
            response_time_ms=answer.response_time_ms,
        )
        db.add(review_log_entry)
        db.commit()

    # 2. Calculate today's progress
    today_start = datetime.now(UTC).date()
    completed_today_count = (
        db.query(models.ReviewLog)
        .filter(
            models.ReviewLog.user_id == current_user_id,
            models.ReviewLog.reviewed_at >= today_start
        )
        .count()
    )
    progress = schemas.SessionProgress(completed_today=completed_today_count, goal_today=50)

    # 3. Fetch the next card
    # MVP Logic: Just grab a random card from the DB.
    # A real implementation would have sophisticated logic to pick the next card.
    next_card_db = (
        db.query(models.Card)
        .options(
            joinedload(models.Card.deck),
            joinedload(models.Card.users).subqueryload(models.UserCardAssociation.user)
        )
        .order_by(func.random())
        .first()
    )


    if not next_card_db:
        # No cards in the database yet
        return schemas.NextCardResponse(
            card=None,
            session_progress=progress
        )

    # 4. Format the response
    # Find the user-specific card association to get the proficiency level
    user_assoc = next((assoc for assoc in next_card_db.users if assoc.user_id == current_user_id), None)
    proficiency_level = user_assoc.proficiency_level if user_assoc else 0

    card_response = schemas.Card(
        card_id=next_card_db.id,
        deck=schemas.DeckInfo.model_validate(next_card_db.deck),
        sentence_template=next_card_db.sentence_template,
        target=schemas.CardTarget(word=next_card_db.target_word, hint=next_card_db.hint),
        audio_url=storage_provider.get_url(next_card_db.audio_url),
        sentence=next_card_db.sentence,
        sentence_furigana=next_card_db.sentence_furigana,
        sentence_translation=next_card_db.sentence_translation,
        sentence_audio_url=storage_provider.get_url(next_card_db.sentence_audio_url),
        proficiency_level=proficiency_level
    )

    return schemas.NextCardResponse(card=card_response, session_progress=progress)
