# Active Task & Memory Snapshot

## Current Context
- Updated: 2026-03-15
- Branch: `feat/grammar-skeleton`
- Phase: Phase 1 implementation / grammar debug review

## Active Feature
- Name: `grammar-skeleton`
- Goal: attach sentence-level Japanese grammar explanations to existing cards as an optional display layer.
- Scope:
  - use existing `cards` sentences
  - model one-to-many card-to-grammar annotations
  - expose grammar data through read APIs
  - render grammar in the card UI without changing SRS or question flow

## Agreed Technical Direction
- `Card` remains the review unit.
- Grammar data is modeled separately instead of adding many nullable fields onto `cards`.
- Conservative rollout:
  1. persistence and retrieval
  2. batch annotation pipeline
  3. UI integration
  4. debug review flow
- Favor deterministic analysis plus rule mapping over a fully model-driven annotation system.

## Current Risks
- Grammar explanation quality is still rule-limited and currently focused on a small N5-oriented subset.
- Batch output quality will become the main bottleneck before infrastructure does.
- Existing historical AI context from older branches may still be stale.

## Available Validation Resources
- Local PostgreSQL dataset confirmed available.
- Observed `cards` volume: `10157`
- Local grammar debug mode is supported through:
  - `GRAMMAR_DEBUG_ENABLED`
  - `GRAMMAR_DEBUG_SOURCE`

## Completed This Session
- Added grammar schema, migration, ORM models, API, and flashcard UI.
- Added deterministic grammar analysis and a batch script.
- Added grammar debug mode so session selection can prioritize annotated cards.
- Persisted an initial local sample from the first 50 cards:
  - `37` annotated cards
  - `45` total annotations
- Enabled local backend debug mode in `backend/.env`.

## Next Checkpoint
- Resolve PR merge conflicts cleanly against `master`.
- Expand grammar taxonomy coverage and improve annotation quality on reviewed samples.
