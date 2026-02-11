from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, text
import random
import uuid
from typing import Optional, Tuple

from dabia.models.user_card_association import UserCardAssociation
from dabia.models.card import Card
from dabia.models.review_log import ReviewLog

class Scheduler:
    def __init__(self, db: Session):
        self.db = db

    def get_next_card(self, user_id: str) -> Tuple[Optional[Card], Optional[UserCardAssociation], dict]:
        """
        Selects the next card for the user based on the SRS algorithm.
        Prioritizes:
        1. Overdue reviews (weighted by overdue duration)
        2. Learning/Lapsed cards (short term)
        3. New cards
        
        Returns:
            Tuple of (Card, UserCardAssociation, metadata)
            - Card: The selected card
            - UserCardAssociation: The user's association with the card (None for new cards)
            - metadata: Dict with selection metadata
        """
        import logging
        logger = logging.getLogger(__name__)

        now = datetime.now(timezone.utc).replace(tzinfo=None) # Ensure naive datetime for comparison if DB is naive
        from dabia.core.srs_constants import PROFICIENCY_MASTERED

        # Get user settings for deck filtering
        from dabia.models.user import User
        user = self.db.query(User).filter(User.id == user_id).first()
        active_deck_ids = user.active_deck_ids if user else []
        # Ensure UUIDs are strings for SQL comparison if needed, or rely on SQLAlchemy
        # active_deck_ids is JSON list of strings/UUIDs.
        
        # 1. Check for overdue reviews
        # We want to prioritize cards that are most overdue, but also mix in some variety.
        # For V1, we'll just pick the one with the earliest next_review_at.
        from sqlalchemy.orm import joinedload
        import time
        
        overdue_start = time.time()
        
        overdue_query = (
            self.db.query(UserCardAssociation)
            .join(UserCardAssociation.card) # Join for deck filtering
            .options(joinedload(UserCardAssociation.card).joinedload(Card.deck))
            .filter(
                UserCardAssociation.user_id == user_id,
                UserCardAssociation.next_review_at <= now,
                UserCardAssociation.proficiency_level < PROFICIENCY_MASTERED
            )
        )
        
        if active_deck_ids:
            # Safely convert to UUID objects for SQL comparison
            deck_ids = []
            for uid in active_deck_ids:
                try:
                    if isinstance(uid, str):
                        deck_ids.append(uuid.UUID(uid))
                    else:
                        deck_ids.append(uid)
                except ValueError:
                    continue
            
            overdue_query = overdue_query.filter(Card.deck_id.in_(deck_ids))

        overdue_card_assoc = overdue_query.order_by(UserCardAssociation.next_review_at.asc()).first()

        overdue_time = time.time() - overdue_start
        if overdue_card_assoc:
            logger.info(
                f"SRS Decision [User: {user_id}]: Selected OVERDUE card. "
                f"Selected Card: {overdue_card_assoc.card_id}. "
                f"Due Date: {overdue_card_assoc.next_review_at}. "
                f"Interval: {overdue_card_assoc.interval}. "
                f"Repetitions: {overdue_card_assoc.repetitions}. "
                f"Ease Factor: {overdue_card_assoc.ease_factor}."
            )
            return overdue_card_assoc.card, overdue_card_assoc, {
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
        # Optimized: Use ORDER BY random() instead of OFFSET
        # PostgreSQL optimizes "ORDER BY random() LIMIT 1" much better than OFFSET
        new_card_start = time.time()
        
        new_card_query = (
            self.db.query(Card)
            .options(joinedload(Card.deck))
            .outerjoin(UserCardAssociation, and_(
                Card.id == UserCardAssociation.card_id,
                UserCardAssociation.user_id == user_id
            ))
            .filter(UserCardAssociation.card_id == None)
        )
        
        if active_deck_ids:
            deck_ids = []
            for uid in active_deck_ids:
                try:
                    if isinstance(uid, str):
                        deck_ids.append(uuid.UUID(uid))
                    else:
                        deck_ids.append(uid)
                except ValueError:
                    continue
            new_card_query = new_card_query.filter(Card.deck_id.in_(deck_ids))
            
        new_card = new_card_query.order_by(func.random()).limit(1).first()

        new_card_time = time.time() - new_card_start
        if new_card:
            logger.info(f"SRS Decision [User: {user_id}]: Selected NEW card {new_card.id}.")
            return new_card, None, {"type": "new"}

        logger.info(f"SRS Decision [User: {user_id}]: No cards available (Done).")
        return None, None, {"type": "done"}

    def update_card_state(self, user_id: str, card_id: str, quality: int, response_time_ms: int):
        """
        Updates the card state based on the review quality (0-5). 
        Implements SRS v3 Proficiency State Machine.
        """
        import logging
        from dabia.core.srs_constants import (
            INTERVAL_L2_SECONDS, INTERVAL_L3_SECONDS,
            INTERVAL_L4_DAYS, INTERVAL_L5_DAYS,
            PROFICIENCY_NEW, PROFICIENCY_HARD,
            PROFICIENCY_LEARNING, PROFICIENCY_EASY,
            PROFICIENCY_MASTERED
        )
        
        logger = logging.getLogger(__name__)
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        assoc = (
            self.db.query(UserCardAssociation)
            .filter(
                UserCardAssociation.user_id == user_id,
                UserCardAssociation.card_id == card_id
            )
            .first()
        )

        previous_level = 0

        if not assoc:
            # First time seeing this card, create association
            # Initial state is effectively Proficiency 1 (New) before processing the result
            previous_level = PROFICIENCY_NEW # Logic implies input was against "New" state
            assoc = UserCardAssociation(
                user_id=user_id,
                card_id=card_id,
                proficiency_level=PROFICIENCY_NEW,
                interval=0,
                ease_factor=2.5,
                repetitions=0,
                lapses_count=0,
                next_review_at=now,
                last_reviewed_at=now
            )
            self.db.add(assoc)
        else:
            previous_level = assoc.proficiency_level
            # Defensive fix for legacy data (0 -> 1)
            if previous_level == 0:
                previous_level = PROFICIENCY_NEW

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

        # Update Statistics Counters
        if is_correct:
            assoc.repetitions += 1
        else:
            assoc.repetitions = 0
            assoc.lapses_count += 1

        # --- SRS v3 State Machine (Table-Driven) ---
        
        # Transition Logic: (Current Level, Is Correct) -> (Next Level, Interval Delta)
        TRANSITIONS = {
            # L1: New
            (PROFICIENCY_NEW, True): (PROFICIENCY_MASTERED, timedelta(days=INTERVAL_L5_DAYS)),
            (PROFICIENCY_NEW, False): (PROFICIENCY_HARD, timedelta(seconds=INTERVAL_L2_SECONDS)),
            
            # L2: Hard
            (PROFICIENCY_HARD, True): (PROFICIENCY_LEARNING, timedelta(seconds=INTERVAL_L3_SECONDS)),
            (PROFICIENCY_HARD, False): (PROFICIENCY_HARD, timedelta(seconds=INTERVAL_L2_SECONDS)),
            
            # L3: Learning
            (PROFICIENCY_LEARNING, True): (PROFICIENCY_EASY, timedelta(days=INTERVAL_L4_DAYS)),
            (PROFICIENCY_LEARNING, False): (PROFICIENCY_LEARNING, timedelta(seconds=INTERVAL_L3_SECONDS)),
            
            # L4: Easy
            (PROFICIENCY_EASY, True): (PROFICIENCY_MASTERED, timedelta(days=INTERVAL_L5_DAYS)),
            (PROFICIENCY_EASY, False): (PROFICIENCY_LEARNING, timedelta(seconds=INTERVAL_L3_SECONDS)),
            
            # L5: Mastered
            (PROFICIENCY_MASTERED, True): (PROFICIENCY_MASTERED, timedelta(days=INTERVAL_L5_DAYS)),
            (PROFICIENCY_MASTERED, False): (PROFICIENCY_LEARNING, timedelta(seconds=INTERVAL_L3_SECONDS)),
        }
        
        transition = TRANSITIONS.get((previous_level, is_correct))
        
        if transition:
            new_level, interval_delta = transition
        else:
            # Fallback for unknown levels or states
            logger.warning(f"Unknown proficiency state: Level {previous_level}, Correct {is_correct}. Resetting to L1 logic.")
            new_level = PROFICIENCY_NEW
            interval_delta = timedelta(minutes=1)

        # Apply Updates
        assoc.proficiency_level = new_level
        assoc.next_review_at = now + interval_delta
        assoc.last_reviewed_at = now
        
        # Calculate interval in days for legacy/stats compatibility
        assoc.interval = interval_delta.total_seconds() / 86400.0

        # Log transition decision
        logger.info(
            f"SRS Transition [User: {user_id} Card: {card_id}]: "
            f"L{previous_level} -> L{new_level} "
            f"(Correct: {is_correct}, Quality: {quality}). "
            f"Next Review: {assoc.next_review_at} (+{interval_delta})"
        )

        self.db.commit()
        self.db.refresh(assoc)
        return assoc
