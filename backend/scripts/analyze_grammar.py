import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dabia.grammar import GRAMMAR_POINT_DEFINITIONS, analyze_sentence
from dabia.models import Card, CardGrammarAnnotation, GrammarPoint


def get_session(db_url: str) -> Session:
    engine = create_engine(db_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def ensure_grammar_points(db: Session) -> dict[str, GrammarPoint]:
    existing = {
        grammar_point.slug: grammar_point
        for grammar_point in db.query(GrammarPoint).filter(
            GrammarPoint.slug.in_(list(GRAMMAR_POINT_DEFINITIONS.keys()))
        )
    }

    for slug, definition in GRAMMAR_POINT_DEFINITIONS.items():
        if slug in existing:
            continue

        grammar_point = GrammarPoint(
            slug=definition.slug,
            title=definition.title,
            short_meaning=definition.short_meaning,
            category=definition.category,
            jlpt_level=definition.jlpt_level,
            formation=definition.formation,
            notes=definition.notes,
        )
        db.add(grammar_point)
        db.flush()
        existing[slug] = grammar_point

    return existing


def annotate_cards(db: Session, limit: int, persist: bool) -> tuple[int, int]:
    cards = db.query(Card).filter(Card.sentence.isnot(None)).order_by(Card.created_at.desc()).limit(limit).all()
    grammar_points = ensure_grammar_points(db)

    annotated_cards = 0
    annotation_count = 0

    for card in cards:
        candidates = analyze_sentence(card.sentence)
        if not candidates:
            continue

        annotated_cards += 1
        annotation_count += len(candidates)

        if not persist:
            print(f"{card.id} | {card.sentence}")
            for candidate in candidates:
                print(
                    f"  - {candidate.grammar_point_slug} | {candidate.surface_text} | "
                    f"{candidate.role_label} | {candidate.explanation_for_sentence}"
                )
            continue

        (
            db.query(CardGrammarAnnotation)
            .filter(
                CardGrammarAnnotation.card_id == card.id,
                CardGrammarAnnotation.source == "auto-rule-v1",
            )
            .delete()
        )

        for candidate in candidates:
            db.add(
                CardGrammarAnnotation(
                    card_id=card.id,
                    grammar_point_id=grammar_points[candidate.grammar_point_slug].id,
                    surface_text=candidate.surface_text,
                    start_index=candidate.start_index,
                    end_index=candidate.end_index,
                    role_label=candidate.role_label,
                    explanation_for_sentence=candidate.explanation_for_sentence,
                    display_order=candidate.display_order,
                    confidence=candidate.confidence,
                    source=candidate.source,
                )
            )

    if persist:
        db.commit()

    return annotated_cards, annotation_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze existing card sentences and generate grammar annotations.")
    parser.add_argument("--db-url", required=True, help="Database URL for the target Dabia database.")
    parser.add_argument("--limit", type=int, default=20, help="Maximum number of cards to analyze.")
    parser.add_argument(
        "--persist",
        action="store_true",
        help="Persist generated annotations. Without this flag the script runs in dry-run mode.",
    )
    args = parser.parse_args()

    db = get_session(args.db_url)
    try:
        annotated_cards, annotation_count = annotate_cards(db, args.limit, args.persist)
        mode = "persist" if args.persist else "dry-run"
        print(f"Completed grammar analysis in {mode} mode: {annotated_cards} cards, {annotation_count} annotations.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
