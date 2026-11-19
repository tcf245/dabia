# Spec: Word Review, Deck Progress and CSV Export

- **Status**: draft v2, Eric's review round 1 applied (see §10 Decisions)
- **Date**: 2026-11-19
- **Scope**: new "My Words" page, a three-colour deck progress bar, a one-click CSV export of learned words, and a
  visual refresh of the profile word garden (aligned to the same Learning / Mastered definition)

## 1. Background and goals

Today a learner can only see their words one card at a time inside a session. The profile "word garden" shows at most
20 words, and there is no way to answer "how far am I through this deck?" or to take the data out of Dabia.

Goals:

1. **Review learned words**: browse every word the learner has seen, split into *Learning* (level 1–4) and
   *Mastered* (level 5), with meaning, example sentence and audio.
2. **Deck progress at a glance**: for the selected deck, a three-colour bar showing Mastered / Learning / Not started
   against the full deck size.
3. **Export**: one click downloads the learned words as CSV for the learner's own analysis.

Non-goals (this spec):

- Changing SRS logic or scheduling. This feature is read-only over existing data; `scheduler.py` and `srs.ts` stay
  untouched.
- A "study these words now" mode launched from the list (see §9, future work).
- Editing, resetting or deleting a word's progress.

## 2. Definitions

Derived from `backend/dabia/core/srs_constants.py`. A card is in exactly one state for a given user:

| State | Rule | Shown as |
|---|---|---|
| Mastered | `user_card_associations.proficiency_level = 5` | 已掌握 / Mastered |
| Learning | association exists and `proficiency_level` in 1–4 | 学习中 / Learning |
| Not started | no association row for (user, card) | 未学习 / Not started |

- **Learned words** = Mastered ∪ Learning (every card with an association row).
- **Deck total** = number of cards in the deck (`count` in `GET /api/v1/decks/`).
- `Not started = total − mastered − learning`, computed server-side.
- Level labels reuse `messages.proficiency.levels[1..5]`.

> Level 4 (Easy, 7-day interval) is **Learning**, not Mastered (decided by Eric). `GET /api/v1/profile/garden`
> currently splits at level 4 (`< 4` review, `>= 4` learned) and the comment on
> `UserCardAssociation.proficiency_level` still describes the old 0–4 scale; both are aligned to this table as part
> of the garden refresh (§4.10, §5.6).

## 3. User stories

1. As a learner, I open **My Words** and immediately see how much of my current deck I have mastered and how much is
   still in progress.
2. I switch between my active decks (or all of them at once) and the bar and list follow.
3. I open the **Learning** tab to see which words are still weak, filter to level 1–2, and play their audio.
4. I open the **Mastered** tab to enjoy what I have achieved.
5. I search for a word I remember vaguely, by kanji, reading or meaning.
6. I click **Export CSV** and get a file that opens correctly in Excel, Numbers or pandas, Japanese included.

## 4. UI and interaction

### 4.1 Entry points

- New route **`/words`**, added to the main nav in `AppHeader` between Decks and Profile:
  `{ to: '/words', label: 'words', icon: BookMarked }`. Labels: zh 「单词本」, en "My Words".
- On the Decks page, each deck card gains a thin (4px) version of the same progress bar under its count, and a
  "查看单词 / View words" link to `/words?deck=<id>` (phase 2, §8).

### 4.2 Page layout (desktop, `max-w-4xl`, same shell as `DeckManagement`)

