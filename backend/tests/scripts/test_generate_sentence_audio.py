import csv
from pathlib import Path

from scripts.generate_sentence_audio import fill_missing_sentence_audio, sentence_text_from_row


def test_sentence_text_from_row_prefers_full_sentence_over_cloze_template():
    row = [
        "dabia-jlpt::N2 Grammar",
        "guid-1",
        "っぽい",
        "",
        "",
        "N / V-ます形去掉ます",
        "hint",
        "",
        "",
        "",
        "",
        "今日は風が強くて、ほこり__。",
        "今日は風が強くて、ほこりっぽい。",
        "今天风很大，感觉空气里到处都灰蒙蒙的。",
        "",
        "",
    ]

    assert sentence_text_from_row(row) == "今日は風が強くて、ほこりっぽい。"


def test_fill_missing_sentence_audio_updates_only_rows_without_sentence_audio(tmp_path: Path):
    csv_path = tmp_path / "deck.csv"
    output_dir = tmp_path / "audio"
    rows = [
        [
            "dabia-jlpt::N2 Grammar",
            "guid-1",
            "っぽい",
            "",
            "",
            "N / V-ます形去掉ます",
            "hint",
            "",
            "",
            "",
            "",
            "今日は風が強くて、ほこり__。",
            "今日は風が強くて、ほこりっぽい。",
            "今天风很大，感觉空气里到处都灰蒙蒙的。",
            "",
            "",
        ],
        [
            "dabia-jlpt::N2 Grammar",
            "guid-2",
            "おかげで",
            "",
            "",
            "N + の",
            "hint",
            "",
            "",
            "",
            "",
            "先生のご指導の__、大学院の試験に合格した。",
            "先生のご指導のおかげで、大学院の試験に合格した。",
            "幸亏有老师您的指导，研究生院的考试最终合格了。",
            "",
            "[sound:jlpt_n2_grammar/guid-2.mp3]",
        ],
    ]

    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        handle.write("# Generated from Japanese N2 Grammar\n")
        csv.writer(handle).writerows(rows)

    calls = []

    def fake_synthesize(text: str, output_path: Path) -> None:
        calls.append((text, output_path.name))
        output_path.write_bytes(b"fake-audio")

    jobs = fill_missing_sentence_audio(csv_path, output_dir, "jlpt_n2_grammar", fake_synthesize)

    updated_rows = list(csv.reader(line for line in csv_path.read_text(encoding="utf-8").splitlines() if not line.startswith("#")))
    assert len(jobs) == 1
    assert calls == [("今日は風が強くて、ほこりっぽい。", "guid-1.mp3")]
    assert updated_rows[0][15] == "jlpt_n2_grammar/guid-1.mp3"
    assert updated_rows[1][15] == "[sound:jlpt_n2_grammar/guid-2.mp3]"
    assert (output_dir / "guid-1.mp3").read_bytes() == b"fake-audio"
