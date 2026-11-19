# Dabia API Design

Every endpoint the backend serves, read from `backend/dabia/api/v1/*` and `backend/dabia/main.py`.
Update this file in the same PR as any endpoint change.

## Conventions

- **Versioning**: path prefix `/api/v1/`.
- **Authentication**: `Authorization: Bearer <JWT>`, issued by `POST /api/v1/auth/login/google`.
  - No token: the request runs as the demo user `00000000-0000-0000-0000-000000000000` (signed-out demo mode).
  - Invalid or expired token, or a token whose user no longer exists: `401`. The frontend clears the token and
    dispatches `dabia:unauthorized`.
  - Token refresh: tokens live 7 days. When a valid token is more than a day old, the response carries a fresh one
    in the `X-Refresh-Token` header (`TokenRefreshMiddleware`), which the frontend stores.
- **Learner language** (`lang` query parameter, on card endpoints): a BCP 47 tag such as `en` or `pt-BR` for
  `target.hint` and `sentence_translation`. Falls back field by field to the base language, then `zh`. The card's
  `language` field is the language actually served. See `.ai/decisions/003-card-content-i18n.md`.
- **Media URLs**: the database stores relative paths; the API joins them with the storage provider's public URL
  (`core/storage.py`, R2 by default).

## Endpoint Index

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/session/next-card` | optional | Record the previous answer, return the next card |
| GET | `/api/v1/cards/{card_id}` | optional | One card, localized |
| GET | `/api/v1/decks/` | none | All decks with card counts |
| GET | `/api/v1/decks/settings` | optional | The user's active decks |
| PUT | `/api/v1/decks/settings` | optional | Replace the user's active decks |
| GET | `/api/v1/stats/daily-summary` | optional | Today's study summary |
| GET | `/api/v1/profile/heatmap` | optional | Reviews per day, last 365 days |
| GET | `/api/v1/profile/garden` | optional | Words for the profile word garden |
| GET | `/api/v1/languages` | none | Learner languages cards can be served in |
| POST | `/api/v1/auth/login/google` | none | Exchange a Google auth code for a JWT |
| GET | `/api/v1/health-check` | none | Database connectivity check |
| GET | `/` | none | Welcome message |

"optional" means the endpoint works without a token, as the demo user.

---

## Session

### `POST /api/v1/session/next-card`

The core endpoint that drives a learning session. The client sends the result of the previous card (if any) and
receives the next card.

**Query**: `lang` (optional), see Conventions.

**Request body** (`PreviousAnswer`, optional; send an empty body on the first request of a session). Field names
are accepted in camelCase (as the frontend sends them) or snake_case:

```json
{
  "cardId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "isCorrect": true,
  "responseTimeMs": 2150,
  "quality": 4
}
```

- `responseTimeMs` must be > 0.
- `quality` (0–5) is optional. Without it, `isCorrect` maps to 4 (correct) or 2 (incorrect).

**Response** (`NextCardResponse`):

```json
{
  "card": {
    "card_id": "f6e5d4c3-b2a1-4f5e-8d9c-1a2b3c4d5e6f",
    "deck": { "id": "73d6cb04-617c-433b-9af7-7cf73304f0cd", "name": "eggrolls-JLPT10k-v3::1-N4+N5" },
    "sentence_template": "これは__ですか？",
    "target": { "word": "何", "hint": "What?" },
    "reading": "なに",
    "audio_url": "https://<r2-public-url>/medias/002.mp3",
    "sentence": "これは何ですか？",
    "sentence_furigana": "これ[これ]は[は]何[なに]ですか[ですか]？",
    "sentence_translation": "What is this?",
    "sentence_audio_url": "https://<r2-public-url>/medias/sentence_002.mp3",
    "proficiency_level": 0,
    "language": "en"
  },
  "session_progress": { "completed_today": 1, "goal_today": 50 },
  "previous_card_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
}
```

- `card` is `null` when nothing is due and no new card is available.
- `proficiency_level` is `0` for a card the user has never seen, otherwise 1–5.
- `completed_today` counts today's review logs (UTC day); `goal_today` is fixed at 50.
- Errors inside the handler return `500` with the error message.

```bash
# First request of a session (empty body)
curl -X POST http://127.0.0.1:8000/api/v1/session/next-card -H "Content-Type: application/json" -d ''