```
┌──────────────────────────────────────────────────────────────────┐
│                         单词本 (serif h1)                         │
│              回顾你学过的每一个单词 (subtitle)                     │
│                                                                  │
│  Deck: [ JLPT N4+N5            ▾ ]                 [⤓ 导出 CSV]   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  已学 612 / 1,500 词                                  40.8% │  │
│  │  ████████████▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │
│  │  ● 已掌握 320 (21.3%)  ● 学习中 292 (19.5%)  ○ 未学习 888   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [ 全部 612 ]  [ 学习中 292 ]  [ 已掌握 320 ]                     │
│  Level: (1) (2) (3) (4)      🔍 搜索单词 / 读音 / 释义   排序 ▾   │
│                                                                  │
│  ⓘ 当前词库「JLPT N4+N5」· 学习中 · 292 个单词                    │
│                                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│  │ なに      ●●○○○│ │ はな      ●●●●●│ │ たべる    ●●●○○│            │
│  │ 何            │ │ 花            │ │ 食べる        │            │
│  │ What?         │ │ flower        │ │ to eat        │            │
│  │ 3天前 · ⌄     │ │ 已掌握 · ⌄    │ │ 2分钟后 · ⌄   │            │
│  └───────────────┘ └───────────────┘ └───────────────┘            │
│  ┌───────────────────────────────────────────────────┐            │
│  │ (expanded) これは何ですか？  ▶                      │            │
│  │            What is this?                           │            │
│  └───────────────────────────────────────────────────┘            │
│                       [ 加载更多 ]                               │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Deck selector

- Options: each of the user's **active decks** (from `GET /decks/settings`), then a divider and **"全部已选词库 /
  All active decks"** (aggregate). A second group, "其他词库 / Other decks", lists decks that are not active but
  have at least one learned word, so progress from previously studied decks is not hidden.
- Default: `?deck=` from the URL if present; else the first active deck in `sortDecks` order; else "All active
  decks" when the user has more than one active deck and no URL param.
- The choice is kept in the URL (`/words?deck=<id>|all&status=learning&level=1,2&q=...`) so the view is shareable
  and survives refresh. The last choice is also remembered in `localStorage` (try/catch, per §convenience only).
- Deck names are shown through `deckTitle()` as on the Decks page.

### 4.4 Three-colour progress bar

- One horizontal bar, full width, 10px tall, rounded, three segments left to right:

  | Segment | Colour token | Hex |
  |---|---|---|
  | Mastered | brand dark | `#B05030` |
  | Learning | brand primary | `#D97757` |
  | Not started | overlay, 1px border `#E6E6E3` | `#F2F0EF` |

- Headline above: 「已学 {learned} / {total} 词」 and the learned percentage on the right.
- Legend below with counts **and** percentages, so the bar never relies on colour alone (a11y).
- Hover / tap on the Learning segment or legend shows the per-level breakdown (L1 n, L2 n, L3 n, L4 n) in a tooltip.
- Widths: `mastered/total`, `learning/total`; a non-zero segment gets at least 2px so it stays visible. Percentages
  are rounded to one decimal; the bar uses raw ratios so segments always sum to 100%.
- `role="img"` with `aria-label` "已掌握 320，学习中 292，未学习 888，共 1500".
- Animates width from 0 on first load (300ms ease-out), no animation on deck switch to avoid jitter.

### 4.5 Status tabs and filters

- Tabs: **全部 / All learned**, **学习中 / Learning**, **已掌握 / Mastered**, each with its count from the
  progress response (no extra request). Default tab: Learning (the actionable one).
- Level chips (1–4) appear only on the Learning tab; multi-select; none selected = all four.
- Search box: debounced 300ms, **fuzzy** (see §5.2 "Fuzzy search"): the learner can type kanji, hiragana,
  katakana, romaji or a word from the meaning, and small typos in the meaning still match. Best matches first;
  while a query is active the sort menu shows 「最相关 / Best match」 and the other sorts stay available.
- Sort menu:
  - 最近复习 / Recently reviewed (default, `last_reviewed_at desc`)
  - 即将复习 / Due soonest (`next_review_at asc`)
  - 熟练度 低→高 / Level low→high
  - 最早学习 / First learned (`first_seen_at asc`)
  - 错误最多 / Most lapses (`lapses_count desc`)
- Changing deck, tab, level, search or sort resets the list to page 1.

### 4.6 Scope notice

A one-line notice sits between the filters and the list, so the learner always knows what list they are looking at
(and therefore what an export will contain):

- 「ⓘ 当前词库「{deckTitle}」· {tab} · {n} 个单词」; with level chips: 「· 等级 1、2」; with search: 「· 搜索“{q}”」.
- For "All active decks": 「ⓘ 全部已选词库（3 个）· …」.
- `text-[#888]`, 13px, `aria-live="polite"` so screen readers hear the change after filtering.

### 4.7 Compact word cards

The list is a responsive grid of compact word cards (3 columns ≥ 1024px, 2 columns ≥ 640px, 1 column on phones),
built for scanning keywords quickly:

- **Collapsed card** (fixed height, about 112px):
  - top line: reading (12px, `#888`) on the left, five level dots on the right (same visual language as
    `ProficiencyIndicator`; Mastered dots in `#B05030`, Learning dots in `#D97757`);
  - the **word** (Noto Serif JP, 28px, `#2A2A29`): the dominant element;
  - the **meaning** in small text (13px, `#888`, one line, ellipsis);
  - footer: relative time (Learning → 「3 天前复习」 / 「2 分钟后复习」; Mastered → 「已掌握 · 下次 12月18日」) and a
    ⌄ chevron.
