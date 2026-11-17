# Dabia Backlog

Parked features and follow-ups. Add an entry when work is deferred; remove it when it ships or is dropped.

## Features

### Grammar skeleton (Phase 1)
- **State**: parked. PR #64 (`feat/grammar-skeleton`), open since 2026-03-15, now conflicts with `master`.
- **What it does**: display-only grammar explanations attached to cards. `GrammarPoint` (canonical concept) and
  `CardGrammarAnnotation` (card-specific span and explanation), `GET /api/v1/cards/{card_id}/grammar`, a lazy-loaded
  grammar panel on the flashcard, and a deterministic batch annotation script. Must not affect SRS or card selection.
- **Known status**: Phase 1 was reported complete with green feature tests (work diary 2026-03-15); a 50-card local
  sample produced 37 annotated cards and 45 annotations. Annotation quality, not infrastructure, is the bottleneck.
- **Next step**: decide with Eric whether to rebase PR #64 onto `master` (the i18n work in #71/#72 changed the card
  API and flashcard UI since) or close it and restart from the design.

### N2 grammar deck
- **State**: idea, to discuss with Eric.
- **Starting point**: branch `feat/import-n2-grammar-deck` (unmerged).
- **Next step**: review what the branch imports and how it relates to the grammar skeleton before reviving it.

## Maintenance

### Stale branch triage
About 20 remote branches were never merged into `master` (`git branch -a --no-merged origin/master`). Go through
them once: salvage anything still useful into a fresh branch from `master`, delete the rest.
