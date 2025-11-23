from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import sqlalchemy as sa
import uuid
from typing import Optional
from datetime import datetime, UTC, timedelta
from dabia.core.scheduler import Scheduler

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
    Retrieves the next card for the user's learning session based on an SRS algorithm.
    If a previous answer is provided, it's first recorded and the card's SRS state is updated.
    """
    import time
    
    request_start = time.time()
    
    try:
        scheduler = Scheduler(db)

        if answer:
            update_start = time.time()
            # Determine quality
            quality = answer.quality
            if quality is None:
                # Fallback mapping for V1 backward compatibility
                quality = 4 if answer.is_correct else 2
            
            scheduler.update_card_state(
                user_id=current_user_id,
                card_id=answer.card_id,
                quality=quality,
                response_time_ms=answer.response_time_ms
            )
            update_time = time.time() - update_start
            print(f"[PERF] update_card_state took {update_time:.3f}s")

        # Calculate today's progress (moved to client-side to reduce latency)
        completed_today_count = 0
        progress = schemas.SessionProgress(completed_today=completed_today_count, goal_today=50)

        # Fetch next card
        fetch_start = time.time()
        next_card_db, user_assoc, meta = scheduler.get_next_card(current_user_id)
        fetch_time = time.time() - fetch_start
        print(f"[PERF] get_next_card took {fetch_time:.3f}s")

        if not next_card_db:
            total_time = time.time() - request_start
            print(f"[PERF] Total request time: {total_time:.3f}s (no card)")
            return schemas.NextCardResponse(card=None, session_progress=progress)

        # Use the UserCardAssociation returned from scheduler (no lazy loading!)
        format_start = time.time()
        proficiency_level = user_assoc.proficiency_level if user_assoc else 0

        card_response = schemas.Card(
            card_id=next_card_db.id,
            deck=schemas.DeckInfo.model_validate(next_card_db.deck),
            sentence_template=next_card_db.sentence_template,
            target=schemas.CardTarget(word=next_card_db.target_word, hint=next_card_db.hint),
            reading=next_card_db.reading,
            audio_url=storage_provider.get_url(next_card_db.audio_url),
            sentence=next_card_db.sentence,
            sentence_furigana=next_card_db.sentence_furigana,
            sentence_translation=next_card_db.sentence_translation,
            sentence_audio_url=storage_provider.get_url(next_card_db.sentence_audio_url),
            proficiency_level=proficiency_level,
        )
        format_time = time.time() - format_start
        print(f"[PERF] Response formatting took {format_time:.3f}s")

        total_time = time.time() - request_start
        print(f"[PERF] Total request time: {total_time:.3f}s")

        return schemas.NextCardResponse(card=card_response, session_progress=progress)
    except Exception as e:
        import logging
        logging.error(f"Error in get_next_card: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
