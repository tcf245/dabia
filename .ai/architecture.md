# Dabia Architecture & AI Working Context

## 1. Tech Stack
- Backend: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, Alembic, uv
- Frontend: React 19, Vite, TypeScript, Tailwind CSS

## 2. Core Learning Model
- `Card` remains the primary learning unit used by session scheduling and SRS.
- The `/api/v1/session/next-card` flow is still the source of truth for review sessions.
- The SRS state machine is mirrored in:
  - `backend/dabia/core/scheduler.py`
  - `frontend/src/utils/srs.ts`
- Any SRS behavior change must update both layers together.

## 3. Grammar Skeleton Initiative
- Goal: help learners understand how Japanese sentences are assembled, including sentence roles, particles, and verb/adjective inflection.
- Scope for the current phase:
  - operate on existing `Card.sentence` data
  - provide explanation and visualization only
  - do not affect question generation or SRS
- Data model direction:
  - one `Card` can have many grammar annotations
  - annotations should point to reusable grammar points
- Recommended entities:
  - `GrammarPoint`: canonical grammar concept
  - `CardGrammarAnnotation`: card-specific mapping, explanation, and evidence span

## 4. Grammar Skeleton Delivery Strategy
- Phase 1:
  - add grammar persistence and read APIs
  - generate annotations from existing card sentences
  - surface grammar explanations in the card UI as an optional panel
- Phase 2:
  - improve taxonomy coverage and annotation quality
  - add editorial or manual correction workflow
- Explicitly out of scope for Phase 1:
  - SRS integration
  - grammar-only exercise generation
  - a full external grammar knowledge crawler as the primary source of truth

## 5. Batch Annotation Pipeline Pattern
- The grammar analysis workflow should be treated as a batch loop:
  1. select a bounded card slice
  2. run morphological analysis
  3. apply deterministic grammar mapping rules
  4. persist candidate annotations with provenance
  5. evaluate precision on a reviewed sample
  6. refine rules and re-run incrementally
- The pipeline must be idempotent or support safe upsert semantics.
- Confidence and source metadata are required to support later review.

## 6. Verification Strategy
- Schema changes: migration tests and model-level assertions
- API changes: backend integration tests for card grammar retrieval
- UI changes: frontend component/page tests for grammar panel rendering
- Batch pipeline changes:
  - fixture-based parser/rule tests
  - golden sample evaluation against reviewed cards
  - dry-run support before bulk persistence

## 7. Local Data Source
- A local PostgreSQL database is available for real-card analysis and validation.
- Connection target: local `dabia` database provided by the user.
- Verified on 2026-03-15:
  - `cards` row count: `10157`
  - sample sentences are available and suitable for batch grammar analysis
- Local SQL client setup is now aligned with the user's environment:
  - `psql` installed via Homebrew `libpq`
  - binary path: `/opt/homebrew/opt/libpq/bin/psql`
- Use this database as the primary dataset for:
  - sampling real cards
  - dry-run annotation checks
  - post-migration validation
