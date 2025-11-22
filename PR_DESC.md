# Optimize next-card API performance

## Problem
The `next-card` API endpoint had slow response times (~3.5s), causing poor user experience.

## Root Cause
- Unnecessary `COUNT()` queries causing full table scans
- N+1 query problem due to lazy loading of relationships

## Solution
1. **Removed COUNT() queries**: Eliminated `overdue_count` and `total_new_cards` queries
2. **Added eager loading**: Used `joinedload()` to preload `Card.deck` relationships
3. **Optimized random selection**: Replaced exact count-based offset with try-first approach using `MAX_OFFSET`

## Changes
- Modified `backend/dabia/core/scheduler.py`
- Reduced database queries from 4-6 to 1 per request (75-83% reduction)

## Performance Impact
- **Expected response time**: <500ms (down from 3.5s)
- **Query reduction**: 75-83% fewer database queries

## Testing
- ✅ All 14 tests passed
- ✅ Unit tests: `test_scheduler_v2.py`
- ✅ Integration tests: `test_session_it.py`, `test_session_srs_it.py`
- ✅ API tests: `test_session_ut.py`

## Technical Details
```python
# Before: Multiple queries
overdue_count = overdue_query.count()  # Query 1
overdue_card = overdue_query.first()   # Query 2
# + lazy loading triggers 2 more queries

# After: Single query with eager loading
overdue_card = (
    query
    .options(joinedload(UserCardAssociation.card).joinedload(Card.deck))
    .first()
)
```