- **Expanded area** (folded by default): click the card, press Enter/Space or click the chevron. The card spans the
  full grid row and slides open (200ms height + fade) to show:
  - example sentence with furigana (reuse the `Flashcard` furigana rendering), target word highlighted in terracotta;
  - sentence translation;
  - ▶ word audio, ▶ sentence audio;
  - a small stats line: 首次学习 10月2日 · 复习 9 次 · 正确率 67% · 遗忘 2 次.
- Only one card is expanded at a time; opening another closes the first. Esc closes it.
- `aria-expanded` on the card button, `aria-controls` on the panel.
- Pagination: 「加载更多 / Load more」, 50 per page via `offset`; shows 「已显示 100 / 292」.
- Mobile (<640px): single column; deck selector and export collapse into a header row with export as an icon
  button; level chips scroll horizontally.

### 4.8 Export CSV

The list and the export share one scope model; the export lets the learner choose, and always says what it covers.

- Button 「导出 CSV」 in the header row, secondary style (outlined terracotta). Clicking opens a small popover
  (not a modal):

  ```
  ┌ 导出单词 ───────────────────────────────┐
  │ ◉ 当前列表   JLPT N4+N5 · 学习中 · 292 词 │
  │ ○ 当前词库全部已学   JLPT N4+N5 · 612 词  │
  │ ○ 全部词库全部已学   1,204 词             │
  │                                         │
  │ 文件包含：单词、读音、释义、例句、熟练度、 │
  │ 复习记录等 17 列，UTF-8 CSV               │
  │                        [ 取消 ] [ 导出 ]  │
  └─────────────────────────────────────────┘
  ```

  - Default: **当前列表** = current deck selection × tab × level filter × search, all pages (no pagination).
  - **当前词库全部已学** = current deck selection, status `all`, no level filter, no search.
  - **全部词库全部已学** = every deck the user has learned words in (active or not), status `all`.
  - Counts per option come from the progress response (current deck / all decks) and the list `total` (current
    list), so opening the popover makes no request. An option with 0 words is disabled.
- 导出 → button shows a spinner and is disabled → file downloads → toast 「已导出 292 个单词」.
- Error → toast 「导出失败，请重试」, button re-enabled.
- The filename names the scope: `dabia-words-jlpt-n4-n5-learning-20261119.csv`,
  `dabia-words-all-decks-20261119.csv`.

### 4.9 Empty, loading and signed-out states

| Situation | Behaviour |
|---|---|
| Loading | skeleton bar + 6 skeleton rows (same pulse style as `SkeletonFlashcard`) |
| No active decks | message 「还没有选择词库」 + button to `/decks` |
| Deck selected but 0 learned words | bar shows 100% Not started; list empty state 「还没有开始学习这个词库」 + 「开始学习」 to `/` |
| Tab empty (e.g. no mastered yet) | 「还没有掌握的单词，继续加油」 |
| Search no match | 「没有找到匹配的单词」 + clear search link |
| Signed out (demo user) | page renders the demo user's data read-only like the rest of demo mode; **export is replaced by** 「登录后导出」, which opens the login modal |

### 4.10 i18n

All strings go into `frontend/src/i18n/messages/{zh,en}.ts` under a new `words` namespace; the meaning column and
sentence translation follow the current content language (`setContentLanguage` / `lang`), as cards do today.

### 4.11 Profile word garden refresh

Same concept (a calm field of floating words on the profile page), made more refined and lively, with no word ever
hidden behind the title or cut off by the card edge.

**Problems in the current implementation** (`pages/Profile.tsx`, `index.css`):

| # | Problem | Cause |
|---|---|---|
| 1 | Words overlap the title and legend | The header is `absolute` over the canvas; only grid cell (0,0) is skipped, but the legend is ~240px wide and runs into cell (0,1), especially on phones |
| 2 | Words cut off at left/right edges | Centres are clamped to 10–90%, then `translate(-50%)` pushes half the word box (up to ~100px) past the edge, and `overflow-hidden` clips it |
| 3 | Bottom words faded out | The `h-20` white gradient covers the bottom row (centres go down to 90% of 320px) |
| 4 | Hover does nothing | Inline `opacity: 0.5` overrides `hover:opacity-100` |
| 5 | Layout and float speed change on every re-render | `Math.random()` is called during render |
| 6 | Mechanical motion | Every word runs the same 8px vertical bob, all starting in phase |
| 7 | Reading shown as `uppercase tracking-[0.2em]` | The field is named `romaji` but holds kana; the styling is for Latin text |
| 8 | Threshold mismatch | Backend splits at level 4, not 5 |

