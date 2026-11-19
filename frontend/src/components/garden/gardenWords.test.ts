import { describe, expect, it } from 'vitest';
import type { GardenWord } from '../../services/api';
import { LEARNING_STYLE_BY_LEVEL, selectVisibleWords, wordVisuals } from './gardenWords';

const word = (id: string, type: GardenWord['type'], level: number): GardenWord => ({
    card_id: id, text: id, reading: id, romaji: id, hint: null, level, type,
});
const learning = (n: number) => Array.from({ length: n }, (_, i) => word(`l${i}`, 'review', 2));
const mastered = (n: number) => Array.from({ length: n }, (_, i) => word(`m${i}`, 'learned', 5));
const count = (words: GardenWord[], type: GardenWord['type']) => words.filter((w) => w.type === type).length;

describe('selectVisibleWords', () => {
    it('keeps every word when they fit', () => {
        const words = [...learning(3), ...mastered(2)];
        expect(selectVisibleWords(words, 12)).toEqual(words);
    });

    it('splits about 8:6 between learning and mastered when both groups are full', () => {
        const picked = selectVisibleWords([...learning(8), ...mastered(6)], 12);
        expect(picked).toHaveLength(12);
        expect(count(picked, 'review')).toBe(7);
        expect(count(picked, 'learned')).toBe(5);
    });

    it('keeps learning words first and in their original order', () => {
        const picked = selectVisibleWords([...mastered(6), ...learning(8)], 8);
        expect(picked.slice(0, 5).map((w) => w.card_id)).toEqual(['l0', 'l1', 'l2', 'l3', 'l4']);
    });

    it('fills from learning words when there are few mastered words', () => {
        const picked = selectVisibleWords([...learning(12), ...mastered(1)], 8);
        expect(picked).toHaveLength(8);
        expect(count(picked, 'learned')).toBe(1);
        expect(count(picked, 'review')).toBe(7);
    });

    it('fills from mastered words when there are few learning words', () => {
        const picked = selectVisibleWords([...learning(1), ...mastered(12)], 8);
        expect(picked).toHaveLength(8);
        expect(count(picked, 'review')).toBe(1);
        expect(count(picked, 'learned')).toBe(7);
    });
});

describe('wordVisuals', () => {
    it('uses the level style for learning words', () => {
        for (const level of [1, 2, 3, 4]) {
            expect(wordVisuals(word('x', 'review', level))).toEqual({ ...LEARNING_STYLE_BY_LEVEL[level], isMastered: false });
        }
    });

    it('falls back to the brand colour for an unexpected learning level', () => {
        expect(wordVisuals(word('x', 'review', 9))).toEqual({ color: '#D97757', fontSize: 24, isMastered: false });
    });

    it('draws mastered words in charcoal at a stable 18-22px size', () => {
        const visuals = wordVisuals(word('card-123', 'learned', 5));
        expect(visuals.color).toBe('#2A2A29');
        expect(visuals.isMastered).toBe(true);
        expect(visuals.fontSize).toBeGreaterThanOrEqual(18);
        expect(visuals.fontSize).toBeLessThanOrEqual(22);
        expect(wordVisuals(word('card-123', 'learned', 5)).fontSize).toBe(visuals.fontSize);
    });
});
