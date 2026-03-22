# Dabia (ダビア)

Dabia is a minimalist Japanese vocabulary trainer built to help learners build their vocabulary at a steady, rhythmic pace.

### The Origin
The name "Dabia" was invented by my three-year-old daughter. To me, it represents the pure, unburdened joy of discovery—the same feeling I want to bring back to the process of learning a new language.

### How it Works
The core of Dabia is a 5-stage Spaced Repetition System (SRS) designed for incremental growth. Instead of a simple "pass/fail" approach, Dabia models your memory across five proficiency levels:

1. **New** → 2. **Hard** → 3. **Learning** → 4. **Easy** → 5. **Mastered**

The system manages your study sessions by mixing short-term reinforcement (intervals of seconds and minutes) with long-term retention (intervals of days and weeks), ensuring that your vocabulary grows naturally and stays permanent.

### Tech Stack
- **Backend**: FastAPI (Python 3.12), PostgreSQL, SQLAlchemy (Async).
- **Frontend**: React 19, Vite, Tailwind CSS v4, TypeScript.

### Documentation for AI
If you are using an AI agent (like Cursor, Claude, or ChatGPT) to work on this project, comprehensive architectural details, coding rules, and state maps are maintained in the `.ai/` directory.

### Quick Start
1. **Backend**:
   ```bash
   cd backend
   docker-compose up -d  # Start PostgreSQL
   uv sync               # Install dependencies
   uv run alembic upgrade head
   uv run uvicorn dabia.main:app --reload
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Credits & Gratitude
Special thanks to the [anki-jlpt-decks](https://github.com/5mdld/anki-jlpt-decks) project by **egg rolls** for the core card data (licensed under CC BY-NC 4.0).

---
© 2026 Dabia Project. Built with care for learners everywhere.
