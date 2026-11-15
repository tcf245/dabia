import { describe, it, expect } from 'vitest';
import { sortDecks, isGrammarDeck } from './decks';
import type { Deck } from '../services/api';

const deck = (name: string, difficulty: string, tags: string[] = []): Deck =>
    ({ id: name, name, count: 1, difficulty, tags });

describe('sortDecks', () => {
    it('orders by difficulty, vocabulary before grammar, then by name', () => {
        const sorted = sortDecks([
            deck('x::Custom', 'Unknown'),
            deck('dabia-jlpt::N2 Grammar', 'Advanced', ['Grammar']),
            deck('b::3-N2', 'Advanced'),
            deck('a::3-N2', 'Advanced'),
            deck('c::1-N4+N5', 'Beginner'),
        ]);
        expect(sorted.map((d) => d.name)).toEqual([
            'c::1-N4+N5', 'a::3-N2', 'b::3-N2', 'dabia-jlpt::N2 Grammar', 'x::Custom',
        ]);
    });

    it('does not mutate the input', () => {
        const input = [deck('b', 'Expert'), deck('a', 'Beginner')];
        sortDecks(input);
        expect(input.map((d) => d.name)).toEqual(['b', 'a']);
    });
});

describe('isGrammarDeck', () => {
    it('detects grammar decks by tag or name', () => {
        expect(isGrammarDeck(deck('n2', 'Advanced', ['Grammar']))).toBe(true);
        expect(isGrammarDeck(deck('JLPT grammar', 'Advanced'))).toBe(true);
        expect(isGrammarDeck(deck('eggrolls::3-N2', 'Advanced', ['JLPT N2']))).toBe(false);
    });
});
