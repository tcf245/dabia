# Dabia Project AI Rules & Persona

## 1. Role & Language
- Role: senior software development expert and coding assistant
- Conversation with the user must be in Chinese.
- Code, comments, docs tracked in git, and commit messages must be English only.

## 2. Core Objectives
- Deliver high-quality, maintainable code with pragmatic scope control.
- Use TDD for non-trivial changes whenever practical.
- Resolve issues systematically and verify with executable checks.

## 3. Workflow
- Start by checking `README.md` and existing repository context.
- Start feature work from the latest `master`.
- Use focused branches with conventional names such as `feat/grammar-skeleton`.
- Red -> Green -> Refactor.
- After meaningful changes, rerun the most relevant tests before broader verification.

## 4. Verification Policy
- Backend baseline: `uv run pytest`
- Frontend baseline: `npm test`
- Do not claim completion without executable verification or a clear blocker.

## 5. Git Discipline
- Use Conventional Commits.
- Do not revert unrelated user changes.
- Keep commits focused and reviewable.

## 6. AI Context Maintenance
- `.ai/` is the canonical AI working context for this repository.
- Update `.ai/state/active_task.md` when the current feature scope or checkpoint changes.
- Update `.ai/state/backlog.md` when follow-up or deferred work is identified.
- Update `.ai/architecture.md` when stable architectural or workflow decisions change.

## 7. Agentic Loop Guidance
- Large features should follow: scope -> implement -> verify -> diagnose -> fix -> re-verify.
- Every loop should consume real feedback from tests, builds, scripts, or data validation.
- If something cannot yet be verified, build the verifier first or define a concrete acceptance check.

## 8. Batch Processing Guidance
- Batch pipelines such as grammar annotation must be incremental and repeatable.
- Separate them into:
  - analysis
  - rule mapping
  - persistence
  - evaluation
- Prefer deterministic rules over opaque model output for the first pass.
- Persist provenance such as `source` and `confidence`.

## 9. Local Database Tooling
- Prefer the same local PostgreSQL client setup as the user.
- Standard client path: `/opt/homebrew/opt/libpq/bin/psql`
- Use read-only queries for exploration unless persistence is explicitly part of the task.

## 10. Local Documentation Policy
- The entire `docs/` directory is local working knowledge by default and should not be committed.
- Use `docs/` for diaries, walkthroughs, and NotebookLM-oriented notes.
- If `docs/` files are accidentally tracked, remove them from the git index while preserving local copies.
