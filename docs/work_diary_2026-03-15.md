# Work Diary: Grammar Skeleton

## 09:00 - Feature framing
- Re-read the repository and the AI context files.
- Confirmed that the project had no dedicated grammar data model yet.
- Locked the Phase 1 scope to display-only grammar support attached to existing cards.

## 09:30 - Project memory setup
- Created `.ai/` as the canonical AI context directory for this feature.
- Recorded architecture decisions, workflow rules, and active task state.
- Added a planning dev log to preserve the feature walkthrough.

## 10:10 - Local data validation
- Verified the local Dabia PostgreSQL dataset was reachable.
- Confirmed the dataset contains `10157` cards and usable real sentence samples.
- Installed `psql` through Homebrew `libpq` to align the local database tooling with the user environment.

## 11:00 - Backend contract first
- Added a failing integration test for `GET /api/v1/cards/{card_id}/grammar`.
- Implemented grammar tables, ORM models, Pydantic schemas, and the cards grammar endpoint.
- Added the Alembic migration and verified the new backend tests passed.

## 12:20 - Frontend integration
- Extended the frontend API service with grammar types and a grammar fetch function.
- Added a lazy-loaded grammar panel to `Flashcard`.
- Wrote tests to ensure grammar data loads on demand and does not re-fetch unnecessarily.

## 13:10 - Batch loop skeleton
- Built a deterministic grammar analysis module focused on a small initial rule set.
- Added a batch script with dry-run and persistence modes.
- Added unit tests for the analysis rules.

## 13:50 - Real-data verification
- Applied the new Alembic migration to the local Dabia database.
- Ran the grammar analysis script against real cards in dry-run mode.
- Confirmed the batch loop works on real sentences such as:
  - `テーマを絞り込む`
  - `品数がない`

## 14:10 - Friction points
- The branch contained an older `.ai-context` layout, so a normalized `.ai/` directory was introduced instead of mutating legacy files.
- The first frontend grammar-loading implementation used an effect-driven state machine that proved harder to observe in tests; it was simplified to explicit click-triggered loading.
- The first predicate rule only captured suffixes like `ます`; it was adjusted to capture the full predicate span such as `飲みます`.
- The local dry-run initially failed because the real database had not yet been migrated to the new schema.

## 14:30 - Current status
- Phase 1 is implemented and feature-specific tests are green.
- The local database has the grammar tables applied.
- The next likely bottleneck is annotation quality, not infrastructure.