**Layout**

- The header (「单词花园」 + legend) goes back into normal flow at the top of the card. The canvas is a separate
  block below it with 24px inner padding, so the title and the words never share space.
- Header right side: legend chips 「● 学习中」 (terracotta) 「● 已掌握」 (warm gray) and a link 「查看全部 →」 to
  `/words`.
- Canvas height: 300px desktop, 260px phone. Card size unchanged otherwise.
- Placement runs on the real canvas size (`ResizeObserver`), in pixels, not percentages:
  1. Estimate each word's box from its font size and character count (CJK ≈ 1em per char, plus the reading line).
  2. Place words largest first by best-candidate sampling: try ~30 seeded candidate points inside the **safe
     rectangle** (canvas inset by half the box size + 8px float margin) and keep the one farthest from already
     placed boxes. Reject candidates whose boxes overlap (with 12px gap).
  3. If a word cannot be placed without overlap, drop it (better fewer words than collisions).
  - Because every box is kept inside the safe rectangle, nothing touches an edge even at the top of its float.
- Seeded PRNG (hash of the card IDs + today's date): layout is stable across re-renders and during a day, and
  changes from day to day for a fresh look. Re-layout only on resize (debounced 150ms) or new data.
- Remove the bottom white gradient. Use a soft decorative background instead (see Visual).
- Word count: up to 12 on desktop, 8 on phones (fewer when the placement drops some).

**Visual**

- Learning words: terracotta, colour by level using the existing heatmap ramp, so weaker words are warmer and
  stronger: L1 `#B05030`, L2 `#D97757`, L3 `#E09074`, L4 `#E5A087`. Size 20–30px, larger for lower levels (the
  words that need you most stand out).
- Mastered words: soft charcoal `#2A2A29` at 55% opacity, 18–22px, Noto Serif JP light. Calm, "settled" words.
- Reading under each word: 10px, `#999`, normal letter-spacing, no uppercase; shown for learning words, hidden for
  mastered words until hover, to keep the field airy.
- Background: two very soft, blurred radial blobs (`#F2DCD6` at 35% and `#F2F0EF`) placed with the same seed, plus
  a faint 1px dotted texture (`#E6E6E3`, 16px grid) for a paper feel. Purely decorative, `aria-hidden`.

**Motion**

- Entrance: words fade in and rise 8px, staggered 50ms, ease-out 400ms.
- Idle drift: each word floats on its own slow path, a 2D loop of 4–7px with ±1.5° rotation, 6–11s period, with a
  seeded negative `animation-delay` so they never move in step. Implemented with CSS custom properties per word
  (`--dx`, `--dy`, `--rot`, `--dur`, `--delay`) on an **inner** span, so the outer element keeps its position
  transform. (Today's keyframes re-declare `translate(-50%, -50%)`, which couples position and animation.)
- Hover / focus on a word: it lifts (scale 1.08, shadow-free), its float pauses, the other words dim to 50%, and a
  small tooltip shows reading and meaning. Click → `/words?q=<word>`.
- Words are focusable buttons (`tabindex=0`, aria-label "食べる，学习中，等级 3").
- `prefers-reduced-motion: reduce`: no drift and no entrance motion; hover only changes colour.

**Data** (§5.6): the garden needs `card_id`, `level` and `hint`; the frontend renames `romaji` to `reading`.

## 5. Backend API

New router `backend/dabia/api/v1/words.py`, mounted at `/api/v1/words`, tag `Words`. All three endpoints are
synchronous SQLAlchemy like the rest of the API and filter strictly by `current_user_id`.

### 5.1 `GET /api/v1/words/progress`

Progress counts per deck, plus an aggregate.

**Query**

| Param | Type | Default | Notes |
|---|---|---|---|
| `deck_id` | UUID, repeatable | the user's active decks | Unknown IDs are ignored |
| `include_studied` | bool | `false` | Also return non-active decks that have ≥1 learned word (for the selector's "Other decks" group) |

**Response** `WordsProgressResponse`

```json
{
  "decks": [
    {
      "deck_id": "73d6cb04-617c-433b-9af7-7cf73304f0cd",
      "name": "eggrolls-JLPT10k-v3::1-N4+N5",
      "is_active": true,
      "total": 1500,
      "mastered": 320,
      "learning": 292,
      "not_started": 888,
      "learning_by_level": { "1": 40, "2": 61, "3": 88, "4": 103 }
    }
  ],
  "aggregate": {
    "total": 1500, "mastered": 320, "learning": 292, "not_started": 888,
    "learning_by_level": { "1": 40, "2": 61, "3": 88, "4": 103 }
  }
}
```

**Query plan**: two grouped queries, no per-deck loop.

```sql
-- totals
SELECT deck_id, count(*) FROM cards WHERE deck_id = ANY(:deck_ids) GROUP BY deck_id;
-- user progress
SELECT c.deck_id, uca.proficiency_level, count(*)
FROM user_card_associations uca JOIN cards c ON c.id = uca.card_id
WHERE uca.user_id = :uid AND c.deck_id = ANY(:deck_ids)
GROUP BY c.deck_id, uca.proficiency_level;
```

### 5.2 `GET /api/v1/words`

Paginated list of learned words.

**Query**

| Param | Type | Default | Notes |
|---|---|---|---|
| `deck_id` | UUID, repeatable | active decks | Same rule as progress |
| `all_decks` | bool | `false` | Every deck the user has learned words in; overrides `deck_id` (export option 3) |
| `status` | `all` \| `learning` \| `mastered` | `all` | |
| `level` | int 1–4, repeatable | — | Only valid with `status=learning`; otherwise `422` |
| `q` | string ≤ 64 chars | — | Fuzzy search, see below |
| `sort` | `relevance` \| `last_reviewed` \| `next_review` \| `level` \| `first_seen` \| `lapses` | `relevance` when `q` is set, else `last_reviewed` | `relevance` without `q` → `422` |
| `order` | `asc` \| `desc` | per sort (see §4.5) | Ties broken by `card_id` for stable paging |
| `limit` | int 1–100 | 50 | |
| `offset` | int ≥ 0 | 0 | |
| `lang` | BCP 47 | — | Same fallback as card endpoints |

**Response** `WordsListResponse`

```json
{
  "total": 292,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "card_id": "f6e5d4c3-b2a1-4f5e-8d9c-1a2b3c4d5e6f",
      "deck": { "id": "73d6cb04-...", "name": "eggrolls-JLPT10k-v3::1-N4+N5" },
      "word": "何",
      "reading": "なに",
      "hint": "What?",
      "sentence": "これは何ですか？",
      "sentence_furigana": "これ[これ]は[は]何[なに]ですか[ですか]？",
      "sentence_translation": "What is this?",
      "audio_url": "https://<r2-public-url>/medias/002.mp3",
      "sentence_audio_url": "https://<r2-public-url>/medias/sentence_002.mp3",
      "language": "en",
      "proficiency_level": 2,
      "status": "learning",
      "first_seen_at": "2026-10-02T08:14:00Z",
      "last_reviewed_at": "2026-11-16T12:01:33Z",
      "next_review_at": "2026-11-16T12:03:03Z",
      "review_count": 9,
      "correct_count": 6,
      "accuracy": 66.7,
      "lapses_count": 2
    }
  ]
}
```

Implementation notes:

- `first_seen_at` = `user_card_associations.created_at`. All timestamps are naive UTC in the DB; serialize with a
  `Z` suffix.
- `review_count` / `correct_count` come from a `review_logs` aggregate **restricted to the page's card IDs**
  (`WHERE user_id = :uid AND card_id = ANY(:page_ids) GROUP BY card_id`), never a full-history scan per request.
- Localization: add `localize_many(db, cards, lang)` in `core/i18n.py` that loads `card_translations` for all page
  card IDs in one query and applies `language_chain` per card. Calling `localize()` per row would be N+1.
- Media URLs go through `core/storage.py` as in `cards.py`.

**Fuzzy search** (`core/word_search.py`):

1. *Normalize the query*: NFKC, trim, lowercase, katakana → hiragana. If the query is Latin letters, also build a
   kana form with a small romaji → hiragana table (Hepburn and Kunrei spellings, `nn`/`n'`, small `tsu` from
   doubled consonants), e.g. `taberu` → `たべる`. Latin queries are tried against the meaning **and**, as kana,
   against the reading.
2. *Candidates*: only the user's learned words in the requested decks (≤ ~10k rows for the heaviest user), so the
   search never touches the full card table.
3. *Score* each candidate, keep score > 0, order by score then the secondary sort:

   | Match | Score |
   |---|---|
   | word or reading equals the query | 100 |
   | word or reading starts with the query | 80 |
   | word, reading or meaning contains the query | 60 |
   | trigram similarity on the meaning (typo tolerance, threshold 0.3) | 50 × similarity |

4. *Engine*: Postgres `pg_trgm` (`word_similarity`) through a new Alembic migration
   (`CREATE EXTENSION IF NOT EXISTS pg_trgm`). Readings are compared after
   `translate(reading, <katakana>, <hiragana>)`. **To verify in PR 2**: whether the managed PROD/STG database
   allows the extension (`SELECT * FROM pg_available_extensions WHERE name = 'pg_trgm'`). If it does not, the same
   scoring runs in Python over the candidate rows (`rapidfuzz` for the similarity), which stays well under 100ms
   at 10k rows. The API contract does not change either way.
5. The localized meaning used for matching is the one served (same `language_chain` fallback).

### 5.3 `GET /api/v1/words/export`

Same filters as `/words` (`deck_id`, `all_decks`, `status`, `level`, `q`, `sort`, `order`, `lang`); no
`limit`/`offset`. The three popover options in §4.8 map to: current filters as-is / `deck_id=… status=all` /
`all_decks=true status=all`. The list and the export call the same query builder, so the exported rows are
exactly the rows the list would show.

- **Auth**: requires a real signed-in user. Requests without a token (demo user) get `401` with
  `{"detail": "Sign in to export"}`.
- **Response**: `200`, `Content-Type: text/csv; charset=utf-8`,
  `Content-Disposition: attachment; filename="dabia-words-20261119.csv"; filename*=UTF-8''dabia-words-<deck>-20261119.csv`.
- Body starts with a UTF-8 BOM so Excel opens Japanese correctly; CRLF line endings; RFC 4180 quoting via Python's
  `csv` module.
- **CSV injection guard**: any cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`.
- Built with `StreamingResponse` from a generator that pages through the query 500 rows at a time.
- Add `Content-Disposition` to `expose_headers` in `main.py` so the frontend can read the filename.

**Columns** (header row in English, stable names for scripts):

| Column | Example | Source |
|---|---|---|
| `word` | 何 | `cards.target_word` |
| `reading` | なに | `cards.reading` |
| `meaning` | What? | localized hint |
| `meaning_language` | en | language served |
| `status` | learning | derived |
| `level` | 2 | `proficiency_level` |
| `deck` | eggrolls-JLPT10k-v3::1-N4+N5 | `decks.name` |
| `sentence` | これは何ですか？ | `cards.sentence` |
| `sentence_translation` | What is this? | localized |
| `first_seen_at` | 2026-10-02T08:14:00Z | association `created_at` |
| `last_reviewed_at` | 2026-11-16T12:01:33Z | association |
| `next_review_at` | 2026-11-16T12:03:03Z | association |
| `review_count` | 9 | `review_logs` |
| `correct_count` | 6 | `review_logs` |
| `accuracy` | 66.7 | derived, percent |
| `lapses` | 2 | `lapses_count` |
| `card_id` | f6e5d4c3-… | for joining exports over time |

Audio URLs and furigana markup are left out to keep the file small and readable.

### 5.4 Schemas, docs and indexes

- Pydantic models in `backend/dabia/schemas/words.py`.
- Update `.ai/api-design.md` (index table + one section per endpoint) in the same PR as each endpoint.
- Indexes: `user_card_associations` PK is `(user_id, card_id)`, so the user filter is covered. `review_logs` has
  separate `user_id` and `card_id` indexes; add a composite `(user_id, card_id)` index via a **new** Alembic
  migration only if `EXPLAIN ANALYZE` on PROD-sized data shows the per-page aggregate over ~20ms.

### 5.5 Frontend API client

In `frontend/src/services/api.ts`:

```ts
getWordsProgress(params: { deckIds?: string[]; includeStudied?: boolean }): Promise<WordsProgressResponse>
getWords(params: WordsQuery): Promise<WordsListResponse>
exportWords(params: Omit<WordsQuery, 'limit' | 'offset'>): Promise<void>
```

`exportWords` calls the endpoint through the existing axios instance (so the Bearer token and `X-Refresh-Token`
handling apply) with `responseType: 'blob'`, reads the filename from `Content-Disposition`, then downloads via
`URL.createObjectURL` + a temporary `<a download>`, and revokes the URL. A plain `<a href>` cannot send the
Authorization header, so it is not used.

### 5.6 `GET /api/v1/profile/garden` (changed)

- Threshold aligned: `type: "review"` for levels 1–4, `type: "learned"` for level 5.
- Selection is no longer arbitrary (`.limit(10)` with no order): up to 8 learning words, ordered by
  `next_review_at asc` (the ones due soonest), and up to 6 mastered words, ordered by `last_reviewed_at desc`.
- Response gains fields; `romaji` is kept for one release as an alias of `reading`, then removed:

```json
[{ "card_id": "…", "text": "花", "reading": "はな", "romaji": "はな", "hint": "flower", "level": 5, "type": "learned" }]
```

- Query parameter `lang` for `hint`, same fallback as card endpoints (via `localize_many`).
- Fix the stale comment on `UserCardAssociation.proficiency_level` (0 = no row, 1–5 as in §2).
- Update the garden section of `.ai/api-design.md`.

## 6. Frontend structure

| File | Purpose |
|---|---|
| `pages/MyWords.tsx` | Page: reads URL params, owns filters, loads progress + list |
| `components/words/DeckProgressBar.tsx` | Three-colour bar; also used at 4px on the Decks page |
| `components/words/WordGrid.tsx`, `WordCard.tsx` | Compact card grid, single expanded card, audio |
| `components/words/ScopeNotice.tsx` | The "当前词库 … · n 个单词" line |
| `components/words/ExportButton.tsx` | Export popover (3 scopes), download flow and states |
| `components/garden/WordGarden.tsx` | Garden card: header, canvas, words, tooltip |
| `utils/gardenLayout.ts` | Pure function: (canvas size, words, seed) → positions; seeded PRNG, best-candidate placement |
| `hooks/useWordsQuery.ts` | Fetch, paging, debounced search, stale-response guard (ignore responses for an older query) |
| `App.tsx`, `AppHeader.tsx` | Route and nav item |
| `i18n/messages/{zh,en}.ts` | `words` namespace, `nav.words` |

## 7. Testing (TDD, per `.ai/rules.md`)

Backend (`pytest`):

- progress: counts per level and per deck; `not_started = total − learned`; aggregate equals the sum; default to
  active decks; unknown deck IDs ignored; `include_studied` returns a non-active deck with history.
- isolation: another user's associations never appear in counts, list or export.
- list: each `status`; `level` filter and `422` when combined with `status!=learning`; `all_decks`; each sort is
  stable across pages; `total` matches the filter; `review_count`/`accuracy` correct; `lang` fallback field by field.
- fuzzy search (unit tests on `word_search.py` + API tests): kanji `食`, hiragana `たべ`, katakana `タベル`, romaji
  `taberu`, meaning `eat`, typo `flowr` → `flower`; exact beats prefix beats substring; no match → empty list;
  `relevance` without `q` → `422`.
- export: `401` for the demo user; BOM present; header row exact; Japanese round-trips; injection guard on a hint
  like `=HYPERLINK(...)`; each of the three scopes returns exactly the rows the list returns for the same params;
  more than one internal page (>500 rows) streamed completely.
- garden: level 4 is `review`, level 5 is `learned`; ordering and limits; new fields present; `romaji` alias.

Frontend (`vitest` + Testing Library):

- `DeckProgressBar`: widths for typical, all-zero and 100%-mastered inputs; min 2px rule; aria-label text.
- `MyWords`: default tab and deck; URL params drive the initial state; changing tab resets paging; empty states.
- `WordCard`: collapsed shows word, reading, meaning, no sentence; expand shows sentence and translation; only one
  open at a time; Esc closes; aria attributes.
- `ScopeNotice`: text for single deck, all decks, level filter and search.
- `ExportButton`: popover lists three scopes with counts; default is current list; each option sends the mapped
  params; zero-count option disabled; error toast; signed-out shows the login prompt.
- `gardenLayout`: for 100 random seeds and canvas sizes 320–900px wide, every box lies inside the safe rectangle
  and no two boxes overlap; same seed → same layout; drops words rather than overlapping.
- `WordGarden`: header is not absolutely positioned over the canvas; reduced-motion disables drift; click navigates
  to `/words?q=…`.

Coverage must stay ≥ 80%; `bash scripts/test.sh` and `npm run lint && npx tsc -b` green before each PR.

## 8. Delivery plan (one feature per branch/PR, each from `master`)

| PR | Branch | Contents | Done when |
|---|---|---|---|
| 1 | `feat/words-progress` | `/words/progress` API, `DeckProgressBar`, `/words` route + nav with the bar and deck selector only | Bar matches a hand-run SQL count on STG for a real user |
| 2 | `feat/words-list` | `/words` list API, `localize_many`, fuzzy search (+ `pg_trgm` migration if allowed), tabs/filters/sort, scope notice, compact card grid | Browsing, search, paging and audio work on the Vercel preview |
| 3 | `feat/words-export` | `/words/export`, CORS header, export popover | CSV of each scope from preview opens correctly in Excel/Numbers and `pandas.read_csv` |
| 4 | `feat/garden-refresh` | Garden API change (§5.6), `gardenLayout`, `WordGarden` redesign | No overlap or clipping at 320/390/768/1280px widths on preview (screenshots in PR) |
| 5 (optional) | `feat/deck-card-progress` | 4px bar + "View words" link on Decks page | Visual check on preview |

PR 4 does not depend on PRs 1–3 and can run in parallel. No data import or R2 change is involved; the only possible
migrations are the `pg_trgm` extension (PR 2) and the optional index in §5.4.

**Work split (Claude + agy)**: Claude owns this spec, the API contracts, the query builder and fuzzy-search
scoring, the garden layout algorithm, test acceptance, review, and PR/deploy verification. Well-scoped execution goes
to agy (Gemini, via `agy-delegate`) with a written task per item, each checked by Claude before commit:

| Delegated to agy | Input it gets | Claude's check |
|---|---|---|
| zh/en i18n strings for `words` and garden | §4 copy table | wording review in both languages |
| `DeckProgressBar`, `ScopeNotice`, `WordCard`, `WordGrid`, export popover UI | §4.4–4.8 + existing component style | tests from §7 green, visual check on preview |
| `WordGarden` styling and motion (CSS variables, keyframes, reduced motion) | §4.11 Visual/Motion, Claude's `gardenLayout` | screenshots at four widths |
| Bulk test cases from §7 (fixtures, parametrized cases) | §7 lists | tests fail before / pass after the feature, coverage ≥ 80% |
| `.ai/api-design.md` sections | final endpoint code | diff review against the code |

## 9. Future work (not in this spec)

- "Practise these" button: start a session restricted to the filtered words (e.g. all level-1 words).
- Progress over time (mastered count per week) on the Profile page.
- JSON / Anki export.

## 10. Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| Vercel Python function response limit (~4.5 MB) for very large exports | Export of "all decks" for a heavy user could fail | 10k rows × ~250 B ≈ 2.5 MB fits today; measure on STG with a seeded 10k-word user; if close, drop the sentence columns from "all decks" exports or move export to a background job writing to R2 |
| List query slow on large histories | Laggy page | Page-scoped aggregates, `localize_many`, `EXPLAIN ANALYZE` on PROD-sized data |
| `pg_trgm` not allowed on the managed DB | Typo tolerance needs another engine | Python scoring fallback (§5.2), same API |
| Garden layout drops words on very narrow screens | Fewer words on phones | Accepted: 8-word cap on phones, collisions never allowed |
| Demo user data is shared by all signed-out visitors | Signed-out list shows other visitors' progress | Read-only and same as other demo pages today; export blocked |

### Decisions (Eric, 2026-11-19, review round 1)

1. Nav: a new top-level **单词本** tab at `/words`.
2. List: compact word cards: word prominent, meaning in small text, example sentence in the folded area; fuzzy
   search. List and export share one scope; the page always states the current scope, and the export lets the
   learner choose between current list / current deck / all decks (§4.6, §4.8).
3. Level 4 counts as **Learning**; only level 5 is Mastered.
4. Align the profile garden to the same definition, and refresh its visuals in the same direction: more refined
   and lively, never hidden by the title or the card edge (§4.11, §5.6).

Open questions: none blocking. Next decision point is the `pg_trgm` check at the start of PR 2.
