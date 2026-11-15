# ADR 003: Learner-Language Card Content in `card_translations`

## Status
Accepted (2026-11-16)

## Context
Card content was Chinese only: `cards.hint` (the meaning) and `cards.sentence_translation`. The welcome page and the
app are going bilingual (Chinese and English), and more learner languages may follow. Only these two fields depend on
the learner's language; the Japanese side of a card (target word, reading, sentence, furigana, audio) is the same for
everyone.

## Decision
- A `card_translations` table holds one row per card and language: `card_id`, `language`, `hint`,
  `sentence_translation`, unique on `(card_id, language)`. The migration copies every card's current content as `zh`.
- `cards.hint` and `cards.sentence_translation` stay as they are, as the last fallback and for older clients.
- No list of supported languages lives in code. A language is available once rows exist for it.
  `GET /api/v1/languages` lists the languages with their card counts, and the frontend builds its language menu
  from it.
- Language codes are lowercase BCP 47 tags (`en`, `ja`, `pt-br`, `zh-hant`). A request (`?lang=pt-BR`) tries the full
  tag, then its base language, then `zh`, field by field (`dabia/core/i18n.py`). The response says which language
  the hint was served in (`card.language`).

## Adding a language
1. Generate a CSV of `guid,hint,sentence_translation` for the new language from the Chinese source (the English one
   was made this way, with a validator for row counts, empty fields and leftover Chinese characters).
2. Put it in `backend/alembic/data/card_translations_<language>.csv` (columns `guid,hint,sentence_translation`) and add
   a data migration like `c3f5a7b9d1e2_import_english_card_translations.py`: it upserts by `guid` and skips guids with
   no card. Seed data goes through Alembic (ADR 002), and the backend's Vercel install step runs
   `alembic upgrade head`, so merging deploys the content to each environment without anyone handling database
   credentials.
3. Add the UI strings: `frontend/src/i18n/messages/<language>.ts`, typed as `Messages` (a missing key fails the
   build), registered in `frontend/src/i18n/index.ts`. The language menu offers a language once it has both a UI
   dictionary and card content (`GET /api/v1/languages`). No backend or schema change is needed.

## Frontend
- `LanguageProvider` picks the language: the saved choice (`localStorage` `dabia.language`), then the browser's
  preferred languages (full tag, then base), then `zh`. It sets `<html lang>` and the `lang` parameter of card
  requests, and `useI18n()` gives components the dictionary.
- Switching language mid-session reloads the card on screen in the new language; dates and numbers follow the
  dictionary's `locale`.

## Consequences
- One extra indexed query per served card.
- A card without a translation still shows its Chinese meaning instead of nothing; `card.language` tells the client.
- Imports must write lowercase tags; `normalize_language` is the reference.
