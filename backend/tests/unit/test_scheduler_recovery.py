import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone
from dabia.core.scheduler import Scheduler
from dabia.models.user_card_association import UserCardAssociation
from dabia.models.review_log import ReviewLog

def test_srs_recovery_mechanism():
    # Mock DB session
    db = MagicMock()
    scheduler = Scheduler(db)
    
    # Scenario: A card with 0 stability but 2 repetitions (buggy state)
    # We want to verify that the next review corrects the stability
    
    user_id = "user123"
    card_id = "card123"
    
    # Mock existing association
    assoc = UserCardAssociation(
        user_id=user_id,
        card_id=card_id,
        proficiency_level=1,
        interval=0.007,
        stability=0.0, # The bug!
        repetitions=2,
        lapses_count=0,
        next_review_at=datetime.now(timezone.utc),
        last_reviewed_at=datetime.now(timezone.utc)
    )
    
    db.query.return_value.filter.return_value.first.return_value = assoc
    
    # Act: User reviews correctly (quality 4)
    # Repetitions becomes 3
    # Expected Recovery:
    # S_INIT = 0.6
    # Floor = 0.6 * (1.15 ^ (3 - 1)) = 0.6 * (1.15 ^ 2) = 0.6 * 1.3225 = 0.7935
    
    updated_assoc = scheduler.update_card_state(user_id, card_id, quality=4, response_time_ms=1000)
    
    # Assert
    assert updated_assoc.repetitions == 3
    assert updated_assoc.stability >= 0.793, f"Stability {updated_assoc.stability} should be recovered to at least ~0.793"
    assert updated_assoc.stability > 0.1, "Stability should definitely not be near 0"
    
def test_srs_zero_prevention():
    db = MagicMock()
    scheduler = Scheduler(db)
    
    user_id = "user123"
    card_id = "card123"
    
    # Mock existing association with None stability (legacy data)
    assoc = UserCardAssociation(
        user_id=user_id,
        card_id=card_id,
        proficiency_level=1,
        interval=0.007,
        stability=None, # Legacy None
        repetitions=0,
        lapses_count=0
    )
    
    db.query.return_value.filter.return_value.first.return_value = assoc
    
    # Act: User reviews correctly
    updated_assoc = scheduler.update_card_state(user_id, card_id, quality=4, response_time_ms=1000)
    
    # Assert
    assert updated_assoc.stability == 0.6 # S_INIT
    assert updated_assoc.stability >= 0.05 # S_MIN enforced
