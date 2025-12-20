import pytest
from unittest.mock import MagicMock
from datetime import datetime, timedelta, timezone
from dabia.core.scheduler import Scheduler
from dabia.models.user_card_association import UserCardAssociation
import math

def test_srs_v3_basic_transitions():
    # Setup
    mock_db = MagicMock()
    scheduler = Scheduler(mock_db)
    user_id = "user-123"
    card_id = "card-123"
    
    # helper for clean state
    def mock_assoc(level):
        a = MagicMock(spec=UserCardAssociation)
        a.proficiency_level = level
        a.repetitions = 0
        a.lapses_count = 0
        mock_db.query.return_value.filter.return_value.first.return_value = a
        return a

    # 1. L1 (New) -> Correct -> L5 (Mastered)
    mock_db.query.return_value.filter.return_value.first.return_value = None # First time
    assoc = scheduler.update_card_state(user_id, card_id, quality=4, response_time_ms=1000)
    
    assert assoc.proficiency_level == 5
    assert assoc.repetitions == 1
    # Interval ~ 30 days
    assert 29.9 < assoc.interval < 30.1

    # 2. L1 (New) -> Incorrect -> L2 (Hard)
    mock_db.query.return_value.filter.return_value.first.return_value = None 
    assoc = scheduler.update_card_state(user_id, "card-2", quality=1, response_time_ms=1000)
    
    assert assoc.proficiency_level == 2
    assert assoc.interval < 0.002 # 90 seconds approx 0.001 days

    # 3. L2 -> Correct -> L3
    mock_assoc(2)
    assoc = scheduler.update_card_state(user_id, card_id, quality=3, response_time_ms=1000)
    assert assoc.proficiency_level == 3
    assert 0.003 < assoc.interval < 0.004 # 300s approx 0.0035 days

    # 4. L3 -> Correct -> L4
    mock_assoc(3)
    assoc = scheduler.update_card_state(user_id, card_id, quality=3, response_time_ms=1000)
    assert assoc.proficiency_level == 4
    assert 6.9 < assoc.interval < 7.1 # 7 days

    # 5. L4 -> Incorrect -> L3 (Regression)
    mock_assoc(4)
    assoc = scheduler.update_card_state(user_id, card_id, quality=1, response_time_ms=1000)
    assert assoc.proficiency_level == 3
    assert 0.003 < assoc.interval < 0.004 # Back to short queue

    # 6. L5 -> Correct -> L5 (Maintain)
    mock_assoc(5)
    assoc = scheduler.update_card_state(user_id, card_id, quality=5, response_time_ms=1000)
    assert assoc.proficiency_level == 5
    assert 29.9 < assoc.interval < 30.1

