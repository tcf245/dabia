#!/usr/bin/env bash
# Run all tests and report only failures. Exit 0 if all pass, 1 if any fail.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

# ── Frontend (vitest) ─────────────────────────────────────────────────────────
echo "▶ Frontend tests..."
FE_OUT=$(cd "$ROOT/frontend" && npm test -- --run --reporter=verbose 2>&1)
# Only check the vitest summary lines for actual failures (ignore console.error in tests)
FE_FAIL=$(echo "$FE_OUT" | grep -E "^ Test Files .* failed|^ +Tests .* failed" || true)
if [ -n "$FE_FAIL" ]; then
  echo "❌ Frontend failures:"
  echo "$FE_OUT" | grep -E "FAIL|✗" | grep -v "ExperimentalWarning" || true
  FAILED=1
else
  FE_SUMMARY=$(echo "$FE_OUT" | grep -E "Test Files|Tests " | tail -2 | tr '\n' ' ' | sed 's/  */ /g')
  echo "✅ Frontend: $FE_SUMMARY"
fi

# ── Backend (pytest) ──────────────────────────────────────────────────────────
echo "▶ Backend tests..."
BE_OUT=$(cd "$ROOT" && python -m pytest --tb=line -q 2>&1)
BE_FAIL=$(echo "$BE_OUT" | grep -E "^FAILED|ERROR " || true)
BE_SUMMARY=$(echo "$BE_OUT" | tail -3)
if [ -n "$BE_FAIL" ]; then
  echo "❌ Backend failures:"
  echo "$BE_FAIL"
  FAILED=1
else
  echo "✅ Backend: $BE_SUMMARY"
fi

exit $FAILED
