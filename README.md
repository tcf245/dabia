# Dabia (ダビア)

![Dabia Banner](https://raw.githubusercontent.com/yetone/dabia/main/docs/assets/banner.png)

> **A Father's Gift, A Learner's Journey.**
> "Dabia" is not in any dictionary. It's a lovely word my three-year-old daughter invented—for me, it represents the pure joy of discovery and expression.

---

## ✨ Why I Built Dabia: A Story That Started with a Word

Dabia was born from my own family's journey. When I moved with my family from China to Japan, I watched my young daughter navigate a new world with curiosity and ease. She didn't "study" the language; she acquired it organically, through play and discovery.

I chose the name **"Dabia"** to capture that sense of innocence. I didn't want to build just another piece of software; I wanted to create a tool forged from paternal love—something that could transform the heavy burden of language learning into the lighthearted joy of discovery. I believe learning shouldn't be a grind; it should feel like exploring the world through a child's eyes.

---

## 🎨 My Vision: Minimal, Focused, Beautiful

I designed Dabia as an intelligent Japanese vocabulary trainer inspired by *Lingvist*, specifically for those who value both efficiency and aesthetics.

- **Sora-iro (Sky Blue) Aesthetic**: I chose the "Sora-iro" palette, rooted in traditional Japanese colors, to create a calm and clear environment. My goal is to reduce the anxiety that so often comes with study.
- **Pure Focus**: I've kept the interface as clean as *Notion* and as efficient as *Lingvist*. I've stripped away the noise so you can focus entirely on your conversation with the language.
- **Your Reliable Companion**: I built this to be there for you whenever you're ready—whether it's during your morning commute or a quiet study session late at night.

---

## 🧠 The Memory Engine: My 5-Stage Proficiency SRS

At the heart of Dabia is a rigorous **Spaced Repetition System (SRS)** I developed to respect how our brains actually work. I don't just want to track if you're "right" or "wrong"; I want to model your memory's journey across five distinct stages:

1.  **New**: Our first connection with a new word.
2.  **Hard**: Your brain is working hard to build neural pathways; I'll show you this card more frequently for immediate reinforcement.
3.  **Learning**: You're starting to internalize the word; short-term consolidation is happening.
4.  **Easy**: Long-term retention is established; I'll extend the review intervals to weeks so you can focus on new challenges.
5.  **Mastered**: The word has become part of your subconscious—true language intuition.

My scheduler acts as your personal coach, delivering the right card at the precise moment before you forget. I want to ensure every minute you spend is a permanent investment in your fluency.

---

## 📺 Preview

### Core Learning Flow
![Learning Session Preview](https://raw.githubusercontent.com/yetone/dabia/main/docs/assets/demo_session.gif)

### Proficiency Dashboard
![Proficiency Dashboard](https://raw.githubusercontent.com/yetone/dabia/main/docs/assets/proficiency_ui.png)

---

## 🚀 Quick Start

You can get your local learning environment up and running in just a few minutes.

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

Visit `http://localhost:5173` and start your journey with me.

---

## 💖 Credits

I am grateful to the [anki-jlpt-decks](https://github.com/5mdld/anki-jlpt-decks) project by **egg rolls** for the core card data (licensed under CC BY-NC 4.0).

---

© 2026 Dabia Project. Built with code, defined by heart.
