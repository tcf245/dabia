# ADR 001: SRS State Machine Mirrored in Frontend

## Status
Accepted

## Context
The backend (`scheduler.py`) is the source of truth for all SRS proficiency state transitions. However, the backend and database are hosted in a different region from users, causing noticeable API latency (~300–500ms+) on every card interaction.

## Decision
Mirror the SRS proficiency level transition logic in the frontend (`frontend/src/utils/srs.ts`) so that UI state transitions (proficiency level updates) can be computed locally without waiting for the API round-trip. Note: interval calculation remains backend-only; the frontend mirrors only the proficiency state machine.

## Consequences
- **UI feels instant**: proficiency feedback is shown immediately without waiting for the server
- **Maintenance cost**: any change to SRS logic must be applied to both files simultaneously — this is enforced as a project rule in `.ai/rules.md` and `AGENTS.md`
- The backend remains the authoritative source; frontend state is for display only and is reconciled on the next API response
