import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import LearningSession from './LearningSession';
import * as api from '../services/api';
import * as statsApi from '../api/stats';

// Mock the API
vi.mock('../services/api', () => ({
    getNextCard: vi.fn(),
}));
vi.mock('../api/stats', () => ({
    getDailySummary: vi.fn(),
}));

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
        (statsApi.getDailySummary as Mock).mockResolvedValue({
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
});
