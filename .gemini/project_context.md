# Dabia Project Context

This file is maintained by your Gemini assistant to persist context about the "dabia" project, ensuring a consistent and efficient collaboration.

## Project Story & Goal

*   **Name Origin**: The project is named "dabia," a word invented by the user's daughter when she was learning to speak.
*   **Motivation**: Inspired by the user's family move from China to Japan and his daughter's language acquisition journey, the project aims to create a Japanese language learning tool similar to Lingvist for daily vocabulary training.
*   **Core Vision**: To build a flashcard-based learning system that incorporates concepts like Decks, Cards, and Users. The system should leverage spaced repetition (SRS) models, possibly based on the Ebbinghaus forgetting curve, to recommend cards based on the user's memory performance.

## Tech Stack

*   **Backend**: Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
*   **Frontend**: TypeScript, React, Vite, Tailwind CSS

## Project Philosophy & Specifications

*   **Development Strategy**: Follow a "Simplicity and Continuous Evolution" approach. Start with simple solutions (MVP) to meet requirements and then progressively refine and improve them.
*   **Testing**: Adhere to the TDD (Test-Driven Development) principle where possible. Critical functionalities must be covered by comprehensive test cases to ensure safety during refactoring and adjustments.
*   **Development Practices**:
    *   **Logging**: Pay attention to service logs.
    *   **Testing**: Run test cases after every modification to ensure nothing is broken.
    *   **Code Style**: Follow Google's recommended code style. Comments should be minimal, providing only essential explanations.
    *   **Git Workflow**: Commit after each feature is completed and has passed its tests. Commit messages should be concise and clearly state what was done.

## UI Preferences

*   **Inspiration**: A clean, simple, and elegant UI inspired by applications like Lingvist and Notion. The feel should be comfortable and understated, avoiding aggressive or distracting colors.
*   **Color Palette**: A preference for traditional Japanese colors. A primary accent color should be chosen and used consistently throughout the design to maintain a cohesive and harmonious look. The project recently adopted a 'Sora-iro' (sky blue) accent color.

## Key Architectural Decisions

*   **UI Framework**: The project recently migrated from Material-UI to Tailwind CSS to align with the desired UI aesthetic.
*   **Database Migrations**: Alembic is used to manage all database schema (DDL) changes and seed data updates.
*   **CORS**: The backend is configured to allow requests from the frontend, with a flexible regex for Vercel preview URLs and localhost.

## Development Log

*   **2025-11-05 (Commit: `c62f3b9`)**:
    *   **feat**: Resolved backend 500 errors and CORS issues.
    *   **Details**:
        *   Seeded a default user (`id: 0000...`) to fix a foreign key constraint violation when logging reviews.
        *   Simplified and relaxed the CORS configuration in `main.py` to ensure frontend-backend communication.
        *   Diagnosed and fixed an issue with the `reset_db.sh` script's execution context, ensuring the database is correctly initialized with all migrations.

## Collaboration Plan

*   This file (`.gemini/project_context.md`) serves as our shared memory.
*   The assistant will read this file at the beginning of each session and update it after significant progress.
*   The `.gemini/` directory is ignored by Git.