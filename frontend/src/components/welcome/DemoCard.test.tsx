import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { useReducedMotion } from 'framer-motion';
import DemoCard from './DemoCard';
import { zh } from '../../i18n/welcome';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return { ...actual, useReducedMotion: vi.fn(() => false) };
});

const [first, second] = zh.demoCards;

// Upper bounds for the animation timeline; each timeout can land up to one 50 ms step late.
const untilCorrect = (word: string) => 1150 + 270 * word.length + 400;
const CORRECT_HOLD = 2850;

// Advance in small steps so each scheduled timeout fires and React re-renders between them.
const advance = (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 50) {
        act(() => {
            vi.advanceTimersByTime(50);
        });
    }
};

describe('DemoCard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        (useReducedMotion as Mock).mockReturnValue(false);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts with an empty blank and the hint of the first card', () => {
        render(<DemoCard copy={zh} />);

        expect(screen.getByText(first.hint)).toBeInTheDocument();
        expect(screen.getByText(first.translation)).toBeInTheDocument();
        expect(screen.queryByText(zh.demoNextReview(first.nextReview))).not.toBeInTheDocument();
        expect(screen.getByLabelText(`${first.fromLevel} / 5`)).toBeInTheDocument();
    });

    it('types the answer, marks it correct and shows the next review', () => {
        render(<DemoCard copy={zh} />);

        advance(untilCorrect(first.word));

        expect(screen.getByText(zh.demoNextReview(first.nextReview))).toBeInTheDocument();
        expect(screen.getByLabelText(`${first.toLevel} / 5`)).toBeInTheDocument();
    });

    it('moves on to the next card after the correct state', () => {
        render(<DemoCard copy={zh} />);

        advance(untilCorrect(first.word) + CORRECT_HOLD);

        expect(screen.getByText(second.hint)).toBeInTheDocument();
        expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    });

    it('shows a word with a different reading together with its kana', () => {
        render(<DemoCard copy={zh} />);

        advance(untilCorrect(first.word) + CORRECT_HOLD);
        advance(untilCorrect(second.word));

        expect(screen.getByText(`${second.word} (${second.reading})`)).toBeInTheDocument();
    });

    it('renders the finished state without animating when reduced motion is preferred', () => {
        (useReducedMotion as Mock).mockReturnValue(true);
        render(<DemoCard copy={zh} />);

        expect(screen.getByText(zh.demoNextReview(first.nextReview))).toBeInTheDocument();
        advance(10000);
        expect(screen.getByText(first.hint)).toBeInTheDocument();
    });
});
