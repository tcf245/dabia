# Data Import Script Guide

This document provides instructions on how to use the `import_data.py` script to bulk-import card data into the database from a custom CSV file format.

## Overview

The script is designed to be robust and safe to run multiple times. Its key features include:

- **Idempotency**: The script uses a unique identifier for each card to prevent creating duplicate entries. If you run the script again with the same data, it will skip cards that are already in the database.
- **Chunking**: Data is inserted in small chunks (e.g., 500 rows at a time) to avoid long database transactions and high memory usage.
- **Dynamic Deck Creation**: The script automatically finds or creates decks based on the data in the CSV file. It sanitizes the deck names to ensure they are clean and consistent.
- **Configurable Database**: You can target a local or production database by passing a command-line argument.

## CSV File Format

The script expects a specific, header-less CSV format derived from an Anki export.

### Metadata

The script will automatically skip any lines at the beginning of the file that start with a `#` character.

### Column Mapping

The script reads data by its column position (index). The following columns are required:

| Column Index | Expected Content         | Example                                      | Notes                                                                   |
|--------------|--------------------------|----------------------------------------------|-------------------------------------------------------------------------|
| 1 (row[0])   | Raw Deck Name            | `deck-name:N2`                               | The script sanitizes this to `project-name::3-N2`.                      |
| 2 (row[1])   | Unique ID (GUID)         | `46b95078-a0bb-11ef-9eca-75d1f1bae144`       | **Crucial for preventing duplicates.**                                  |
| 3 (row[2])   | Target Word              | `丸`                                         |                                                                         |
| 6 (row[5])   | Reading (Furigana)       | `まる`                                       |                                                                         |
| 7 (row[6])   | Gloss / Hint             | `圆，圆形；句号`                             |                                                                         |
| 9 (row[8])   | Word Audio               | `[sound:丸_マル━_0_...mp3]`                  | The script extracts the filename.                                       |
| 12 (row[11]) | Example Sentence Template| `答えに__をつける`                           | Generated cloze rows can put `__` here. Legacy full sentences are still supported. |
| 13 (row[12]) | Full Sentence / Furigana | `答[こた]えに<b> 丸[まる]</b>をつける`       | For generated cloze rows, this should preserve the full display sentence. |
| 14 (row[13]) | Sentence Translation     | `在答案上画圈`                               |                                                                         |
| 16 (row[15]) | Sentence Audio           | `[sound:voicepeak-ad60...mp3]`               | The script extracts the filename.                                       |

**Note**: The script preserves `row[11]` when it already contains `__`. For legacy rows without a cloze marker, it still generates `sentence_template` by replacing the target word in the sentence with `__`.

## N2 Grammar Deck

Generate the N2 grammar deck CSV from the local wiki source:

```bash
python3 backend/scripts/generate_n2_grammar_deck.py \
  "/Users/eric/Library/Mobile Documents/iCloud~md~obsidian/Documents/LLM-Wiki/raw/assets/Japanese N2 grammar.md" \
  backend/data/jlpt_n2_grammar_deck.csv
```

The generator uses the bolded grammar span inside each wiki example as the target answer. This keeps `target_word` usable for review, for example `っぽい` instead of `～っぽい`, and writes a single `__` cloze into `row[11]`.

## Sentence Audio Generation

Use `generate_sentence_audio.py` to fill missing `row[15]` sentence audio paths and generate media files.

Recommended low-cost options:

- `edge-tts`: best practical default for Japanese quality and cost. Install with `pipx install edge-tts` or `uv tool install edge-tts`. It uses Microsoft neural voices, so it is not fully offline.
- `VOICEVOX`: local/offline Japanese TTS via its local engine API. It is free and easy to run locally, but voices can sound more character/anime-like.

Ollama is not a TTS runtime, so it cannot directly generate audio. It can help clean text or annotate rows, but the audio still needs a TTS engine such as `edge-tts`, VOICEVOX, Style-Bert-VITS2, MeloTTS, or Piper.

Dry-run the first few rows:

```bash
python3 backend/scripts/generate_sentence_audio.py \
  --csv backend/data/jlpt_n2_grammar_deck.csv \
  --limit 3 \
  --dry-run
```

Generate MP3 audio with `edge-tts`:

```bash
python3 backend/scripts/generate_sentence_audio.py \
  --csv backend/data/jlpt_n2_grammar_deck.csv \
  --provider edge-tts \
  --voice ja-JP-NanamiNeural
```

Generate WAV audio with local VOICEVOX after starting the VOICEVOX engine on port 50021:

```bash
python3 backend/scripts/generate_sentence_audio.py \
  --csv backend/data/jlpt_n2_grammar_deck.csv \
  --provider voicevox \
  --speaker 3
```

## Usage

Run the script from the project's root directory (`dabia/`).

### Command Template

```bash
python backend/scripts/import_data.py <path_to_your_csv> [--db-url <your_database_url>]
```

### Arguments

- `<path_to_your_csv>`: (Required) The absolute path to the `.csv` file you want to import.
- `--db-url <your_database_url>`: (Optional) The full connection URL for the target database. If omitted, the script will use the `DATABASE_URL` from the `backend/.env` file (typically the local database).

### Example 1: Importing to the Local Database

This command uses the default database configured in your `.env` file.

```bash
python backend/scripts/import_data.py /path/to/your/notes.csv
```

### Example 2: Importing to a Production Database

This command overrides the `.env` file and connects to a specific production database.

**Note**: Replace the placeholder URL with your actual production database credentials.

```bash
python backend/scripts/import_data.py /path/to/your/notes.csv --db-url "postgresql://user:password@prod-host:5432/prod_dbname"
```
