import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import LearningSession from './LearningSession';
import * as api from '../services/api';

// Mock the API
vi.mock('../services/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return {
        ...actual,
        getNextCard: vi.fn(),
        getDailySummary: vi.fn(),
    };
});

describe('LearningSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows skeleton loader initially', async () => {
        // Mock a delayed response
        (api.getNextCard as Mock).mockImplementation(() => new Promise(() => { }));

        const { container } = render(<LearningSession />);

        // Check for skeleton loader
        const skeleton = container.querySelector('.animate-pulse');
        expect(skeleton).toBeInTheDocument();
    });

    it('renders flashcard after loading', async () => {
        const mockCard = {
            card_id: '1',
            target: { word: 'test', hint: 'hint' },
            sentence_template: 'This is a __.',
            reading: 'test',
            sentence_translation: 'This is a test.',
            sentence_audio_url: null,
        };

        (api.getNextCard as Mock).mockResolvedValue({
            card: mockCard,
            session_progress: { completed_today: 0, goal_today: 50 },
        });

        render(<LearningSession />);

        await waitFor(() => {
            expect(screen.queryByText('Loading Session...')).not.toBeInTheDocument();
            expect(screen.getByText('hint')).toBeInTheDocument();
        });
    });


    it('triggers DailyGoalPopup when goal is reached', async () => {
        // Setup stats mock response
        (api.getDailySummary as Mock).mockResolvedValue({
            to_learn_count: 0,
            learned_count: 50,
            reinforced_count: 10,
            total_answered: 50,
            total_time_seconds: 1200,
            new_words_count: 5,
            accuracy: 90.0,
        });

        const mockCard = {
            card_id: '1',
            target: { word: 'test', hint: 'hint' },
            sentence_template: 'This is a __.',
            reading: 'test',
            sentence_translation: 'This is a test.',
            sentence_audio_url: null,
            deck: { id: 'deck1', name: 'Test Deck' },
        };

        // First call: 49/50
        (api.getNextCard as Mock)
            .mockResolvedValueOnce({
                card: mockCard,
                session_progress: { completed_today: 49, goal_today: 50 },
            })
            // Second call (after answer): 50/50 - Trigger!
            .mockResolvedValueOnce({
                card: { ...mockCard, card_id: '2' },
                session_progress: { completed_today: 50, goal_today: 50 },
            });

        render(<LearningSession />);

        // Wait for first card
        await waitFor(() => {
            expect(screen.getByText('hint')).toBeInTheDocument();
        });

        // Simulate answering correctly
        const input = screen.getByRole('textbox');
        const submitBtn = screen.getByRole('button', { name: /submit/i });

        // Type answer
        // Note: Using fireEvent or userEvent. standard existing tests use fireEvent inferred from context or manual DOM manip if simple. 
        // Let's import fireEvent
        const { fireEvent } = await import('@testing-library/react');
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.click(submitBtn);

        // Wait for "Correct!" feedback / auto-advance logic
        // The component auto-advances or waits for user?
        // Flashcard component usually waits for timeout or user input on correct answer if audio is present.
        // In the test mockCard has no audio, so it might expect auto-advance mock or similar.
        // Let's rely on standard flow. Assuming Flashcard logic holds.

        // Wait for popup to appear
        // The popup fetches stats, so we wait for that text
        await waitFor(() => {
            expect(screen.getByText(/你做得很棒!/i)).toBeInTheDocument();
            expect(screen.getByText(/完成\s*50\s*张词卡/i)).toBeInTheDocument();
        });
    });
    it('supports multi-level undo/redo with history and future stacks', async () => {
        const { fireEvent } = await import('@testing-library/react');
        const cards = [
            { card_id: '1', target: { word: 'one', hint: 'h1' }, sentence_template: 'is __', reading: 'one', sentence_translation: 't1', deck: { id: 'd1', name: 'D1' } },
            { card_id: '2', target: { word: 'two', hint: 'h2' }, sentence_template: 'is __', reading: 'two', sentence_translation: 't2', deck: { id: 'd2', name: 'D2' } },
            { card_id: '3', target: { word: 'three', hint: 'h3' }, sentence_template: 'is __', reading: 'three', sentence_translation: 't3', deck: { id: 'd3', name: 'D3' } },
        ];

        (api.getNextCard as Mock)
            .mockResolvedValueOnce({ card: cards[0], session_progress: { completed_today: 0, goal_today: 50 } })
            .mockResolvedValueOnce({ card: cards[1], session_progress: { completed_today: 1, goal_today: 50 } })
            .mockResolvedValueOnce({ card: cards[2], session_progress: { completed_today: 2, goal_today: 50 } });

        render(<LearningSession />);

        // 1. Initial card 'one'
        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());

        // 2. Answer 'one' -> get 'two'
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'one' } });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        // 3. Answer 'two' -> get 'three'
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'two' } });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        await waitFor(() => expect(screen.getByText('h3')).toBeInTheDocument());

        // 4. Press Back -> get 'two'
        fireEvent.click(screen.getByTitle('Previous Card'));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        // 5. Press Back again -> get 'one'
        fireEvent.click(screen.getByTitle('Previous Card'));
        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());

        // 6. Press Continue -> get 'two'
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        // 7. Press Continue again -> get 'three'
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => expect(screen.getByText('h3')).toBeInTheDocument());

        // 8. Back button should still work
        expect(screen.getByTitle('Previous Card')).toBeInTheDocument();
    });
});
