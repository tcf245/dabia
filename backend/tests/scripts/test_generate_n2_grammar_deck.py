import csv
from io import StringIO

from scripts.generate_n2_grammar_deck import (
    DECK_NAME,
    GrammarItem,
    generate_rows,
    parse_grammar_markdown,
    stable_guid,
    write_import_csv,
)
from scripts.import_data import resolve_sentence_fields


SAMPLE_MARKDOWN = """
## 一、 原因、理由与因果关系

| 句型 | 核心意义 | 接续方式 | 典型例句 / 翻译 |
| :--- | :--- | :--- | :--- |
| **～おかげで / ～おかげだ** | 托…的福<br>幸亏…（积极结果） | N + の<br>V/A-连体形 | 先生のご指導の**おかげで**、大学院の試験に合格した。<br>（幸亏有老师您的指导，研究生院的考试最终合格了。） |
| **～せいだ / ～せいで / ～せいか** | 因…的缘故<br>（多用于不良后果） | N + の<br>V/A-连体形 | 年を取った**せいか**、朝早く目が覚めた。<br>（也许是因为年纪大了，早晨很早就醒了。） |
| **～っぽい** | 容易…的<br>感觉带有…倾向的 / 像…似的 | N / V-ます形去掉ます | 今日は風が強くて、ほこり**っぽい**。<br>（今天风很大，感觉空气里到处都灰蒙蒙的。） |
"""


def test_parse_grammar_markdown_extracts_functional_bucket_items():
    items = parse_grammar_markdown(SAMPLE_MARKDOWN)

    assert len(items) == 3
    assert items[0].bucket == "原因、理由与因果关系"
    assert items[0].pattern == "～おかげで / ～おかげだ"
    assert items[0].meaning == "托…的福 / 幸亏…（积极结果）"
    assert items[0].connection == "N + の / V/A-连体形"
    assert items[0].example == "先生のご指導のおかげで、大学院の試験に合格した。"
    assert items[0].translation == "幸亏有老师您的指导，研究生院的考试最终合格了。"


def test_generate_rows_matches_anki_import_shape_and_stable_guids():
    item = parse_grammar_markdown(SAMPLE_MARKDOWN)[0]
    rows = generate_rows([item])

    assert len(rows) == 1
    row = rows[0]
    assert len(row) == 16
    assert row[0] == DECK_NAME
    assert row[1] == stable_guid(item)
    assert row[2] == "おかげで"
    assert row[5] == "N + の / V/A-连体形"
    assert row[6] == "原因、理由与因果关系 | 托…的福 / 幸亏…（积极结果）"
    assert row[8] == ""
    assert row[11] == "先生のご指導の__、大学院の試験に合格した。"
    assert row[12] == "先生のご指導のおかげで、大学院の試験に合格した。"
    assert row[13] == "幸亏有老师您的指导，研究生院的考试最终合格了。"
    assert row[15] == ""


def test_generate_rows_clozes_suffix_patterns_inside_example_words():
    item = parse_grammar_markdown(SAMPLE_MARKDOWN)[2]
    rows = generate_rows([item])

    row = rows[0]
    assert row[2] == "っぽい"
    assert row[11] == "今日は風が強くて、ほこり__。"
    assert row[12] == "今日は風が強くて、ほこりっぽい。"


def test_stable_guid_preserves_known_source_typo_correction():
    item = GrammarItem(
        bucket="原因、理由与因果关系",
        pattern="～あまり",
        meaning="因过于…而… / 过度…结果…",
        connection="N + の / V-普",
        example="その知らせを聞いた時、驚きのあまり、声も出なかった。",
        translation="听到通知的时候，因过于吃惊而说不出话来。",
        focus_terms=("あまり",),
    )

    assert stable_guid(item) == "b6bcee38-ed7c-5aeb-9b21-eefb0296ea61"


def test_write_import_csv_emits_metadata_and_headerless_rows():
    items = parse_grammar_markdown(SAMPLE_MARKDOWN)
    output = StringIO()

    write_import_csv(items, output)

    lines = output.getvalue().splitlines()
    assert lines[0].startswith("# Generated from Japanese N2 Grammar")
    assert not lines[1].startswith("deck")

    data_lines = [line for line in lines if not line.startswith("#")]
    rows = list(csv.reader(data_lines))
    assert len(rows) == 3
    assert rows[0][0] == DECK_NAME
    assert rows[1][2] == "せいか"


def test_import_sentence_fields_preserve_generated_cloze_templates():
    sentence_template, sentence, sentence_furigana = resolve_sentence_fields(
        "今日は風が強くて、ほこり__。",
        "今日は風が強くて、ほこりっぽい。",
        "っぽい",
    )

    assert sentence_template == "今日は風が強くて、ほこり__。"
    assert sentence == "今日は風が強くて、ほこりっぽい。"
    assert sentence_furigana == "今日は風が強くて、ほこりっぽい。"


def test_import_sentence_fields_keep_legacy_full_sentence_rows():
    sentence_template, sentence, sentence_furigana = resolve_sentence_fields(
        "これは何ですか？",
        "これはなんですか？",
        "何",
    )

    assert sentence_template == "これは__ですか？"
    assert sentence == "これは何ですか？"
    assert sentence_furigana == "これはなんですか？"
