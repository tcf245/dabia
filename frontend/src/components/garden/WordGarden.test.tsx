import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import WordGarden from './WordGarden';
import type { GardenWord } from '../../services/api';

const SAMPLE_WORDS: GardenWord[] = [
    {
        card_id: 'c1',
        text: '食べる',
        reading: 'たべる',
        romaji: 'たべる',
        hint: 'to eat',
        level: 2,
        type: 'review',
    },
    {
        card_id: 'c2',
        text: '花',
        reading: 'はな',
        romaji: 'はな',
        hint: 'flower',
        level: 5,
        type: 'learned',
    },
];

const WordsRouteProbe = () => {
    const location = useLocation();
    return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
};

const renderGarden = (words: GardenWord[] = SAMPLE_WORDS) =>
    render(
        <MemoryRouter initialEntries={['/profile']}>
            <Routes>
                <Route path="/profile" element={<WordGarden words={words} />} />
                <Route path="/words" element={<WordsRouteProbe />} />
            </Routes>
        </MemoryRouter>,
    );

describe('WordGarden', () => {
    const originalMatchMedia = window.matchMedia;
    const originalResizeObserver = globalThis.ResizeObserver;

    const setReducedMotion = (matches: boolean) => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    };

    beforeEach(() => {
        setReducedMotion(false);
    });

    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: originalMatchMedia,
        });
        Object.defineProperty(globalThis, 'ResizeObserver', {
            configurable: true,
            writable: true,
            value: originalResizeObserver,
        });
    });

    it('renders the header in normal flow (not absolutely positioned over the canvas) with legend chips and View all link', () => {
        renderGarden();

        const header = screen.getByTestId('garden-header');
        const canvas = screen.getByTestId('garden-canvas');

        expect(header.className).not.toContain('absolute');
        expect(header.nextElementSibling).toBe(canvas);
        expect(screen.getByText('Vocabulary garden')).toBeInTheDocument();
        expect(screen.getByText('Learning')).toBeInTheDocument();
        expect(screen.getByText('Mastered')).toBeInTheDocument();

        const viewAllLink = screen.getByRole('link', { name: /View all/i });
        expect(viewAllLink).toHaveAttribute('href', '/words');
    });

    it('renders words as focusable buttons with descriptive aria-labels and non-uppercase readings', () => {
        renderGarden();

        const learningBtn = screen.getByRole('button', { name: '食べる, Learning, level 2' });
        const masteredBtn = screen.getByRole('button', { name: '花, Mastered, level 5' });

        expect(learningBtn).toHaveAttribute('tabindex', '0');
        expect(masteredBtn).toHaveAttribute('tabindex', '0');

        const learningReading = screen.getByText('たべる');
        expect(learningReading.className).not.toContain('uppercase');
        expect(learningReading.className).not.toContain('opacity-0');

        const masteredReading = screen.getByText('はな');
        expect(masteredReading.className).not.toContain('uppercase');
        expect(masteredReading.className).toContain('opacity-0');
    });

    it('lifts the active word, pauses its drift, dims others to 50%, reveals mastered reading, and shows a tooltip on hover or focus', () => {
        renderGarden();

        const learningBtn = screen.getByRole('button', { name: '食べる, Learning, level 2' });
        const masteredBtn = screen.getByRole('button', { name: '花, Mastered, level 5' });

        fireEvent.focus(masteredBtn);

        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveTextContent('はな');
        expect(tooltip).toHaveTextContent('flower');
        expect(learningBtn.className).toContain('opacity-50');
        expect(masteredBtn.className).toContain('opacity-100');

        const masteredReading = Array.from(masteredBtn.querySelectorAll('span')).find(
            (el) => el.textContent === 'はな' && !el.closest('[role="tooltip"]'),
        );
        expect(masteredReading).toBeDefined();
        expect(masteredReading?.className).toContain('opacity-100');

        const driftSpan = masteredBtn.querySelector('.garden-drift') as HTMLElement | null;
        expect(driftSpan).not.toBeNull();
        expect(driftSpan?.style.animationPlayState).toBe('paused');

        fireEvent.blur(masteredBtn);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(learningBtn.className).not.toContain('opacity-50');
    });

    it('applies per-word CSS custom properties on an inner drift span when motion is allowed', () => {
        renderGarden();

        const learningBtn = screen.getByRole('button', { name: '食べる, Learning, level 2' });
        expect(learningBtn.className).not.toContain('garden-drift');
        expect(learningBtn.style.left).toMatch(/px$/);
        expect(learningBtn.style.top).toMatch(/px$/);

        const driftSpan = learningBtn.querySelector('.garden-drift') as HTMLElement | null;
        expect(driftSpan).not.toBeNull();
        expect(driftSpan?.style.getPropertyValue('--dx')).not.toBe('');
        expect(driftSpan?.style.getPropertyValue('--dy')).not.toBe('');
        expect(driftSpan?.style.getPropertyValue('--rot')).not.toBe('');
        expect(driftSpan?.style.getPropertyValue('--dur')).not.toBe('');
        expect(driftSpan?.style.getPropertyValue('--delay')).not.toBe('');
    });

    it('disables drift and entrance animations when prefers-reduced-motion is enabled', () => {
        setReducedMotion(true);
        const { container } = renderGarden();

        expect(container.querySelector('.garden-drift')).toBeNull();
        expect(container.querySelector('.garden-enter')).toBeNull();

        const learningBtn = screen.getByRole('button', { name: '食べる, Learning, level 2' });
        const spans = Array.from(learningBtn.querySelectorAll('span'));
        for (const span of spans) {
            expect(span.style.getPropertyValue('--dx')).toBe('');
            expect(span.style.getPropertyValue('--dur')).toBe('');
        }
    });

    it('navigates to /words?q=<word> when a word is clicked', () => {
        renderGarden();

        fireEvent.click(screen.getByRole('button', { name: '食べる, Learning, level 2' }));

        const probe = screen.getByTestId('location-probe').textContent ?? '';
        const [pathname, search] = probe.split('?');
        expect(pathname).toBe('/words');
        expect(new URLSearchParams(search).get('q')).toBe('食べる');
    });

    it('falls back safely when ResizeObserver is unavailable', () => {
        Object.defineProperty(globalThis, 'ResizeObserver', {
            configurable: true,
            writable: true,
            value: undefined,
        });

        renderGarden();

        expect(screen.getByRole('button', { name: '食べる, Learning, level 2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '花, Mastered, level 5' })).toBeInTheDocument();
    });

    it('renders the empty state when there are no words', () => {
        renderGarden([]);

        expect(screen.getByText('Words you study will appear here.')).toBeInTheDocument();
    });

    it('hides the tooltip again when the pointer leaves a word', () => {
        renderGarden();
        const learningBtn = screen.getByRole('button', { name: '食べる, Learning, level 2' });

        fireEvent.mouseEnter(learningBtn);
        expect(screen.getByRole('tooltip')).toHaveTextContent('to eat');

        fireEvent.mouseLeave(learningBtn);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('re-lays out the words 150ms after the canvas is resized, ignoring empty sizes', () => {
        vi.useFakeTimers();
        let notify: ResizeObserverCallback = () => {};
        const disconnect = vi.fn();
        class FakeResizeObserver {
            constructor(callback: ResizeObserverCallback) {
                notify = callback;
            }
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = disconnect;
        }
        Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, writable: true, value: FakeResizeObserver });
        const resize = (width: number, height: number) =>
            act(() => {
                notify([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver);
                vi.advanceTimersByTime(150);
            });

        try {
            const { unmount } = renderGarden();
            const position = () => screen.getByRole('button', { name: '花, Mastered, level 5' }).style.left;
            const initial = position();

            resize(0, 0);
            expect(position()).toBe(initial);

            resize(320, 200);
            const narrow = parseFloat(position());
            expect(narrow).toBeLessThanOrEqual(320);

            resize(320, 200);  // same size again: nothing changes
            expect(parseFloat(position())).toBe(narrow);

            unmount();
            expect(disconnect).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('shows at most 8 words on a phone-sized screen', () => {
        const many: GardenWord[] = Array.from({ length: 14 }, (_, i) => ({
            card_id: `c${i}`, text: `語${i}`, reading: 'ご', romaji: 'ご', hint: null, level: i < 8 ? 3 : 5,
            type: i < 8 ? 'review' : 'learned',
        }));
        const width = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
        try {
            renderGarden(many);
            expect(screen.getAllByRole('button', { name: /level/ }).length).toBeLessThanOrEqual(8);
        } finally {
            Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
        }
    });
});
