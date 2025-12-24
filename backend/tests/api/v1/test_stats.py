import pytest
from datetime import datetime, UTC, timedelta
from unittest.mock import MagicMock
import uuid

from dabia.api.v1.stats import get_daily_summary
from dabia import models, schemas

def test_get_daily_summary_calculation():
    # Setup
    mock_db = MagicMock()
    user_id = uuid.uuid4()
    
    # Mocking today's start
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    yesterday = today_start - timedelta(days=1)
    
    # We want:
    # 1 New card learned (created today, reviewed today)
    # 1 Old card reinforced (created yesterday, reviewed today)
    # 1 Due card (not necessarily reviewed)
    
    # Mock ReviewLogs
    # log1: correct, new card
    # log2: incorrect, old card
    log1 = MagicMock(spec=models.ReviewLog)
    log1.is_correct = True
    log1.response_time_ms = 5000
    log1.card_id = uuid.uuid4()
    
    log2 = MagicMock(spec=models.ReviewLog)
    log2.is_correct = False
    log2.response_time_ms = 10000
    log2.card_id = uuid.uuid4()
    
    # Mock .all() for ReviewLog query
    mock_db.query().filter().all.return_value = [log1, log2]
    
    # Mock .scalar() for various counts
    # 2. to_learn_count (due cards) -> 5
    # 3. new_words_count (created today) -> 1
    # 4. learned_count (reviewed today & created today) -> 1
    # 5. reinforced_count (reviewed today & created before today) -> 1
    
    # We need to handle multiple scalar calls. 
    # The queries are in this order in get_daily_summary:
    # 1. logs_query (all)
    # 2. to_learn_count (scalar)
    # 3. new_words_count (scalar)
    # 4. learned_count (scalar)
    # 5. reinforced_count (scalar)
    
    mock_db.query().filter().scalar.side_effect = [5, 1, 1, 1]
    
    # Execute
    result = get_daily_summary(db=mock_db, current_user_id=user_id)
    
    # Verify
    assert isinstance(result, schemas.DailyStats)
    assert result.total_answered == 2
    assert result.accuracy == 50.0
    assert result.total_time_seconds == 15
    assert result.to_learn_count == 5
    assert result.new_words_count == 1
    assert result.learned_count == 1
    assert result.reinforced_count == 1
