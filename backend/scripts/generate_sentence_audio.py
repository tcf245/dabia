#!/usr/bin/env python3
"""Generate missing sentence audio for Dabia import CSV rows."""

from __future__ import annotations

import argparse
import csv
import subprocess
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


DEFAULT_CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "jlpt_n2_grammar_deck.csv"
DEFAULT_AUDIO_DIR = Path(__file__).resolve().parents[1] / "static" / "audio" / "jlpt_n2_grammar" / "sentences"
DEFAULT_RELATIVE_PREFIX = "jlpt_n2_grammar"
DEFAULT_EDGE_VOICE = "ja-JP-NanamiNeural"
DEFAULT_VOICEVOX_URL = "http://127.0.0.1:50021"
DEFAULT_VOICEVOX_SPEAKER = 3


@dataclass(frozen=True)
class AudioJob:
    guid: str
    text: str
    output_path: Path
    relative_path: str


def sentence_text_from_row(row: list[str]) -> str:
    """Return the full Japanese sentence from a 16-column import row."""
    full_sentence = row[12].strip() if len(row) > 12 else ""
    if full_sentence:
        return full_sentence

    template = row[11].strip() if len(row) > 11 else ""
    word = row[2].strip() if len(row) > 2 else ""
    return template.replace("__", word)


def edge_tts_synthesizer(voice: str, rate: str) -> Callable[[str, Path], None]:
    def synthesize(text: str, output_path: Path) -> None:
        command = [
            "edge-tts",
            "--voice",
            voice,
            "--text",
            text,
            "--write-media",
            str(output_path),
        ]
        if rate:
            command.extend(["--rate", rate])
        subprocess.run(command, check=True)

    return synthesize


def voicevox_synthesizer(base_url: str, speaker: int) -> Callable[[str, Path], None]:
    base = base_url.rstrip("/")

    def synthesize(text: str, output_path: Path) -> None:
        encoded_text = urllib.parse.quote(text)
        query_url = f"{base}/audio_query?text={encoded_text}&speaker={speaker}"
        synthesis_url = f"{base}/synthesis?speaker={speaker}"

        with urllib.request.urlopen(urllib.request.Request(query_url, method="POST")) as response:
            query_json = response.read()

        request = urllib.request.Request(
            synthesis_url,
            data=query_json,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request) as response:
            output_path.write_bytes(response.read())

    return synthesize


def read_csv_records(csv_path: Path) -> list[str | list[str]]:
    records: list[str | list[str]] = []
    for line in csv_path.read_text(encoding="utf-8").splitlines():
        if not line:
            records.append(line)
            continue
        if line.startswith("#"):
            records.append(line)
            continue
        records.extend(csv.reader([line]))
    return records


def write_csv_records(csv_path: Path, records: list[str | list[str]]) -> None:
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        for record in records:
            if isinstance(record, str):
                handle.write(record + "\n")
            else:
                writer.writerow(record)


def fill_missing_sentence_audio(
    csv_path: Path,
    output_dir: Path,
    relative_prefix: str,
    synthesize: Callable[[str, Path], None],
    *,
    extension: str = "mp3",
    limit: int | None = None,
    write_csv: bool = True,
) -> list[AudioJob]:
    records = read_csv_records(csv_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    jobs: list[AudioJob] = []

    for record in records:
        if not isinstance(record, list) or len(record) < 16:
            continue
        if record[15].strip():
            continue

        guid = record[1].strip()
        text = sentence_text_from_row(record)
        if not guid or not text:
            continue

        output_path = output_dir / f"{guid}.{extension}"
        relative_path = f"{relative_prefix.rstrip('/')}/{output_path.name}"
        synthesize(text, output_path)
        record[15] = relative_path
        jobs.append(AudioJob(guid=guid, text=text, output_path=output_path, relative_path=relative_path))

        if limit is not None and len(jobs) >= limit:
            break

    if write_csv and jobs:
        write_csv_records(csv_path, records)

    return jobs


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate missing sentence audio for Dabia import CSV rows.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV_PATH, help="Import CSV to update in place.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_AUDIO_DIR, help="Directory for generated audio files.")
    parser.add_argument("--relative-prefix", default=DEFAULT_RELATIVE_PREFIX, help="Path stored in sentence_audio_url.")
    parser.add_argument("--provider", choices=["edge-tts", "voicevox"], default="edge-tts")
    parser.add_argument("--voice", default=DEFAULT_EDGE_VOICE, help="edge-tts voice name.")
    parser.add_argument("--rate", default="+0%", help="edge-tts speaking rate, for example +0% or -10%.")
    parser.add_argument("--voicevox-url", default=DEFAULT_VOICEVOX_URL, help="VOICEVOX engine URL.")
    parser.add_argument("--speaker", type=int, default=DEFAULT_VOICEVOX_SPEAKER, help="VOICEVOX speaker id.")
    parser.add_argument("--limit", type=int, help="Generate only the first N missing rows.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned jobs without writing files or CSV.")
    args = parser.parse_args()

    extension = "wav" if args.provider == "voicevox" else "mp3"

    if args.dry_run:
        def synthesize(text: str, output_path: Path) -> None:
            print(f"DRY RUN: {output_path} <- {text}")

        jobs = fill_missing_sentence_audio(
            args.csv,
            args.output_dir,
            args.relative_prefix,
            synthesize,
            extension=extension,
            limit=args.limit,
            write_csv=False,
        )
    else:
        if args.provider == "voicevox":
            synthesize = voicevox_synthesizer(args.voicevox_url, args.speaker)
        else:
            synthesize = edge_tts_synthesizer(args.voice, args.rate)
        jobs = fill_missing_sentence_audio(
            args.csv,
            args.output_dir,
            args.relative_prefix,
            synthesize,
            extension=extension,
            limit=args.limit,
        )

    print(f"Generated sentence audio for {len(jobs)} rows.")


if __name__ == "__main__":
    main()
