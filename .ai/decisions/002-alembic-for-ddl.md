# ADR 002: Alembic for All DDL Changes

## Status
Accepted

## Context
The project runs across multiple environments (local dev, staging, production) and may need to be migrated or replicated. Ad-hoc SQL scripts are error-prone and hard to reproduce consistently across environments.

## Decision
Use Alembic to manage all database schema (DDL) changes. No direct DDL SQL is ever run manually against the database.

## Consequences
- All schema changes are versioned, reviewable, and reversible
- Any environment can be brought to the exact same schema state by running `uv run alembic upgrade head`
- **Existing migration files must never be modified** — only new migration files are added on top of the current state
- Seed data updates also go through Alembic to maintain the same reproducibility guarantee
