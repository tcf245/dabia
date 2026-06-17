#!/usr/bin/env python3
"""Generate a Dabia import CSV from the local Japanese N2 grammar wiki note."""

from __future__ import annotations

import argparse
import csv
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, TextIO


DECK_NAME = "dabia-jlpt::N2 Grammar"
SOURCE_TITLE = "Japanese N2 Grammar"
GUID_NAMESPACE = uuid.UUID("7ea47139-8db1-4c37-a24f-810240dfd519")


@dataclass(frozen=True)
class GrammarItem:
    bucket: str
    pattern: str
    meaning: str
    connection: str
    example: str
    translation: str
    focus_terms: tuple[str, ...] = ()


def clean_cell(value: str) -> str:
    text = value.strip()
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = text.replace("<br>", " / ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_bucket(heading: str) -> str:
    text = heading.strip().lstrip("#").strip()
    text = re.sub(r"^[一二三四五六七八九十]+、\s*", "", text)
    return text


def clean_focus_term(value: str) -> str:
    return clean_cell(value).strip()


def split_example(value: str) -> tuple[str, str, tuple[str, ...]]:
    focus_terms = tuple(
        term for term in (clean_focus_term(match) for match in re.findall(r"\*\*(.*?)\*\*", value)) if term
    )
    cleaned = clean_cell(value)
    match = re.search(r"^(.*?。)\s*[（(](.*?)[）)]$", cleaned)
    if match:
        return match.group(1).strip(), match.group(2).strip(), focus_terms

    parts = re.split(r"\s*/\s*[（(]", cleaned, maxsplit=1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].rstrip("）)").strip(), focus_terms

    return cleaned, "", focus_terms


def pattern_variants(pattern: str) -> list[str]:
    variants: list[str] = []
    for part in re.split(r"\s*/\s*", clean_cell(pattern)):
        text = part.strip()
        text = re.sub(r"[①②③④⑤⑥⑦⑧⑨]+$", "", text).strip()
        text = re.sub(r"^[～~]+", "", text).strip()
        text = re.sub(r"[（(][ぁ-んァ-ンー]+[）)]", "", text).strip()
        if text and text not in variants:
            variants.append(text)
    return variants


def choose_focus_term(item: GrammarItem) -> str:
    candidates = [term for term in item.focus_terms if term in item.example]
    if not candidates:
        candidates = [variant for variant in pattern_variants(item.pattern) if variant in item.example]
    if not candidates:
        candidates = pattern_variants(item.pattern)
    if not candidates:
        return item.pattern
    return max(candidates, key=len)


def cloze_example(example: str, target: str) -> str:
    if target and target in example:
        return example.replace(target, "__", 1)
    return example


def parse_table_row(line: str) -> list[str]:
    processed = line.strip().strip("|").replace(r"\|", "__PIPE_PLACEHOLDER__")
    cells = [cell.strip() for cell in processed.split("|")]
    return [cell.replace("__PIPE_PLACEHOLDER__", "|") for cell in cells]


def parse_grammar_markdown(markdown: str) -> list[GrammarItem]:
    items: list[GrammarItem] = []
    bucket = ""

    for line in markdown.splitlines():
        if line.startswith("## "):
            bucket = clean_bucket(line)
            continue

        if not line.startswith("|"):
            continue

        cells = parse_table_row(line)
        if len(cells) < 4:
            continue

        if cells[0] in {"句型", ":---", ":---------------------"} or cells[0].startswith(":"):
            continue

        pattern = clean_cell(cells[0])
        meaning = clean_cell(cells[1])
        connection = clean_cell(cells[2])
        example, translation, focus_terms = split_example(cells[3])

        if not bucket or not pattern or not example:
            continue

        items.append(
            GrammarItem(
                bucket=bucket,
                pattern=pattern,
                meaning=meaning,
                connection=connection,
                example=example,
                translation=translation,
                focus_terms=focus_terms,
            )
        )

    return items


def stable_guid(item: GrammarItem) -> str:
    # Keep GUIDs stable across source typo fixes after cards have been imported.
    example_key = item.example.replace("驚きのあまり", "惊きのあまり")
    key = f"{SOURCE_TITLE}|{item.bucket}|{item.pattern}|{example_key}"
    return str(uuid.uuid5(GUID_NAMESPACE, key))


def generate_rows(items: Iterable[GrammarItem]) -> list[list[str]]:
    rows: list[list[str]] = []
    for item in items:
        target = choose_focus_term(item)
        rows.append(
            [
                DECK_NAME,
                stable_guid(item),
                target,
                "",
                "",
                item.connection,
                f"{item.bucket} | {item.meaning}",
                "",
                "",
                "",
                "",
                cloze_example(item.example, target),
                item.example,
                item.translation,
                "",
                "",
            ]
        )
    return rows


def write_import_csv(items: Iterable[GrammarItem], output: TextIO) -> None:
    output.write(f"# Generated from {SOURCE_TITLE}\n")
    writer = csv.writer(output, lineterminator="\n")
    writer.writerows(generate_rows(items))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the JLPT N2 grammar deck import CSV.")
    parser.add_argument("source", type=Path, help="Path to the Japanese N2 grammar markdown source.")
    parser.add_argument("output", type=Path, help="Path to write the generated import CSV.")
    args = parser.parse_args()

    items = parse_grammar_markdown(args.source.read_text(encoding="utf-8"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as handle:
        write_import_csv(items, handle)

    print(f"Generated {len(items)} cards at {args.output}")


if __name__ == "__main__":
    main()
