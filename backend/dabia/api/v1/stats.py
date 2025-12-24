from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
import uuid
from datetime import datetime, UTC
from typing import Optional

from dabia.database import get_db
from dabia.api.deps import get_current_user_id
from dabia import models, schemas

router = APIRouter()

@router.get("/daily-summary", response_model=schemas.DailyStats)
def get_daily_summary(
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Calculate today's start time (consistent with session.py)
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    now = datetime.now(UTC).replace(tzinfo=None)

    # 1. Total Answered & Time & Accuracy from ReviewLog
    logs_query = db.query(
        models.ReviewLog.is_correct,
        models.ReviewLog.response_time_ms
    ).filter(
        models.ReviewLog.user_id == current_user_id,
        models.ReviewLog.reviewed_at >= today_start
    )
    
    logs = logs_query.all()
    
    total_answered = len(logs)
    total_correct = sum(1 for log in logs if log.is_correct)
    total_time_ms = sum(log.response_time_ms for log in logs)
    
    accuracy = (total_correct / total_answered * 100) if total_answered > 0 else 0.0
    total_time_seconds = int(total_time_ms / 1000)

    # 2. To Learn Count (Due Cards)
    # Count user cards where next_review_at <= now
    to_learn_count = db.query(func.count(models.UserCardAssociation.card_id)).filter(
        models.UserCardAssociation.user_id == current_user_id,
        models.UserCardAssociation.next_review_at <= now
    ).scalar()

    # 3. New Words Count (Created Today)
    # Assuming UserCardAssociation creation means "New Word learned/started"
    new_words_count = db.query(func.count(models.UserCardAssociation.card_id)).filter(
        models.UserCardAssociation.user_id == current_user_id,
        models.UserCardAssociation.created_at >= today_start
    ).scalar()

    # 4. Learned (New words Studied Today) vs Reinforced (Old words Reviewed Today)
    # We use conditional aggregation to get both in a single query for better performance
    stats_query = db.query(
        func.count(func.distinct(
            case(
                [(models.UserCardAssociation.created_at >= today_start, models.ReviewLog.card_id)]
            )
        )).label("learned"),
        func.count(func.distinct(
            case(
                [(models.UserCardAssociation.created_at < today_start, models.ReviewLog.card_id)]
            )
        )).label("reinforced")
    ).select_from(models.ReviewLog).join(
        models.UserCardAssociation,
        (models.ReviewLog.card_id == models.UserCardAssociation.card_id) & 
        (models.ReviewLog.user_id == models.UserCardAssociation.user_id)
    ).filter(
        models.ReviewLog.user_id == current_user_id,
        models.ReviewLog.reviewed_at >= today_start
    ).first()

    learned_count = stats_query.learned or 0
    reinforced_count = stats_query.reinforced or 0

    return schemas.DailyStats(
        to_learn_count=to_learn_count,
        learned_count=learned_count,
        reinforced_count=reinforced_count,
        total_answered=total_answered,
        total_time_seconds=total_time_seconds,
        new_words_count=new_words_count,
        accuracy=accuracy
    )
