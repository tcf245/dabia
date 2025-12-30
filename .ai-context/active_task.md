# Active Task & Memory Snapshot

## Current Context (Updated: 2025-12-30)

### 1. Status
- **Branch**: `feat/deck-selection` (Current)
- **Phase**: Feature Development / Stabilization
- **Goal**: Implement deck management (selection, settings) and stabilize the logic by resolving conflicts with master.

### 2. Design Spec
- **UI**: Terracotta Theme (Tailwind CSS), minimal and clean.
- **Interactions**: Users can select which decks to include in their learning session.
- **Accessibility**: Standard compliance, aria-labels for buttons.

### 3. Recent Milestones
- Complete UI overhaul to Sora-iro / Terracotta Theme.
- Multi-level undo/redo implemented in Learning Session.
- Deck management system basic implementation.

### 4. Implementation Details
- **Logic Extraction**: Flashcard logic moved to `useFlashcardLogic` hook for better testability.
- **Deck Scoping**: `getNextCard` API now supports deck filtering.
- **Coverage**: Targeting 100% line coverage for core logic hooks and pages.
