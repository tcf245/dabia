## Title
feat(logging): optimize logs with trace_id and user_id context

## Description
This PR implements structured logging improvements to facilitate better debugging and performance monitoring, especially in production environments.

### Key Changes
-   **Structured Logging**: Added a global `trace_id` for every request to track logs across the entire request lifecycle.
-   **User Context**: Logs now include the `user_id` once the user is authenticated (or "anonymous" otherwise).
-   **Middleware**: Introduced `LoggingMiddleware` to:
    -   Generate `trace_id`.
    -   Log request details (`[START] Method, Path, Client`).
    -   Log response details (`[END] Status, Cost`).
-   **Cleanup**: Removed legacy `print("[PERF] ...")` statements in favor of the standardized middleware logging.
-   **Fix**: Standardized `Login.tsx` to use `VITE_API_BASE_URL` (instead of `VITE_API_URL`) to match the project configuration.
-   **Auto-Migration**: Added `lifespan` handler to `main.py` to automatically execute `alembic upgrade head` on application startup. This prevents "undefined column" errors in production by ensuring the DB schema is always up-to-date.

### Log Format
```
[YYYY-MM-DD HH:MM:SS] [LEVEL] [tid:UUID] [uid:UUID/anonymous] Message
```

### Verification
-   Verified locally that requests generate a `trace_id`.
-   Verified `user_id` is populated after `get_current_user_id` dependency runs.
-   Verified performance metrics (cost) are logged at the end of each request.
