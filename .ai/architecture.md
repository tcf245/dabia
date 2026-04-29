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
- **User**: ID (UUID), Email, Google_ID, Review Logs (One-to-Many).
- **Card**: Static content (Question, Answer, Audio).
- **UserCardAssociation**: Tracks the proficiency level of a specific card for a specific user.
- **ReviewLog**: Immutable history of every review attempt (timestamp, duration, rating).

## 5. Environment Variables
- `backend/.env`: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `SECRET_KEY`
- `frontend/.env`: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`

## 6. API Design
See `.ai/api-design.md` for full endpoint specifications and request/response models.

## 7. Architecture Decisions
See `.ai/decisions/` for the rationale behind key design choices:
- `001-srs-dual-state-machine.md` — why SRS logic is mirrored in frontend
- `002-alembic-for-ddl.md` — why all DDL goes through Alembic

## 8. Deployment
- **Frontend**: Static build to Vercel/Netlify.
- **Backend**: Docker container.
- **Database**: Managed PostgreSQL.
