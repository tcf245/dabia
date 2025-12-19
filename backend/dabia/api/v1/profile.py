from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from dabia.database import get_db
from dabia.api.deps import get_current_user_id
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
    text: str
    romaji: Optional[str] = None
    type: str # 'review' | 'learned'
    # x, y, size passed from FE or calculated here? 
    # The FE design implies successful rendering relies on having these, 
    # but initially we can let FE handle layout if we just return the list.
    # However, to be helpful, let's just return the data and let FE randomize positions.

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
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Fetch words:
    # 1. Recent reviews (Review)
    # 2. Mastered words (Learned)
    
    # Fetch recent active cards (e.g. reviewed recently or due soon)
    active_cards = (
        db.query(Card, UserCardAssociation)
        .join(UserCardAssociation, Card.id == UserCardAssociation.card_id)
        .filter(UserCardAssociation.user_id == current_user_id)
        # Filter for active stuff, e.g. proficiency < 4 or due soon
        .filter(UserCardAssociation.proficiency_level < 4)
        .limit(10)
        .all()
    )
    
    # Fetch mastered cards
    mastered_cards = (
        db.query(Card, UserCardAssociation)
        .join(UserCardAssociation, Card.id == UserCardAssociation.card_id)
        .filter(UserCardAssociation.user_id == current_user_id)
        .filter(UserCardAssociation.proficiency_level >= 4)
        .limit(10)
        .all()
    )
    
    garden_words = []
    
    for card, assoc in active_cards:
        garden_words.append(GardenWord(
            text=card.target_word,
            romaji=card.reading,
            type='review'
        ))
        
    for card, assoc in mastered_cards:
        garden_words.append(GardenWord(
            text=card.target_word,
            romaji=card.reading,
            type='learned'
        ))
        
    return garden_words
