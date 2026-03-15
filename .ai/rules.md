# Dabia Project AI Rules & Workflow

## 1. Communication & Output
- Conversation with the user MUST be in Chinese.
- Code, comments, docs, commit messages, and identifiers in the repository MUST be in English.
- Keep responses concise and implementation-oriented.

## 2. Branching & Git Discipline
- Start every feature or fix from the latest `master`.
- Create or reuse a focused branch with a conventional name such as `feat/grammar-skeleton`.
- Do not modify or revert unrelated user changes.
- Use Conventional Commits for commits.

## 3. Development Workflow
- Prefer TDD for all non-trivial changes.
- Red: add or update the smallest failing test that defines the expected behavior.
- Green: implement the minimum change needed to pass.
- Refactor: improve naming, structure, and duplication without changing behavior.
- Re-run the relevant verification after each meaningful change.

## 4. Verification Policy
- Backend baseline verification: `uv run pytest`
- Frontend baseline verification: `npm test`
- For focused work, run the smallest relevant test slice first, then run broader coverage before completion.
- Do not claim completion without executable verification or a clearly stated blocker.

## 5. AI Context Maintenance
- Treat `.ai/` as the canonical AI working context for this repository.
- Update `.ai/state/active_task.md` when the current feature scope, phase, or next checkpoint changes.
- Update `.ai/state/backlog.md` when new follow-up work or deferred work is identified.
- Update `.ai/architecture.md` when stable architectural decisions, data contracts, or workflow patterns change.
- Record each substantial feature walkthrough in `docs/dev_logs/`.

## 6. Agentic Loop Guidance
- Large features must be executed as a loop of: scope -> implement -> verify -> diagnose -> fix -> re-verify.
- Every loop must consume real feedback from tests, linters, builds, scripts, or data validation.
- If a task cannot yet be verified, first build the verifier or define a manual acceptance check.
- Stop conditions:
  - acceptance criteria are met
  - repeated retries are no longer producing new information
  - the task is blocked by missing product decisions or external access

## 7. Batch Processing Guidance
- Batch pipelines such as grammar annotation must be incremental and repeatable.
- Separate the pipeline into:
  - analysis
  - rule mapping
  - persistence
  - evaluation
- Persist provenance such as `source`, `confidence`, and timestamps so low-confidence output can be reviewed later.
- Prefer deterministic rules over opaque model output for first-pass annotations.

## 8. Local Database Tooling
- Prefer the same local PostgreSQL client setup as the user when inspecting production-like data.
- Current standard client path: `/opt/homebrew/opt/libpq/bin/psql`
- Use read-only queries for exploration until the grammar persistence workflow is implemented and verified.

## 9. Local Documentation Policy
- The entire `docs/` directory is treated as local working knowledge by default and should not be committed.
- Use `docs/` for diaries, walkthroughs, and NotebookLM-oriented notes, but keep those files out of git unless the user explicitly asks otherwise.
- If `docs/` files are accidentally staged or tracked, remove them from the git index while preserving local copies.
