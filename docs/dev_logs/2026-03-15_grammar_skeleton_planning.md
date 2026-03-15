# Grammar Skeleton Planning

**Date**: 2026-03-15
**Author**: Codex
**Status**: Planning

## 1. Feature Goal
`grammar-skeleton` is intended to help learners understand how Japanese sentences are assembled. It focuses on:
- sentence roles and composition
- particles and their local function
- verb or adjective inflection logic
- reusable grammar intuition rather than only word memorization

This feature is display-only in the current phase and must not affect SRS or card selection.

## 2. Agreed Domain Direction
- One `Card` can map to many grammar explanations.
- Grammar should not be represented as a bundle of extra nullable fields on `cards`.
- The preferred model is:
  - `GrammarPoint`: canonical grammar concept
  - `CardGrammarAnnotation`: card-specific mapping to a grammar point

This preserves reuse while still allowing sentence-specific explanation text and span data.

## 3. Delivery Strategy
Phase 1 is intentionally conservative:
1. Add grammar persistence and read APIs.
2. Build a batch pipeline to annotate existing card sentences.
3. Surface grammar as an optional flashcard panel.

Out of scope for this phase:
- grammar-driven exercises
- grammar-aware scheduler changes
- external crawling as the primary production source of truth

## 4. Annotation Strategy
The initial annotation pipeline should be semi-automatic.

Recommended loop:
1. Run morphological analysis on a bounded set of card sentences.
2. Apply deterministic mapping rules to identify grammar candidates.
3. Persist annotations with `source` and `confidence`.
4. Review a sampled subset manually.
5. Refine rules and rerun incrementally.

Why this approach:
- It is closer to the existing product value than building a complete grammar knowledge system first.
- It is easier to verify.
- It supports correction and iteration.

## 5. Agentic Loop For This Feature
Each implementation slice should follow:
1. Define the smallest acceptance target.
2. Add failing tests or fixtures.
3. Implement the minimum change.
4. Run the targeted verifier.
5. Classify failure:
   - implementation bug
   - test issue
   - schema mismatch
   - pipeline quality issue
6. Apply a focused fix.
7. Re-run the verifier.
8. Update `.ai/state/active_task.md` if the checkpoint changes.

For the batch annotation workflow, the loop becomes:
1. select a sample card set
2. annotate
3. compare against expected output
4. measure quality
5. refine rules
6. rerun

## 6. Verification Plan
- Schema:
  - model tests
  - Alembic migration verification
- Backend API:
  - integration tests for retrieving grammar data by card
- Frontend:
  - component tests for optional grammar rendering
- Batch pipeline:
  - fixture-based parser tests
  - golden sample comparisons
  - dry-run support before bulk writes

## 7. Real Data Baseline
A local PostgreSQL database was provided for development-time validation.

Verified on 2026-03-15:
- `cards` count: `10157`
- sample sentences:
  - `テーマを絞り込む`
  - `品数がない`
  - `初版を完売する`
- local SQL client aligned with user environment:
  - `/opt/homebrew/opt/libpq/bin/psql`

This dataset should be used to drive the batch annotation loop:
1. sample real cards
2. annotate with parser plus rules
3. inspect quality on small reviewed slices
4. refine rules before larger writes

## 8. Workflow Commitments
- Start implementation work from the latest `master`.
- Use TDD wherever practical.
- Keep `.ai/` updated as the canonical AI context.
- Write a dev log for each substantial feature walkthrough.
