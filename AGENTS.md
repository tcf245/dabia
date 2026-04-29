# Dabia — AI Agent Entry Point

**Dabia** is a minimalist Japanese vocabulary trainer built on a 5-stage Spaced Repetition System (SRS).

Read these files before starting any task:

| File | Purpose |
|---|---|
| `.ai/rules.md` | Behavior rules, TDD workflow, git conventions |
| `.ai/architecture.md` | Tech stack, domain model, critical constraints |
| `.ai/ui-design.md` | Color palette, typography, design language |
| `.ai/api-design.md` | API endpoint specifications |
| `.ai/decisions/` | Architecture Decision Records (why, not just what) |

## Quick Commands

```bash
# Backend
cd backend && uv run uvicorn dabia.main:app --reload

# Frontend
cd frontend && npm run dev

# Tests
bash scripts/test.sh
```

## Task Kickoff Checklist (MANDATORY for every new task)

Before writing any code:

```bash
# 1. Stash any uncommitted work
git stash push -m "wip: <description>"   # skip if working tree is clean

# 2. Branch from latest master
git checkout master
git pull origin master
git checkout -b feat/<short-desc>        # or fix/ refactor/
```

Before opening a PR:

```bash
# 3. Run full test suite (frontend + backend)
bash scripts/test.sh                     # must exit 0

# 4. Commit
git commit -m "feat(scope): one concise sentence"

# 5. Open PR
gh pr create --title "..." --body "..."
```

Rules: coverage must stay ≥ 80%. Do not commit with failing tests.

---

## Non-Negotiable Rules (read .ai/rules.md for full detail)

- All code, comments, commits, and docs must be in **English**
- Communicate with the user in **Chinese**
- Always branch from `master`: `feat/`, `fix/`, `refactor/`
- Never modify existing Alembic migration files
- Any change to SRS logic must update **both** `backend/dabia/core/scheduler.py` and `frontend/src/utils/srs.ts`
