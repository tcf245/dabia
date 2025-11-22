# Add Performance Logging for Diagnosis

## Problem
Production environment experiencing slow API response times (~2.8s), but local testing shows excellent performance (40-60ms). Need to diagnose the bottleneck.

## Solution
Added detailed performance logging to measure time spent in each operation:

### Logging Added

**In `session.py`:**
- `update_card_state` execution time
- `ReviewLog` count query time
- `get_next_card` execution time
- Response formatting time
- Total request time

**In `scheduler.py`:**
- Overdue card query time
- New card query time
- Database connection latency (SELECT 1 ping)

### Example Output

```
[PERF] DB connection check in update_card_state took 0.001s
[PERF] update_card_state took 0.038s
[PERF] ReviewLog count took 0.002s
[PERF] Overdue query took 0.003s
[PERF] DB ping (SELECT 1) took 0.001s
[PERF] get_next_card took 0.003s
[PERF] Response formatting took 0.000s
[PERF] Total request time: 0.044s
```

## Purpose
This logging will help identify whether the production slowness is caused by:
1. Database connection latency
2. Query execution time
3. Network round-trip delays
4. Other bottlenecks

## Testing
- ✅ Local testing shows all operations complete in <60ms
- ✅ Logging output is visible in console (using `print()` instead of `logger`)
- ✅ No logic changes, only diagnostic logging added

## Next Steps
After deploying to production and collecting logs, we can:
1. Identify the specific bottleneck
2. Implement targeted optimizations (connection pooling, query optimization, etc.)
3. Remove or reduce logging once issue is resolved

## Note
This is a temporary diagnostic PR. Once the bottleneck is identified and fixed, the verbose logging can be removed or reduced to ERROR level only.
