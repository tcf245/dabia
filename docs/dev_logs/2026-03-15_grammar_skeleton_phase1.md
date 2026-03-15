# Grammar Skeleton Phase 1

**Date**: 2026-03-15
**Author**: Codex
**Status**: Implemented

## 1. Scope
Phase 1 introduces display-only grammar support for existing cards.

Implemented capabilities:
- grammar persistence model
- card grammar retrieval API
- optional flashcard grammar panel
- deterministic batch analysis script

Out of scope:
- SRS integration
- grammar-based exercise generation
- broad grammar taxonomy coverage

## 2. Backend Changes
- Added `GrammarPoint` and `CardGrammarAnnotation` ORM models.
- Added Alembic migration `3f6219f4a2c1_add_grammar_skeleton_tables.py`.
- Added `GET /api/v1/cards/{card_id}/grammar`.

## 3. Frontend Changes
- Added grammar response types and `getCardGrammar`.
- Added a lazy-loaded grammar panel in `Flashcard`.
- Ensured the panel fetches once per card and reuses loaded data while toggling.

## 4. Batch Pipeline
- Added `dabia/grammar/analysis.py` with a deterministic initial rule set.
- Added `scripts/analyze_grammar.py` with dry-run and persistence modes.
- Current initial coverage focuses on:
  - `は`
  - `が`
  - `を`
  - polite non-past `ます`
  - plain negative `ない`

## 5. Verification
Backend:
```bash
uv run pytest backend/tests/api/v1/test_cards_it.py backend/tests/api/v1/test_card_grammar_it.py backend/tests/unit/test_grammar_analysis.py
```

Frontend:
```bash
npm test -- --run src/services/api.test.ts src/components/Flashcard.test.tsx
```

Real data dry-run:
```bash
DATABASE_URL="postgresql://dabia:dabia_local_password@localhost/dabia" uv run alembic upgrade head
uv run python scripts/analyze_grammar.py --db-url "postgresql://dabia:dabia_local_password@localhost/dabia" --limit 3
```

## 6. Current Limits
- Annotation quality is intentionally conservative.
- Predicate coverage is still shallow and rule-based.
- No editorial review workflow exists yet for correcting generated annotations.

## 7. Recommended Next Steps
- Expand the grammar taxonomy and rule set.
- Add reviewed golden datasets for precision tracking.
- Decide whether auto-generated annotations should be persisted into local development data by default.
