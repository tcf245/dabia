import pytest

from dabia.core.word_search import Candidate, normalize, query_forms, romaji_to_hiragana, score


@pytest.mark.parametrize("raw, expected", [
    ("タベル", "たべる"),
    ("  Flower ", "flower"),
    ("ＡＢＣ", "abc"),  # full-width to ASCII (NFKC)
    ("ｶﾀｶﾅ", "かたかな"),  # half-width katakana
    ("コーヒー", "こーひー"),
])
def test_normalize(raw, expected):
    assert normalize(raw) == expected


@pytest.mark.parametrize("romaji, kana", [
    ("taberu", "たべる"),
    ("nani", "なに"),
    ("shinbun", "しんぶん"),
    ("shimbun", "しんぶん"),
    ("kitte", "きって"),
    ("kyou", "きょう"),
    ("tsukue", "つくえ"),
    ("chiisai", "ちいさい"),
    ("konnichiha", "こんにちは"),
    ("ren'ai", "れんあい"),
    ("hon", "ほん"),
    ("honn", "ほん"),
    ("si", "し"),  # Kunrei
    ("tu", "つ"),
    ("jisho", "じしょ"),
    ("fune", "ふね"),
])
def test_romaji_to_hiragana(romaji, kana):
    assert romaji_to_hiragana(romaji) == kana


def test_romaji_to_hiragana_rejects_non_romaji():
    assert romaji_to_hiragana("x1y") is None
    assert romaji_to_hiragana("qqq") is None
    assert romaji_to_hiragana("花") is None


def test_query_forms_adds_kana_for_latin_queries():
    assert query_forms("Taberu") == ("taberu", "たべる")
    assert query_forms("タベ") == ("たべ", None)
    assert query_forms("eat") == ("eat", None)  # 'eat' is not valid romaji


EAT = Candidate(word="食べる", reading="たべる", meaning="to eat")
FLOWER = Candidate(word="花", reading="はな", meaning="flower")


@pytest.mark.parametrize("query, candidate, expected", [
    ("食べる", EAT, 100),  # exact word
    ("たべる", EAT, 100),  # exact reading
    ("タベル", EAT, 100),  # katakana normalized
    ("taberu", EAT, 100),  # romaji to reading
    ("食", EAT, 80),  # prefix
    ("tabe", EAT, 80),  # romaji prefix of the reading
    ("べる", EAT, 60),  # substring
    ("eat", EAT, 60),  # substring of the meaning
])
def test_score_tiers(query, candidate, expected):
    assert score(query, candidate) == expected


def test_score_typo_in_meaning_is_tolerated_but_ranks_below_substring():
    typo = score("flowr", FLOWER)
    assert 0 < typo < 60


def test_score_unrelated_is_zero():
    assert score("dog", FLOWER) == 0
    assert score("", FLOWER) == 0


def test_score_handles_missing_fields():
    assert score("花", Candidate(word="花", reading=None, meaning=None)) == 100
