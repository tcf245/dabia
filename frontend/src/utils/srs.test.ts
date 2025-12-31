import { describe, it, expect } from 'vitest';
import {
    calculateNextProficiency,
    PROFICIENCY_NEW,
    PROFICIENCY_HARD,
    PROFICIENCY_LEARNING,
    PROFICIENCY_EASY,
    PROFICIENCY_MASTERED
} from './srs';

describe('srs utility', () => {
    describe('calculateNextProficiency', () => {
        it('should transition from NEW (L1) correctly', () => {
            expect(calculateNextProficiency(PROFICIENCY_NEW, true)).toBe(PROFICIENCY_MASTERED); // Correct -> L5
            expect(calculateNextProficiency(PROFICIENCY_NEW, false)).toBe(PROFICIENCY_HARD);    // Incorrect -> L2
        });

        it('should transition from HARD (L2) correctly', () => {
            expect(calculateNextProficiency(PROFICIENCY_HARD, true)).toBe(PROFICIENCY_LEARNING); // Correct -> L3
            expect(calculateNextProficiency(PROFICIENCY_HARD, false)).toBe(PROFICIENCY_HARD);     // Incorrect -> L2
        });

        it('should transition from LEARNING (L3) correctly', () => {
            expect(calculateNextProficiency(PROFICIENCY_LEARNING, true)).toBe(PROFICIENCY_EASY);     // Correct -> L4
            expect(calculateNextProficiency(PROFICIENCY_LEARNING, false)).toBe(PROFICIENCY_LEARNING); // Incorrect -> L3
        });

        it('should transition from EASY (L4) correctly', () => {
            expect(calculateNextProficiency(PROFICIENCY_EASY, true)).toBe(PROFICIENCY_MASTERED); // Correct -> L5
            expect(calculateNextProficiency(PROFICIENCY_EASY, false)).toBe(PROFICIENCY_LEARNING); // Incorrect -> L3
        });

        it('should transition from MASTERED (L5) correctly', () => {
            expect(calculateNextProficiency(PROFICIENCY_MASTERED, true)).toBe(PROFICIENCY_MASTERED); // Correct -> L5
            expect(calculateNextProficiency(PROFICIENCY_MASTERED, false)).toBe(PROFICIENCY_LEARNING); // Incorrect -> L3
        });

        it('should handle undefined or 0 current level as NEW', () => {
            expect(calculateNextProficiency(0, true)).toBe(PROFICIENCY_MASTERED);
            // @ts-ignore
            expect(calculateNextProficiency(undefined, false)).toBe(PROFICIENCY_HARD);
        });
    });
});
