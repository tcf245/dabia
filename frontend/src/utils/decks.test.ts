import { describe, it, expect } from 'vitest';
import { sortDecks, isGrammarDeck, deckTitle, deckDescription } from './decks';
import { en } from '../i18n/messages/en';
import { zh } from '../i18n/messages/zh';
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

describe('deckTitle', () => {
    it('prefixes imported JLPT decks and leaves custom names alone', () => {
        expect(deckTitle('eggrolls-JLPT10k-v3::1-N4+N5')).toBe('JLPT N5–N4');
        expect(deckTitle('dabia-jlpt::N2 Grammar')).toBe('JLPT N2 Grammar');
        expect(deckTitle('Basic Japanese')).toBe('Basic Japanese');
    });

    it('names the grammar deck in the interface language', () => {
        expect(deckTitle('dabia-jlpt::N2 Grammar', zh.decks.grammarSuffix)).toBe('JLPT N2 语法');
        expect(deckTitle('eggrolls-JLPT10k-v3::1-N4+N5', zh.decks.grammarSuffix)).toBe('JLPT N5–N4');
    });
});

describe('deckDescription', () => {
    it('keeps real descriptions and replaces import provenance notes', () => {
        expect(deckDescription(deck('x', 'Beginner'), en.decks)).toBe('Vocabulary in example sentences, with audio.');
        expect(deckDescription({ ...deck('a::3-N2', 'Advanced'), description: 'Cards from Anki export: a::3-N2' }, en.decks))
            .toBe('Vocabulary in example sentences, with audio.');
        expect(deckDescription({ ...deck('g', 'Advanced', ['Grammar']), description: 'Patterns from the local Japanese N2 Grammar wiki note.' }, en.decks))
            .toBe('Grammar patterns, each shown in an example sentence.');
        expect(deckDescription({ ...deck('c', 'Beginner'), description: 'Common phrases' }, en.decks)).toBe('Common phrases');
    });

    it('describes decks in the interface language', () => {
        expect(deckDescription(deck('x', 'Beginner'), zh.decks)).toBe(zh.decks.vocabularyDescription);
    });
});
