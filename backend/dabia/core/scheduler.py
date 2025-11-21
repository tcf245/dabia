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
        import logging
        logger = logging.getLogger(__name__)

        now = datetime.now(timezone.utc).replace(tzinfo=None) # Ensure naive datetime for comparison if DB is naive

        # 1. Check for overdue reviews
        # We want to prioritize cards that are most overdue, but also mix in some variety.
        # For V1, we'll just pick the one with the earliest next_review_at.
        overdue_query = (
            self.db.query(UserCardAssociation)
            .filter(
                UserCardAssociation.user_id == user_id,
                UserCardAssociation.next_review_at <= now
            )
        )
        overdue_count = overdue_query.count()
        
        overdue_card_assoc = (
            overdue_query
            .order_by(UserCardAssociation.next_review_at.asc())
            .first()
        )

        if overdue_card_assoc:
            logger.info(
                f"SRS Decision [User: {user_id}]: Selected OVERDUE card. "
                f"Total Overdue: {overdue_count}. "
                f"Selected Card: {overdue_card_assoc.card_id}. "
                f"Due Date: {overdue_card_assoc.next_review_at}. "
                f"Interval: {overdue_card_assoc.interval}. "
                f"Repetitions: {overdue_card_assoc.repetitions}. "
                f"Ease Factor: {overdue_card_assoc.ease_factor}."
            )
            return overdue_card_assoc.card, {
                "type": "review",
                "due_date": overdue_card_assoc.next_review_at,
                "interval": overdue_card_assoc.interval,
                "repetitions": overdue_card_assoc.repetitions
            }

        # 2. If no overdue reviews, pick a new card
        # Find a card that the user hasn't seen yet (no UserCardAssociation)
        # or has proficiency_level 0 and repetitions 0 (if we pre-seeded associations)
        
        logger.info(f"SRS Decision [User: {user_id}]: No overdue cards found. Looking for NEW card.")

        # Strategy: Find cards not in UserCardAssociation for this user
        # Optimized: Use LEFT JOIN + OFFSET/LIMIT instead of ORDER BY random()
        # 1. Count total available new cards
        new_cards_query = (
            self.db.query(Card)
            .outerjoin(UserCardAssociation, and_(
                Card.id == UserCardAssociation.card_id,
                UserCardAssociation.user_id == user_id
            ))
            .filter(UserCardAssociation.card_id == None)
        )
        
        total_new_cards = new_cards_query.count()
        
        if total_new_cards == 0:
            new_card = None
        else:
            # 2. Pick a random offset
            random_offset = random.randint(0, total_new_cards - 1)
            
            # 3. Fetch single card at offset
            new_card = new_cards_query.offset(random_offset).first()

        if new_card:
            logger.info(f"SRS Decision [User: {user_id}]: Selected NEW card {new_card.id}.")
            return new_card, {"type": "new"}

        logger.info(f"SRS Decision [User: {user_id}]: No cards available (Done).")
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

        # SRS Logic (v2 - Stability Based)
        import math
        
        # Constants
        S_INIT = 0.6
        P_TARGET = 0.9
        S_MIN = 0.05
        S_MAX = 3650.0
        
        # Defensive coding: Ensure stability is not None (legacy data)
        if assoc.stability is None:
            assoc.stability = 0.0

        if quality >= 3:
            # Success
            assoc.repetitions += 1
            
            if assoc.repetitions == 1:
                # First success: Initialize stability
                assoc.stability = S_INIT
            else:
                # Subsequent success: S_new = S * (1 + alpha * (q - 2))
                # alpha is a tuning parameter, typically around 0.2
                alpha = 0.2
                growth_factor = 1 + alpha * (quality - 2)
                assoc.stability = min(S_MAX, assoc.stability * growth_factor)
            
            # Calculate interval: I = -S * ln(P_target)
            # We use P_target = 0.9 (90% retention)
            assoc.interval = max(0.007, -assoc.stability * math.log(P_TARGET))
            
        else:
            # Failure (Lapse)
            assoc.repetitions = 0
            assoc.lapses_count += 1
            
            # Decay stability: S_new = S * beta
            beta = 0.5
            assoc.stability = max(S_MIN, assoc.stability * beta)
            
            # Short interval for re-learning (Short Queue simulation)
            # Set to 10 minutes (0.007 days)
            assoc.interval = 0.007
            
        # Update Next Review
        assoc.next_review_at = now + timedelta(days=assoc.interval)
        assoc.last_reviewed_at = now

        # Update Proficiency Level (Derived from Stability)
        assoc.proficiency_level = self._calculate_proficiency(assoc.stability)

        self.db.commit()
        self.db.refresh(assoc)
        return assoc

    def _calculate_proficiency(self, stability: float) -> int:
        """
        Maps stability (days) to 0-5 scale.
        """
        if stability < 0.5:
            return 0 # New / Needs Practice
        if stability < 2:
            return 1 # Needs Practice
        if stability < 7:
            return 2 # Learning
        if stability < 14:
            return 3 # Almost there
        if stability < 30:
            return 4 # Memorized
        return 5 # Mastered
