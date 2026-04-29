# Dabia Architecture & Global Context

## 1. Tech Stack
- Backend: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, Alembic, uv
- Frontend: React 19, Vite, Tailwind CSS v4, TypeScript

## 2. Database Policies
- Alembic is the source of truth for schema changes and seed updates.
- Never modify existing migrations; add new migrations instead.
- Do not commit real or sensitive seed data.

## 3. Core Learning Model
- `Card` remains the primary learning unit used by session scheduling and SRS.
- `/api/v1/session/next-card` is the source of truth for review sessions.
- The SRS state machine is mirrored in:
  - `backend/dabia/core/scheduler.py`
  - `frontend/src/utils/srs.ts`
- Any SRS behavior change must update both layers together.

## 4. Key Database Models
- `User`: account, auth, and review ownership
- `Card`: sentence-based learning unit
- `UserCardAssociation`: per-user SRS state for each card
- `ReviewLog`: immutable review history

## 5. Grammar Skeleton Initiative
- Goal: help learners understand how Japanese sentences are assembled, including particles, sentence roles, and inflection.
- Current phase scope:
  - operate on existing `Card.sentence` data
  - provide explanation and visualization only
  - do not affect question generation or SRS scoring
- Data model direction:
  - one `Card` can have many grammar annotations
  - annotations point to reusable grammar points
- Current entities:
  - `GrammarPoint`: canonical grammar concept
  - `CardGrammarAnnotation`: card-specific mapping, explanation, and evidence span

## 6. Grammar Delivery Strategy
- Phase 1:
  - grammar persistence and read APIs
  - batch generation for existing card sentences
  - optional flashcard grammar panel
- Out of scope for Phase 1:
  - grammar-only exercise generation
  - SRS integration
  - full external grammar crawling as production source of truth

## 7. Batch Annotation Pipeline Pattern
- Treat grammar analysis as a batch loop:
  1. select a bounded card slice
  2. run analysis
  3. apply deterministic mapping rules
  4. persist candidate annotations with provenance
  5. evaluate quality on a reviewed sample
  6. refine rules and rerun incrementally
- The pipeline should be idempotent or safe to upsert.
- Keep `source` and `confidence` fields for later review.

## 8. Verification Strategy
- Schema changes: migration verification and model assertions
- API changes: backend integration tests
- UI changes: frontend component/page tests
- Batch pipeline changes:
  - fixture-based rule tests
  - sampled quality checks
  - dry-run support before larger writes

## 9. Local Data Source
- A local PostgreSQL database is available for real-card analysis and validation.
- Verified local dataset size on 2026-03-15: `10157` cards.
- Standard local SQL client path: `/opt/homebrew/opt/libpq/bin/psql`
- Use this dataset for:
  - sampling real cards
  - dry-run annotation checks
  - post-migration validation

## 10. Environment Variables
- `backend/.env`: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `SECRET_KEY`
- `frontend/.env`: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`
- Grammar debug flags:
  - `GRAMMAR_DEBUG_ENABLED`
  - `GRAMMAR_DEBUG_SOURCE`

## 11. Deployment
- Frontend: static build to Vercel/Netlify
- Backend: Docker container
- Database: managed PostgreSQL
