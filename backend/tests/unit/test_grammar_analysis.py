from dabia.grammar import analyze_sentence


def test_analyze_sentence_detects_particle_and_polite_predicate():
    candidates = analyze_sentence("私はコーヒーを飲みます。")

    assert [candidate.grammar_point_slug for candidate in candidates] == [
        "particle-wa",
        "particle-o",
        "polite-non-past",
    ]
    assert candidates[0].surface_text == "は"
    assert candidates[1].role_label == "object-marker"
    assert candidates[2].surface_text == "飲みます"


def test_analyze_sentence_detects_plain_negative():
    candidates = analyze_sentence("品数がない")

    assert [candidate.grammar_point_slug for candidate in candidates] == [
        "particle-ga",
        "plain-negative",
    ]
    assert candidates[1].explanation_for_sentence == (
        "The predicate ends in ない, so the sentence is in a plain negative form."
    )


def test_analyze_sentence_returns_empty_for_missing_sentence():
    assert analyze_sentence(None) == []
