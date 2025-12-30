# Active Task & Memory Snapshot

## Current Context (Updated: 2025-12-29)

### 1. Status
- **Branch**: `feat/learning-session-undo` (Current)
- **Phase**: Feature Development / TDD
- **Recent Milestones**:
    - Complete UI overhaul to Terracotta Theme (Tailwind CSS).
    - Data Import Pipeline (Script + MP3 Upload + Migration) fully completed.

### 2. Immediate Focus
- **Feature**: Implement "Undo" functionality for Learning Session.
    - *Goal*: Allow users to revert their last answer (update DB + UI state).
    - *Method*: TDD (Red -> Green -> Refactor).

### 3. Implementation Details
- **TDD Enforcement**: Ensure all new features have accompanying unit/integration tests.
- **CORS**: Configured in `main.py` with flexible regex.
- **Privacy**: No real user data in seeds.
