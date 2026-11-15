import type { Deck } from '../services/api';

const DIFFICULTY_RANK: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 };

/** Turns `eggrolls-JLPT10k-v3::1-N4+N5` into `N5–N4` and `dabia-jlpt::N2 Grammar` into `N2 Grammar`. */
export const deckLabel = (name: string): string => {
    const short = name.split('::').pop()!.replace(/^\d+-/, '');
    const range = short.match(/^(N\d)\+(N\d)$/);
    return range ? `${range[2]}–${range[1]}` : short;
};

export const isGrammarDeck = (deck: Deck) => deck.tags.includes('Grammar') || /grammar/i.test(deck.name);

export const sortDecks = (decks: Deck[]) =>
    [...decks].sort((a, b) =>
        (DIFFICULTY_RANK[a.difficulty] ?? 9) - (DIFFICULTY_RANK[b.difficulty] ?? 9)
        || Number(isGrammarDeck(a)) - Number(isGrammarDeck(b))
        || a.name.localeCompare(b.name));
