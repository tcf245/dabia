from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, List, Optional
from datetime import datetime, timedelta
import uuid

from dabia.database import get_db
from dabia.api.deps import get_current_user_id
from dabia.core.i18n import localize_many
from dabia.core.srs_constants import PROFICIENCY_MASTERED, PROFICIENCY_NEW
from dabia.models.review_log import ReviewLog
from dabia.models.user_card_association import UserCardAssociation
from dabia.models.card import Card
from pydantic import BaseModel

router = APIRouter()

class HeatmapDay(BaseModel):
    date: str
    count: int
    level: int # 0-4 intensity

class GardenWord(BaseModel):
    card_id: uuid.UUID
    text: str
    reading: Optional[str] = None
    romaji: Optional[str] = None  # deprecated alias of reading; kept for one release
    hint: Optional[str] = None
    level: int
    type: str # 'review' | 'learned'

@router.get("/heatmap", response_model=List[HeatmapDay])
def get_heatmap(
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Get data for the last 4 months (approx 120 days) to be safe for 104 days display
    # We want to return a sparse list of days that have activity, 
    # or a full list? The FE iterates 104 items. 
    # Let's return the actual data and let FE map it to its grid days.
    # OR, we can return the data for the specific dates the FE expects.
    # But FE just renders 104 boxes.
    # Let's query activity for the last 365 days to be safe.
    
    start_date = datetime.now() - timedelta(days=365)
    
    # SQLite/Postgres compatibility for date truncation might differ.
    # Assuming Postgres as per models using UUID/dialects.
    # But let's write agnostic SQLAlchemy if possible or use func.date()
    
    logs = (
        db.query(
            func.date(ReviewLog.reviewed_at).label('review_date'),
            func.count(ReviewLog.id).label('review_count')
        )
        .filter(
            ReviewLog.user_id == current_user_id,
            ReviewLog.reviewed_at >= start_date
        )
        .group_by(func.date(ReviewLog.reviewed_at))
        .all()
    )
    
    results = []
    for log in logs:
        count = log.review_count
        # Determine level based on count
        if count == 0: level = 0
        elif count <= 5: level = 1
        elif count <= 10: level = 2
        elif count <= 20: level = 3
        else: level = 4
        
        results.append(HeatmapDay(
            date=str(log.review_date),
            count=count,
            level=level
        ))
        
    return results

@router.get("/garden", response_model=List[GardenWord])
def get_garden(
    lang: Annotated[Optional[str], Query(description="Learner language (BCP 47, e.g. en, pt-BR) for hint; falls back to the base language, then zh")] = None,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    learning_rows = (
        db.query(Card, UserCardAssociation)
        .join(UserCardAssociation, Card.id == UserCardAssociation.card_id)
        .filter(
            UserCardAssociation.user_id == current_user_id,
            UserCardAssociation.proficiency_level >= PROFICIENCY_NEW,
            UserCardAssociation.proficiency_level < PROFICIENCY_MASTERED,
        )
        .order_by(UserCardAssociation.next_review_at.asc(), Card.id.asc())
        .limit(8)
        .all()
    )

    mastered_rows = (
        db.query(Card, UserCardAssociation)
        .join(UserCardAssociation, Card.id == UserCardAssociation.card_id)
        .filter(
            UserCardAssociation.user_id == current_user_id,
            UserCardAssociation.proficiency_level >= PROFICIENCY_MASTERED,
        )
        .order_by(UserCardAssociation.last_reviewed_at.desc().nullslast(), Card.id.asc())
        .limit(6)
        .all()
    )

    all_cards = [card for card, _ in learning_rows] + [card for card, _ in mastered_rows]
    localized = localize_many(db, all_cards, lang)

    def to_garden_word(card: Card, assoc: UserCardAssociation, word_type: str) -> GardenWord:
        return GardenWord(
            card_id=card.id,
            text=card.target_word,
            reading=card.reading,
            romaji=card.reading,
            hint=localized[card.id].hint,
            level=assoc.proficiency_level,
            type=word_type,
        )

    return [
        *(to_garden_word(card, assoc, "review") for card, assoc in learning_rows),
        *(to_garden_word(card, assoc, "learned") for card, assoc in mastered_rows),
    ]
