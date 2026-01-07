# Dabia (ダビア)

![Dabia Banner](https://raw.githubusercontent.com/yetone/dabia/main/docs/assets/banner.png)

> **A Father's Gift, A Learner's Journey.**
> "Dabia" is not found in any dictionary. it's a lovely word invented by a three-year-old girl—representing the joy of discovery, play, and expression.

---

## ✨ Origin: A Story That Started with a Word

Dabia was born from a life-changing journey. When the founder moved his family from China to Japan, he witnessed the pure, organic way his young daughter acquired a new language—free from the burden of traditional study.

The name **"Dabia"** captures that innocence. It is more than software; it is a tool forged from paternal love, designed to transform the weight of language learning into the joy of discovery. We believe learning shouldn't be about grinding—it should be about exploring the world, just like a child does.

---

## 🎨 Vision: Minimal, Focused, Beautiful

Dabia is an intelligent Japanese vocabulary training tool inspired by *Lingvist*, built for those who value efficiency and aesthetics.

- **Sora-iro (Sky Blue) Aesthetic**: Rooted in traditional Japanese colors, our "Sora-iro" palette creates a calm, clear environment to reduce study anxiety.
- **Pure Focus**: As clean as *Notion*, as efficient as *Lingvist*. We strip away the noise so you can have a direct conversation with the language.
- **Seamless Learning**: Designed to be your reliable companion, whether you're on a morning commute or in a quiet late-night study session.

---

## 🧠 The Memory Engine: 5-Stage Proficiency SRS

At the heart of Dabia is a rigorous **Spaced Repetition System (SRS)**. We don't just track "right" or "wrong"; we model the human forgetting curve by classifying mastery into five distinct stages:

1.  **New**: The beginning of a new connection.
2.  **Hard**: Your brain is building neural pathways; requires immediate reinforcement.
3.  **Learning**: Short-term consolidation is taking place.
4.  **Easy**: Long-term retention is established; review intervals extend to weeks.
5.  **Mastered**: The word becomes part of your subconscious—true language intuition.

The scheduler acts as a personal coach, delivering the right card at the precise moment before you forget, ensuring every minute spent is a permanent investment in your fluency.

---

## 📺 Preview

### Core Learning Flow
![Learning Session Preview](https://raw.githubusercontent.com/yetone/dabia/main/docs/assets/demo_session.gif)

### Proficiency Dashboard
![Proficiency Dashboard](https://raw.githubusercontent.com/yetone/dabia/main/docs/assets/proficiency_ui.png)

---

## 🚀 Quick Start

Get your local learning environment up and running in minutes.

### Backend (FastAPI + PostgreSQL)
```bash
cd backend
docker-compose up -d  # Start database
uv sync              # Install dependencies
uv run alembic upgrade head  # Apply migrations
uv run uvicorn dabia.main:app --reload
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start your journey.

---

## 💖 Credits

Core card data is provided by the [anki-jlpt-decks](https://github.com/5mdld/anki-jlpt-decks) project by **egg rolls** (licensed under CC BY-NC 4.0).

---

© 2026 Dabia Project. Built with code, defined by heart.
