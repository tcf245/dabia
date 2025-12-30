# Feature Overview: Deck Selection

**Date:** 2025-12-30
**Author:** Alma
**Feature:** Deck Selection & Management

## 1. Feature Summary

This feature introduces a "Library" page that empowers users to customize their learning sessions by selecting specific decks of flashcards. Previously, the Spaced Repetition System (SRS) would pull cards from all available decks. Now, users can activate or deactivate decks, and the scheduler will only present cards from the decks they have chosen. This provides a more focused and personalized learning experience.

## 2. Technical Implementation Details

The implementation spans both the backend and frontend, involving database modifications, new API endpoints, and a dedicated user interface.

### 2.1. Backend Changes

#### **Database Model (`dabia/models/user.py`)**

*   The `User` model has been updated to include a new field: `active_deck_ids`.
*   **Technology:** This field is implemented as a `JSON` type in the database.
*   **Purpose:** It stores an array of UUIDs (as strings) corresponding to the `Deck` models that the user has marked as active. It defaults to an empty list `[]`.

#### **API Endpoints (`dabia/api/v1/decks.py`)**

A new router was created to handle all deck-related operations.

*   **`GET /api/v1/decks/`**:
    *   **Purpose:** Fetches a list of all available decks in the database.
    *   **Details:** It joins the `decks` and `cards` tables to include an accurate `card_count` for each deck. It also contains fallback logic to infer metadata.

*   **`GET /api/v1/decks/settings`**:
    *   **Purpose:** Retrieves the active deck settings for the currently authenticated user.
    *   **Returns:** A JSON object containing a list of active deck UUIDs, e.g., `{"active_deck_ids": ["uuid1", "uuid2"]}`.

*   **`PUT /api/v1/decks/settings`**:
    *   **Purpose:** Updates the active deck settings for the user.
    *   **Payload:** Accepts a JSON object with the same structure as the `GET` endpoint.

#### **Metadata Inference (`infer_metadata` function)**

*   A utility function was created to automatically infer a deck's `difficulty` and `tags` from its name if these fields are not explicitly set in the database. This improves data robustness.
*   **Logic:** It uses regular expressions to find JLPT levels (e.g., "N5", "N3") and keyword matching for terms like "Core" or "Business".

#### **Scheduler Logic (`dabia/core/scheduler.py`)**

*   The core `get_next_card` method was modified.
*   **Change:** Before querying for overdue or new cards, the scheduler now fetches the user's `active_deck_ids`.
*   A helper method, `_apply_deck_filter`, was added to apply a `WHERE card.deck_id IN (...)` filter to both the overdue card query and the new card query, ensuring only cards from active decks are selected.

### 2.2. Frontend Changes

#### **Deck Management UI (`frontend/src/pages/DeckManagement.tsx`)**

*   A new page component was created to serve as the user-facing "Library".
*   **On Load:** It makes two parallel API calls: one to `GET /api/v1/decks/` to get all decks and another to `GET /api/v1/decks/settings` to get the user's current selection.
*   **UI:** It displays decks in a grid, showing metadata and a toggle switch indicating the active status.
*   **Interaction:** Clicking a deck calls the `handleToggle` function.

#### **API Service (`frontend/src/services/api.ts`)**

*   New functions were added to correspond with the new backend endpoints: `getDecks()`, `getDeckSettings()`, and `updateDeckSettings(settings)`.

## 3. Key Design Decisions

*   **Optimistic UI Updates:** When a user toggles a deck, the UI state is updated instantly for a responsive user experience. The API call to save the changes happens in the background. If the API call fails, the UI reverts to its previous state to maintain consistency.
*   **Centralized Deck Filtering:** The decision to modify the core scheduler on the backend ensures that deck selection is enforced consistently, regardless of how the `get_next_card` function is called. This is more robust than relying on frontend filtering.
*   **JSON for Deck IDs:** Using a `JSON` field in the database for `active_deck_ids` is a flexible and simple solution that avoids the complexity of a many-to-many join table for this specific user preference.
