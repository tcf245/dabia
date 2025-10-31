# Dabia API Design

This document outlines the design for the core Dabia API endpoints.

## Versioning

The API is versioned using a path prefix, e.g., `/api/v1/`.

---

## Endpoints

### `POST /api/v1/session/next-card`

This is the single core endpoint that drives the user's learning session. The client sends the result of the previous card (if any) and receives the next card to be studied.

**Authentication**: Required (e.g., via Bearer Token).

#### Request Body

The body of the request should contain the result of the card the user just answered. For the very first request in a session, the body should be empty.

**Model** (`PreviousAnswer`):
```json
{
  "card_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "is_correct": true,
  "response_time_ms": 2150
}
```

#### Response Body

The response contains the next card to be displayed and the user's current progress.

**Model** (`NextCardResponse`):
```json
{
  "card": {
    "card_id": "f6e5d4c3-b2a1-4f5e-8d9c-1a2b3c4d5e6f",
    "sentence_template": "これは__ですか？",
    "target": {
      "word": "何",
      "hint": "What?"
    },
    "audio_url": "https://cdn.dabia.app/audio/002.mp3",
    "proficiency_level": 0
  },
  "session_progress": {
    "completed_today": 1,
    "goal_today": 50
  }
}
```

If the learning session is complete, the `card` field will be `null`.

#### Example Usage (cURL)

```bash
# First request of a session (empty body)
curl -X POST http://127.0.0.1:8000/api/v1/session/next-card -H "Content-Type: application/json" -d ''

# Subsequent request with an answer
curl -X POST http://127.0.0.1:8000/api/v1/session/next-card -H "Content-Type: application/json" -d '{
  "card_id": "f6e5d4c3-b2a1-4f5e-8d9c-1a2b3c4d5e6f",
  "is_correct": true,
  "response_time_ms": 3000
}'
```
