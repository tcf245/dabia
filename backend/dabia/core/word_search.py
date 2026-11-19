"""Fuzzy matching for the learner's word list.

The learner can type kanji, hiragana, katakana, romaji or a word from the meaning. Scoring is done in Python over
the user's own learned words (at most a few thousand rows), so no database extension is needed:

    100  word or reading equals the query
     80  word or reading starts with the query
     60  word, reading or meaning contains the query
    <50  trigram similarity of the query to a word of the meaning (typo tolerance)
      0  no match

See .ai/specs/word-review.md section 5.2.
"""
import re
import unicodedata
from dataclasses import dataclass
from typing import Optional

TRIGRAM_THRESHOLD = 0.3

_KATAKANA_START, _KATAKANA_END = ord("ァ"), ord("ヶ")
_KANA_OFFSET = ord("ァ") - ord("ぁ")

# Romaji syllables to hiragana, longest first when matching. Hepburn and Kunrei spellings.
_ROMAJI = {
    "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お",
    "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ",
    "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
    "sa": "さ", "shi": "し", "si": "し", "su": "す", "se": "せ", "so": "そ",
    "za": "ざ", "ji": "じ", "zi": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
    "ta": "た", "chi": "ち", "ti": "ち", "tsu": "つ", "tu": "つ", "te": "て", "to": "と",
    "da": "だ", "di": "ぢ", "du": "づ", "de": "で", "do": "ど",
    "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の",
    "ha": "は", "hi": "ひ", "fu": "ふ", "hu": "ふ", "he": "へ", "ho": "ほ",
    "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ",
    "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",
    "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も",
    "ya": "や", "yu": "ゆ", "yo": "よ",
    "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ",
    "wa": "わ", "wo": "を",
    "kya": "きゃ", "kyu": "きゅ", "kyo": "きょ", "gya": "ぎゃ", "gyu": "ぎゅ", "gyo": "ぎょ",
    "sha": "しゃ", "shu": "しゅ", "sho": "しょ", "sya": "しゃ", "syu": "しゅ", "syo": "しょ",
    "ja": "じゃ", "ju": "じゅ", "jo": "じょ", "zya": "じゃ", "zyu": "じゅ", "zyo": "じょ",
    "jya": "じゃ", "jyu": "じゅ", "jyo": "じょ",
    "cha": "ちゃ", "chu": "ちゅ", "cho": "ちょ", "tya": "ちゃ", "tyu": "ちゅ", "tyo": "ちょ",
    "nya": "にゃ", "nyu": "にゅ", "nyo": "にょ", "hya": "ひゃ", "hyu": "ひゅ", "hyo": "ひょ",
    "bya": "びゃ", "byu": "びゅ", "byo": "びょ", "pya": "ぴゃ", "pyu": "ぴゅ", "pyo": "ぴょ",
    "mya": "みゃ", "myu": "みゅ", "myo": "みょ", "rya": "りゃ", "ryu": "りゅ", "ryo": "りょ",
    "fa": "ふぁ", "fi": "ふぃ", "fe": "ふぇ", "fo": "ふぉ",
    "-": "ー",
}
_ROMAJI_LENGTHS = (3, 2, 1)
_CONSONANTS = set("bcdfghjkmpqrstvwxyz")


def normalize(text: Optional[str]) -> str:
    """NFKC, trimmed, lowercase, katakana folded to hiragana."""
    if not text:
        return ""
    folded = unicodedata.normalize("NFKC", text).strip().lower()
    return "".join(
        chr(ord(ch) - _KANA_OFFSET) if _KATAKANA_START <= ord(ch) <= _KATAKANA_END else ch for ch in folded
    )


def romaji_to_hiragana(text: str) -> Optional[str]:
    """'taberu' -> 'たべる'. None when the text is not valid romaji."""
    src = text.lower()
    if not src or not re.fullmatch(r"[a-z'\-]+", src):
        return None
    out, i = [], 0
    while i < len(src):
        ch = src[i]
        if ch == "'":
            i += 1
            continue
        nxt = src[i + 1] if i + 1 < len(src) else ""
        # Doubled consonant -> small tsu (kitte), except 'nn'.
        if ch in _CONSONANTS and ch == nxt and ch != "n":
            out.append("っ")
            i += 1
            continue
        # 'n' before a consonant, an apostrophe, the end, or another 'n' -> ん. 'm' before b/p/m -> ん (shimbun).
        if ch == "n" and (nxt == "" or nxt == "'" or nxt == "n" or (nxt in _CONSONANTS and nxt != "y")):
            out.append("ん")
            after = src[i + 2] if i + 2 < len(src) else ""
            # 'nn' is one ん, unless the second n starts a syllable (konnichiha -> こん + にちは).
            i += 2 if nxt == "n" and (after == "" or after not in "aiueoy") else 1
            continue
        if ch == "m" and nxt in ("b", "p", "m"):
            out.append("ん")
            i += 1
            continue
        for length in _ROMAJI_LENGTHS:
            chunk = src[i:i + length]
            if chunk in _ROMAJI:
                out.append(_ROMAJI[chunk])
                i += length
                break
        else:
            return None
    return "".join(out)


def query_forms(query: str) -> tuple[str, Optional[str]]:
    """The normalized query, and its kana form when the query is romaji."""
    normalized = normalize(query)
    return normalized, romaji_to_hiragana(normalized)


@dataclass(frozen=True)
class Candidate:
    word: Optional[str]
    reading: Optional[str]
    meaning: Optional[str]


def _trigrams(word: str) -> set[str]:
    padded = f"  {word} "
    return {padded[i:i + 3] for i in range(len(padded) - 2)}


def trigram_similarity(query: str, text: str) -> float:
    """Best Jaccard similarity of the query's trigrams to any single word of the text."""
    query_grams = _trigrams(query)
    best = 0.0
    for word in re.findall(r"\w+", text):
        grams = _trigrams(word)
        best = max(best, len(query_grams & grams) / len(query_grams | grams))
    return best


def score(query: str, candidate: Candidate) -> float:
    normalized, kana = query_forms(query)
    if not normalized:
        return 0
    word, reading, meaning = normalize(candidate.word), normalize(candidate.reading), normalize(candidate.meaning)
    jp_queries = [q for q in (normalized, kana) if q]
    jp_fields = [f for f in (word, reading) if f]

    if any(q == f for q in jp_queries for f in jp_fields):
        return 100
    if any(f.startswith(q) for q in jp_queries for f in jp_fields):
        return 80
    if any(q in f for q in jp_queries for f in jp_fields) or (meaning and normalized in meaning):
        return 60
    if meaning and len(normalized) >= 3:
        similarity = trigram_similarity(normalized, meaning)
        if similarity >= TRIGRAM_THRESHOLD:
            return round(50 * similarity, 2)
    return 0
