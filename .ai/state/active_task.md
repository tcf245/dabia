# Active Task & Memory Snapshot

## Current Context
- Updated: 2026-03-15
- Branch: `feat/grammar-skeleton`
- Phase: Phase 1 implementation / verified

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
- Grammar data should be modeled separately rather than adding many ad hoc fields onto `cards`.
- Use a conservative rollout:
  - persistence and retrieval first
  - batch annotation pipeline second
  - UI integration third
- Favor deterministic analysis plus rule mapping over a fully model-driven annotation system.

## Planned Workstreams
1. Define schema for `GrammarPoint` and `CardGrammarAnnotation`. Completed.
2. Add backend model, migration, and retrieval API. Completed.
3. Design a batch annotation script for existing card sentences. Initial version completed.
4. Add frontend grammar panel on the flashcard view. Completed.
5. Establish sample-based validation for annotation quality. Initial dry-run loop completed.

## Current Risks
- Existing AI context on older branches is stale and inconsistent with the current feature.
- Grammar explanation quality is still rule-limited and currently focuses on a small N5-oriented subset.
- Batch processing needs confidence and provenance fields to support later review.
- Real-data iteration must remain safe and read-oriented until the annotation persistence layer is implemented.

## Next Checkpoint
- Expand grammar taxonomy coverage and decide whether to persist auto-generated annotations into the local dataset.

## Available Validation Resource
- Local PostgreSQL dataset confirmed available on 2026-03-15.
- Current `cards` volume observed: `10157`.
- Initial live examples observed:
  - `テーマを絞り込む`
  - `品数がない`
  - `初版を完売する`

## Completed This Session
- Added grammar schema, migration, and ORM models.
- Added `GET /api/v1/cards/{card_id}/grammar`.
- Added flashcard grammar panel with lazy loading.
- Added a deterministic grammar analysis module and dry-run batch script.
- Verified the batch script against the local PostgreSQL dataset after applying the new migration.
