from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import sqlalchemy as sa
import uuid
from typing import Optional
from datetime import datetime, UTC, timedelta
from dabia.core.srs import get_new_srs_data

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
    if answer:
        # 1. Save the previous answer to the review log
        review_log_entry = models.ReviewLog(
            user_id=current_user_id,
            card_id=answer.card_id,
            is_correct=answer.is_correct,
            response_time_ms=answer.response_time_ms,
        )
        db.add(review_log_entry)

        # 2. Update SRS data for the card
        assoc = db.query(models.UserCardAssociation).filter_by(
            user_id=current_user_id, card_id=answer.card_id
        ).first()

        if not assoc:
            # This is the first time the user sees this card
            assoc = models.UserCardAssociation(
                user_id=current_user_id,
                card_id=answer.card_id,
                proficiency_level=1, # Start at "Needs Practice"
                interval=1, # Start with 1 minute
                next_review_at=datetime.now(UTC) + timedelta(minutes=1),
                ease_factor=2.5,
                lapses=0
            )
        
        assoc = get_new_srs_data(assoc, answer.is_correct)
        db.add(assoc)
        db.commit()

    # 3. Calculate today's progress
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

    # 4. Fetch the next card using SRS logic
    now = datetime.now(UTC)
    next_card_db = None

    # Priority 1: Due "Needs Practice" cards (Level 1)
    due_learning_card = (
        db.query(models.Card)
        .join(models.UserCardAssociation)
        .filter(
            models.UserCardAssociation.user_id == current_user_id,
            models.UserCardAssociation.proficiency_level == 1,
            models.UserCardAssociation.next_review_at <= now,
        )
        .order_by(models.UserCardAssociation.next_review_at.asc())
        .options(joinedload(models.Card.users), joinedload(models.Card.deck))
        .first()
    )
    if due_learning_card:
        next_card_db = due_learning_card
    else:
        # Priority 2: Other due cards (Levels 2, 3, 4)
        due_review_card = (
            db.query(models.Card)
            .join(models.UserCardAssociation)
            .filter(
                models.UserCardAssociation.user_id == current_user_id,
                models.UserCardAssociation.proficiency_level > 1,
                models.UserCardAssociation.next_review_at <= now,
            )
            .order_by(
                models.UserCardAssociation.proficiency_level.asc(),
                models.UserCardAssociation.next_review_at.asc(),
            )
            .options(joinedload(models.Card.users), joinedload(models.Card.deck))
            .first()
        )
        if due_review_card:
            next_card_db = due_review_card

    # Priority 3: New cards (Level 0)
    if not next_card_db:
        # Check daily new card limit
        NEW_CARDS_PER_DAY = 20
        new_cards_today_count = (
            db.query(models.UserCardAssociation)
            .filter(
                models.UserCardAssociation.user_id == current_user_id,
                sa.func.date(models.UserCardAssociation.created_at) == today_start,
            )
            .count()
        )

        if new_cards_today_count < NEW_CARDS_PER_DAY:
            # Find a card the user has never studied
            new_card = (
                db.query(models.Card)
                .outerjoin(
                    models.UserCardAssociation,
                    sa.and_(
                        models.UserCardAssociation.card_id == models.Card.id,
                        models.UserCardAssociation.user_id == current_user_id,
                    ),
                )
                .filter(models.UserCardAssociation.user_id.is_(None))
                .order_by(func.random())
                .options(joinedload(models.Card.users), joinedload(models.Card.deck))
                .first()
            )
            if new_card:
                next_card_db = new_card

    if not next_card_db:
        # No cards to review or learn
        return schemas.NextCardResponse(card=None, session_progress=progress)

    # 5. Format the response
    user_assoc = next(
        (assoc for assoc in next_card_db.users if assoc.user_id == current_user_id), None
    )
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

    return schemas.NextCardResponse(card=card_response, session_progress=progress)
