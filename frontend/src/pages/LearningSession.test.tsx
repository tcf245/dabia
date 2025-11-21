import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import LearningSession from './LearningSession';
import * as api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
    getNextCard: vi.fn(),
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
});
