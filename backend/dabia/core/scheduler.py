from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
import random
from typing import Optional, Tuple

from dabia.models.user_card_association import UserCardAssociation
from dabia.models.card import Card
from dabia.models.review_log import ReviewLog

class Scheduler:
    def __init__(self, db: Session):
        self.db = db

    def get_next_card(self, user_id: str) -> Tuple[Optional[Card], dict]:
        """
        Selects the next card for the user based on the SRS algorithm.
        Prioritizes:
        1. Overdue reviews (weighted by overdue duration)
        2. Learning/Lapsed cards (short term)
        3. New cards
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None) # Ensure naive datetime for comparison if DB is naive

        # 1. Check for overdue reviews
        # We want to prioritize cards that are most overdue, but also mix in some variety.
        # For V1, we'll just pick the one with the earliest next_review_at.
        overdue_card_assoc = (
            self.db.query(UserCardAssociation)
            .filter(
                UserCardAssociation.user_id == user_id,
                UserCardAssociation.next_review_at <= now
            )
            .order_by(UserCardAssociation.next_review_at.asc())
            .first()
        )

        if overdue_card_assoc:
            return overdue_card_assoc.card, {
                "type": "review",
                "due_date": overdue_card_assoc.next_review_at,
                "interval": overdue_card_assoc.interval,
                "repetitions": overdue_card_assoc.repetitions
            }

        # 2. If no overdue reviews, pick a new card
        # Find a card that the user hasn't seen yet (no UserCardAssociation)
        # or has proficiency_level 0 and repetitions 0 (if we pre-seeded associations)
        
        # Strategy: Find cards not in UserCardAssociation for this user
        subquery = (
            self.db.query(UserCardAssociation.card_id)
            .filter(UserCardAssociation.user_id == user_id)
        )
        
        new_card = (
            self.db.query(Card)
            .filter(Card.id.notin_(subquery))
            .order_by(func.random())
            .first()
        )

        if new_card:
            return new_card, {"type": "new"}

        return None, {"type": "done"}

    def update_card_state(self, user_id: str, card_id: str, quality: int, response_time_ms: int):
        """
        Updates the card state based on the review quality (0-5).
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        assoc = (
            self.db.query(UserCardAssociation)
            .filter(
                UserCardAssociation.user_id == user_id,
                UserCardAssociation.card_id == card_id
            )
            .first()
        )

        if not assoc:
            # First time seeing this card, create association
            assoc = UserCardAssociation(
                user_id=user_id,
                card_id=card_id,
                proficiency_level=0,
                interval=0,
                ease_factor=2.5,
                repetitions=0,
                lapses_count=0,
                next_review_at=now, # Will be updated below
                last_reviewed_at=now
            )
            self.db.add(assoc)
        
        # Update Review Log
        is_correct = quality >= 3
        log = ReviewLog(
            user_id=user_id,
            card_id=card_id,
            is_correct=is_correct,
            response_time_ms=response_time_ms,
            reviewed_at=now
        )
        self.db.add(log)

        # SRS Logic
        if quality >= 3:
            # Success
            assoc.repetitions += 1
            if assoc.repetitions == 1:
                assoc.interval = 1.0
            elif assoc.repetitions == 2:
                assoc.interval = 6.0
            else:
                assoc.interval = round(assoc.interval * assoc.ease_factor, 2)
            
            # Update Ease Factor
            # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            q = quality
            new_ef = assoc.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            assoc.ease_factor = max(1.3, new_ef)

        else:
            # Failure (Lapse)
            assoc.repetitions = 0
            assoc.lapses_count += 1
            
            # Short interval for re-learning
            # Quality 2: 1 hour (0.0417 days), Quality < 2: 10 mins (0.007 days)
            assoc.interval = 0.0417 if quality == 2 else 0.007
            
            # Decrease EF for severe failure
            delta = 0.2 if quality <= 1 else 0.15
            assoc.ease_factor = max(1.3, assoc.ease_factor - delta)

        # Update Next Review
        assoc.next_review_at = now + timedelta(days=assoc.interval)
        assoc.last_reviewed_at = now

        # Update Proficiency Level (Derived)
        assoc.proficiency_level = self._calculate_proficiency(assoc.interval, assoc.repetitions)

        self.db.commit()
        self.db.refresh(assoc)
        return assoc

    def _calculate_proficiency(self, interval: float, repetitions: int) -> int:
        """
        Maps interval/repetitions to 0-5 scale.
        """
        if repetitions == 0:
            return 0 # New / Needs Practice
        if interval < 2:
            return 1 # Needs Practice
        if interval < 7:
            return 2 # Learning
        if interval < 14:
            return 3 # Almost there
        if interval < 30:
            return 4 # Memorized
        return 5 # Mastered
