import pytest
from unittest.mock import MagicMock
from datetime import datetime, timedelta, timezone
from dabia.core.scheduler import Scheduler
from dabia.models.user_card_association import UserCardAssociation
import math

def test_srs_v2_logic():
    # Setup
    mock_db = MagicMock()
    scheduler = Scheduler(mock_db)
    user_id = "user-123"
    card_id = "card-123"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    # 1. New Card -> First Success
    # Mock existing association as None (first time)
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    assoc = scheduler.update_card_state(user_id, card_id, quality=4, response_time_ms=1000)
    
    # Verify initialization
    assert assoc.repetitions == 1
    assert assoc.stability == 0.6 # S_INIT
    # I = -S * ln(0.9) = -0.6 * -0.10536 = 0.0632
    expected_interval = -0.6 * math.log(0.9)
    assert abs(assoc.interval - expected_interval) < 0.001
    assert assoc.proficiency_level == 1 # S < 2
    
    # 2. Subsequent Success
    # Mock existing association
    assoc.repetitions = 1
    assoc.stability = 0.6
    mock_db.query.return_value.filter.return_value.first.return_value = assoc
    
    # Quality 4 -> Growth
    # S_new = 0.6 * (1 + 0.2 * (4 - 2)) = 0.6 * 1.4 = 0.84
    assoc = scheduler.update_card_state(user_id, card_id, quality=4, response_time_ms=1000)
    
    assert assoc.repetitions == 2
    assert abs(assoc.stability - 0.84) < 0.001
    expected_interval_2 = -0.84 * math.log(0.9)
    assert abs(assoc.interval - expected_interval_2) < 0.001
    
    # 3. Failure (Lapse)
    # Quality 1 -> Decay
    # S_new = 0.84 * 0.5 = 0.42
    assoc = scheduler.update_card_state(user_id, card_id, quality=1, response_time_ms=1000)
    
    assert assoc.repetitions == 0
    assert assoc.lapses_count == 1
    assert abs(assoc.stability - 0.42) < 0.001
    assert assoc.interval == 0.007 # Short Queue (10 mins)
    assert assoc.proficiency_level == 0 # S < 0.5
