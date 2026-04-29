from dataclasses import dataclass


@dataclass(frozen=True)
class GrammarPointDefinition:
    slug: str
    title: str
    short_meaning: str
    category: str
    jlpt_level: str | None
    formation: str | None
    notes: str | None


@dataclass(frozen=True)
class GrammarAnnotationCandidate:
    grammar_point_slug: str
    surface_text: str
    start_index: int | None
    end_index: int | None
    role_label: str | None
    explanation_for_sentence: str
    display_order: int
    confidence: float
    source: str = "auto-rule-v1"


GRAMMAR_POINT_DEFINITIONS: dict[str, GrammarPointDefinition] = {
    "particle-wa": GrammarPointDefinition(
        slug="particle-wa",
        title="Particle は",
        short_meaning="Marks the sentence topic.",
        category="particle",
        jlpt_level="N5",
        formation="noun + は",
        notes="Pronounced わ when used as the topic marker.",
    ),
    "particle-ga": GrammarPointDefinition(
        slug="particle-ga",
        title="Particle が",
        short_meaning="Marks the grammatical subject or a focused subject.",
        category="particle",
        jlpt_level="N5",
        formation="noun + が",
        notes="Often highlights what exists or who performs a state.",
    ),
    "particle-o": GrammarPointDefinition(
        slug="particle-o",
        title="Particle を",
        short_meaning="Marks the direct object.",
        category="particle",
        jlpt_level="N5",
        formation="noun + を + verb",
        notes="Common with transitive verbs.",
    ),
    "polite-non-past": GrammarPointDefinition(
        slug="polite-non-past",
        title="Polite Non-Past",
        short_meaning="Polite present or future verb form.",
        category="conjugation",
        jlpt_level="N5",
        formation="verb stem + ます",
        notes="Used in polite statements about present or future actions.",
    ),
    "plain-negative": GrammarPointDefinition(
        slug="plain-negative",
        title="Plain Negative",
        short_meaning="Plain negative predicate ending.",
        category="conjugation",
        jlpt_level="N5",
        formation="verb/adjective/noun predicate + ない",
        notes="Indicates non-existence or negation in plain form.",
    ),
}


def _find_particle_annotations(sentence: str) -> list[GrammarAnnotationCandidate]:
    candidates: list[GrammarAnnotationCandidate] = []
    particle_rules = [
        ("は", "particle-wa", "topic", "は marks the sentence topic in this card."),
        ("が", "particle-ga", "subject", "が marks the grammatical subject in this card."),
        ("を", "particle-o", "object-marker", "を marks the direct object in this card."),
    ]

    for particle, slug, role_label, explanation in particle_rules:
        search_start = 0
        while True:
            index = sentence.find(particle, search_start)
            if index == -1:
                break

            candidates.append(
                GrammarAnnotationCandidate(
                    grammar_point_slug=slug,
                    surface_text=particle,
                    start_index=index,
                    end_index=index + len(particle),
                    role_label=role_label,
                    explanation_for_sentence=explanation,
                    display_order=index,
                    confidence=0.88,
                )
            )
            search_start = index + len(particle)

    return candidates


def _find_predicate_annotation(sentence: str) -> list[GrammarAnnotationCandidate]:
    stripped = sentence.rstrip("。！？!? ")
    predicate_start = 0
    boundary_particles = ("は", "が", "を", "に", "で", "と", "も", "へ")

    for particle in boundary_particles:
        index = stripped.rfind(particle)
        if index != -1:
            predicate_start = max(predicate_start, index + len(particle))

    predicate_rules = [
        ("ます", "polite-non-past", "predicate", 0.92, "The predicate ends in ます, so it is in a polite non-past form."),
        ("ない", "plain-negative", "predicate", 0.86, "The predicate ends in ない, so the sentence is in a plain negative form."),
    ]

    for ending, slug, role_label, confidence, explanation in predicate_rules:
        if stripped.endswith(ending):
            start_index = predicate_start
            return [
                GrammarAnnotationCandidate(
                    grammar_point_slug=slug,
                    surface_text=stripped[start_index:],
                    start_index=start_index,
                    end_index=len(stripped),
                    role_label=role_label,
                    explanation_for_sentence=explanation,
                    display_order=start_index + 1000,
                    confidence=confidence,
                )
            ]

    return []


def analyze_sentence(sentence: str | None) -> list[GrammarAnnotationCandidate]:
    if not sentence:
        return []

    candidates = _find_particle_annotations(sentence)
    candidates.extend(_find_predicate_annotation(sentence))
    return sorted(candidates, key=lambda candidate: candidate.display_order)