# Subsequent request with an answer
curl -X POST http://127.0.0.1:8000/api/v1/session/next-card -H "Content-Type: application/json" \
  -d '{"cardId": "f6e5d4c3-b2a1-4f5e-8d9c-1a2b3c4d5e6f", "isCorrect": true, "responseTimeMs": 3000}'
```

## Cards

### `GET /api/v1/cards/{card_id}`

One card in the same `Card` shape as `next-card`, with the user's proficiency level. Used to re-localize the card
on screen when the learner switches language mid-session.

**Query**: `lang` (optional). **Errors**: `404` if the card does not exist.

## Decks

### `GET /api/v1/decks/`

All decks with their card counts. Public. When a deck has no `difficulty` or `tags` in the database, they are
inferred from its name (JLPT level, "daily", "core", "business") and saved.

```json
[
  {
    "id": "73d6cb04-617c-433b-9af7-7cf73304f0cd",
    "name": "eggrolls-JLPT10k-v3::1-N4+N5",
    "description": null,
    "count": 1500,
    "difficulty": "Beginner",
    "tags": ["JLPT N4"]
  }
]
```

### `GET /api/v1/decks/settings`

The user's active decks: `{"active_deck_ids": ["<uuid>", "..."]}`. Invalid stored IDs are dropped. The scheduler
only draws cards from active decks.

### `PUT /api/v1/decks/settings`

Replaces the active deck list. Body and response: `{"active_deck_ids": ["<uuid>", "..."]}`.

## Stats

### `GET /api/v1/stats/daily-summary`

Today's summary (UTC day) for the daily goal popup.

```json
{
  "to_learn_count": 12,
  "learned_count": 8,
  "reinforced_count": 30,
  "total_answered": 50,
  "total_time_seconds": 640,
  "new_words_count": 8,
  "accuracy": 86.0
}
```

- `to_learn_count`: the user's cards due now.
- `learned_count` / `reinforced_count`: distinct cards reviewed today that were first seen today / before today.
- `new_words_count`: cards first seen today.
- `accuracy`: percent correct of today's answers, `0.0` if none.

## Profile

### `GET /api/v1/profile/heatmap`

Reviews per day for the last 365 days; only days with activity are returned.

```json
[{ "date": "2026-11-15", "count": 42, "level": 4 }]
```

`level` (0–4): 0 for none, 1 for ≤5, 2 for ≤10, 3 for ≤20, 4 above.

### `GET /api/v1/profile/garden`

Up to 8 learning words (`type: "review"`, proficiency 1–4, ordered by `next_review_at` ascending) and up to 6 mastered
words (`type: "learned"`, proficiency 5, ordered by `last_reviewed_at` descending with nulls last). The frontend lays
them out.

**Query**: `lang` (optional), see Conventions (localizes `hint`).

```json
[
  {
    "card_id": "f6e5d4c3-b2a1-4f5e-8d9c-1a2b3c4d5e6f",
    "text": "花",
    "reading": "はな",
    "romaji": "はな",
    "hint": "flower",
    "level": 5,
    "type": "learned"
  }
]
```

`romaji` is a deprecated alias of `reading` kept for one release.

## Languages

### `GET /api/v1/languages`

The learner languages cards can be served in. Public, so the signed-out welcome page can build its language menu.
A language appears as soon as translations for it are imported.

```json
{
  "default": "zh",
  "languages": [
    { "code": "zh", "cards": 10307 },
    { "code": "en", "cards": 10307 }
  ]
}
```

## Auth

### `POST /api/v1/auth/login/google`

Exchanges a Google OAuth authorization code (auth-code flow, `redirect_uri=postmessage`) for a Dabia JWT. Creates
the user on first login and refreshes name and avatar on later logins.

- Body: `{"code": "<google auth code>"}`
- Response: `{"access_token": "<jwt>", "token_type": "bearer"}`. Claims: `sub` (user id), `email`, `name`, `picture`.
- Errors: `401` when the code exchange or ID-token verification fails.

## Health

### `GET /api/v1/health-check`

Runs `SELECT 1` against the database and returns `{"status": "ok"}`.
