# Dabia Architecture & Design Specs

## 1. Domain Model (SRS Engine)
The core of Dabia is the Spaced Repetition System.
- **Proficiency Levels**: 1 (New) -> 2 (Hard) -> 3 (Learning) -> 4 (Easy) -> 5 (Mastered).
- **Scheduling**: 
    - Short-term: Seconds/Minutes (for levels 1-3).
    - Long-term: Days/Weeks (for levels 4-5).
- **Session Logic**: The `/api/v1/session/next-card` endpoint drives the entire flow. It accepts the previous card's result and returns the next card.
- **State Machine Synchronization**: 
    > [!IMPORTANT]
    > The proficiency state machine logic is **mirrored** in both layers:
> 1. **Backend** ([backend/dabia/core/scheduler.py](backend/dabia/core/scheduler.py)): The source of truth for persistent data.
> 2. **Frontend** ([frontend/src/utils/srs.ts](frontend/src/utils/srs.ts)): Used for instant UI feedback and session history display.
    > **Any change to the SRS logic MUST be applied to both files simultaneously.**

## 2. Database Schema (Key Models)
- **User**: ID (UUID), Email, Google_ID, Review Logs (One-to-Many).
- **Card**: Static content (Question, Answer, Audio).
- **UserCardAssociation**: Tracks the proficiency level of a specific card for a specific user.
- **ReviewLog**: Immutable history of every review attempt (timestamp, duration, rating).

## 3. UI Design Specification (Detailed)

### Color Palette
#### Base Layer
- **Canvas**: `#F9F9F8` (Warm off-white)
- **Surface**: `#FFFFFF` (Pure white, card bg)
- **Overlay**: `#F2F0EF` (Light warm gray)

#### Content Layer
- **Primary Text**: `#2A2A29` (Soft Charcoal)
- **Secondary Text**: `#888888` (Warm Gray)
- **Border**: `#E6E6E3` (Subtle Warm Gray)

#### Brand Layer
- **Brand Primary**: `#D97757` (Terracotta/Burnt Orange)
- **Brand Light**: `#F2DCD6` (Pale Apricot)
- **Brand Dark**: `#B05030` (Deep Earth)

### Typography
- **Headings**: `Noto Serif JP`
- **Body**: `Inter`

## 4. Environment Variables
- `backend/.env`: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `SECRET_KEY`
- `frontend/.env`: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`

## 5. Deployment
- **Frontend**: Static build to Vercel/Netlify.
- **Backend**: Docker container.
- **Database**: Managed PostgreSQL.
