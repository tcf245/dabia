# Dabia Architecture & Global Context

## 1. Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy (Async), PostgreSQL, Alembic, uv.
- **Frontend**: React 19, Vite, Tailwind CSS v4, TypeScript.

## 2. Database Policies
- **Alembic**: Alembic is used to manage all database schema (DDL) changes and seed data updates.
- **NO MODIFICATION of existing migrations**: Existing migration files should NEVER be modified; new changes must be added as new migration files, considering the current database state.
- **Seed Data Privacy**: When writing seed data, privacy must be strictly protected. Placeholder or anonymous data like `00000000-0000-0000-0000-000000000000` is acceptable, but no real, sensitive, or personally identifiable information should ever be included in the codebase.

## 3. Domain Model (SRS Engine)
The core of Dabia is the Spaced Repetition System.
- **Proficiency Levels**: 1 (New) -> 2 (Hard) -> 3 (Learning) -> 4 (Easy) -> 5 (Mastered).
- **Scheduling**: 
    - Short-term: Seconds/Minutes (for levels 1-3).
    - Long-term: Days/Weeks (for levels 4-5).
- **Session Logic**: The `/api/v1/session/next-card` endpoint drives the entire flow. It accepts the previous card's result and returns the next card.
- **State Machine Synchronization**: 
    > [!IMPORTANT]
    > The proficiency state machine logic is **mirrored** in both layers:
    > 1. **Backend** (`backend/dabia/core/scheduler.py`): The source of truth for persistent data.
    > 2. **Frontend** (`frontend/src/utils/srs.ts`): Used for instant UI feedback and session history display.
    > **Any change to the SRS logic MUST be applied to both files simultaneously.**

## 4. Key Database Models
- **User**: ID (UUID), Email, Google_ID, name and avatar, `active_deck_ids` (the decks the scheduler draws from), Review Logs (One-to-Many).
- **Deck**: Name, description, difficulty and tags (inferred from the name when empty).
- **Card**: Static content (target word, reading, sentence, furigana, relative audio paths).
- **CardTranslation**: Learner-language hint and sentence translation per card and language (`zh` is the original). See ADR 003.
- **UserCardAssociation**: Tracks the proficiency level of a specific card for a specific user.
- **ReviewLog**: Immutable history of every review attempt (timestamp, duration, rating).

## 5. Environment Variables
Names only. Deployments read Vercel project settings. Locally, backend values live in macOS Keychain: `backend/.env.keychain` (committed, no values) maps each name to a Keychain item, and commands run as `cd backend && keychain-secret run .env.keychain -- <command>` (`keychain-secret` is in `tcf245/agent-skills/tools`). No plaintext `backend/.env`.
- `backend/.env.keychain` (read by `backend/dabia/core/config.py` through the environment):
    - `DATABASE_URL` (required)
    - `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (dev defaults exist; must be set in deployments)
    - `STORAGE_PROVIDER` (`r2` default, or `gcp`), `R2_PUBLIC_URL`, `R2_MEDIA_PATH`, `GCP_BUCKET_NAME`, `GCP_MEDIA_PATH`
- `frontend/.env`: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID` (public values only, so a plain file is fine)

## 6. API Design
See `.ai/api-design.md` for every endpoint with its request/response models.

## 7. Architecture Decisions
See `.ai/decisions/` for the rationale behind key design choices:
- `001-srs-dual-state-machine.md` — why SRS logic is mirrored in frontend
- `002-alembic-for-ddl.md` — why all DDL goes through Alembic
- `003-card-content-i18n.md` — how cards are served in more than one learner language, and how to add one

## 8. Deployment
- **Frontend**: Vercel project `dabia-frontend`, static Vite build (`frontend/vercel.json`).
- **Backend**: Vercel project `dabia-backend`, Python serverless function (`backend/vercel.json` routes everything to `backend/api/index.py`). Its install step runs `uv sync && uv run alembic upgrade head`, so migrations apply on deploy; the app also attempts `alembic upgrade head` on startup.
- **Media**: Card and sentence audio live in Cloudflare R2 behind `R2_PUBLIC_URL`; the database stores relative paths and `core/storage.py` builds the URLs. Generated audio is uploaded to R2, not committed.
- **Database**: Managed PostgreSQL (`DATABASE_URL`). Local development uses `backend/docker-compose.yml`.
- **Previews**: every PR gets Vercel preview deployments for both projects.
- Operational details (DB imports, R2 uploads, secrets) are in Eric's private Dabia runbook, outside the repo.

## 9. Backlog
Parked features and follow-ups are tracked in `.ai/backlog.md`.
