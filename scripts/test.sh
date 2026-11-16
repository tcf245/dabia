#!/usr/bin/env bash
# Run all tests and report only failures. Exit 0 if all pass, 1 if any fail.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

# ── Frontend (vitest) ─────────────────────────────────────────────────────────
echo "▶ Frontend tests..."
# Vitest's exit code is the source of truth; NO_COLOR keeps the summary greppable.
FE_STATUS=0
FE_OUT=$(cd "$ROOT/frontend" && NO_COLOR=1 npm test -- --run --reporter=verbose 2>&1) || FE_STATUS=$?
if [ "$FE_STATUS" -ne 0 ]; then
  echo "❌ Frontend failures (vitest exit $FE_STATUS):"
  echo "$FE_OUT" | grep -E "FAIL|✗|×|Tests " | grep -v "ExperimentalWarning" || true
  FAILED=1
else
  FE_SUMMARY=$(echo "$FE_OUT" | grep -E "Test Files|Tests " | tail -2 | tr '\n' ' ' | sed 's/  */ /g')
  echo "✅ Frontend: $FE_SUMMARY"
fi

# ── Backend (pytest) ──────────────────────────────────────────────────────────
echo "▶ Backend tests..."
BE_STATUS=0
BE_OUT=$(cd "$ROOT" && python -m pytest --tb=line -q 2>&1) || BE_STATUS=$?
BE_SUMMARY=$(echo "$BE_OUT" | tail -3)
if [ "$BE_STATUS" -ne 0 ]; then
  echo "❌ Backend failures (pytest exit $BE_STATUS):"
  echo "$BE_OUT" | grep -E "^FAILED|ERROR " || echo "$BE_SUMMARY"
  FAILED=1
else
  echo "✅ Backend: $BE_SUMMARY"
fi

exit $FAILED
