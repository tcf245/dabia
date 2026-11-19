import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import LearningSession from './LearningSession';
import * as api from '../services/api';
import { en } from '../i18n/messages/en';
import { zh } from '../i18n/messages/zh';
import { LanguageProvider } from '../i18n/LanguageProvider';
import LanguageSelect from '../components/LanguageSelect';

// A new card clears the answer box in an effect that React may run a moment after the card is on screen.
// Typing in that gap gets wiped (CI flake: the button stayed "Learn"), so let pending effects run first.
const typeAnswer = async (value: string) => {
    await act(async () => {});
    fireEvent.change(screen.getByRole('textbox'), { target: { value } });
};

// Mock the API
vi.mock('../services/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return {
        ...actual,
        getNextCard: vi.fn(),
        getCard: vi.fn(),
        getDailySummary: vi.fn(),
        getLanguages: vi.fn().mockRejectedValue(new Error('offline')),
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

        // Type answer FIRST, so button becomes "Submit"
        await typeAnswer('test');
        
        // NOW find the button
        const submitBtn = screen.getByRole('button', { name: /submit/i });
        fireEvent.click(submitBtn);

        // Wait for popup to appear
        await waitFor(() => {
            expect(screen.getByText(en.dailyGoal.celebration)).toBeInTheDocument();
            expect(screen.getByText(en.dailyGoal.completed(50))).toBeInTheDocument();
        });
    });

    it('supports multi-level undo/redo with history and future stacks', async () => {
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
        await typeAnswer('one');
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        // 3. Answer 'two' -> get 'three'
        await typeAnswer('two');
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        await waitFor(() => expect(screen.getByText('h3')).toBeInTheDocument());

        // 4. Press Back -> get 'two'
        fireEvent.click(screen.getByRole('button', { name: en.session.previous }));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        // 5. Press Back again -> get 'one'
        fireEvent.click(screen.getByRole('button', { name: en.session.previous }));
        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());

        // 6. Press Continue -> get 'two'
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        // 7. Press Continue again -> get 'three'
        fireEvent.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => expect(screen.getByText('h3')).toBeInTheDocument());

        // 8. Back button should still work
        expect(screen.getByRole('button', { name: en.session.previous })).toBeInTheDocument();
    });

    it('shows error message and allows retry on API failure', async () => {
        (api.getNextCard as Mock).mockRejectedValueOnce(new Error('API Error'));

        render(<LearningSession />);

        await waitFor(() => {
            expect(screen.getByText(/Could not connect to the server/i)).toBeInTheDocument();
        });

        const retryBtn = screen.getByRole('button', { name: /retry/i });
        const mockCard = {
            card_id: '1',
            target: { word: 'test', hint: 'hint' },
            sentence_template: 'is __',
            reading: 'test',
            sentence_translation: 't',
            deck: { id: 'd1', name: 'D1' },
        };
        (api.getNextCard as Mock).mockResolvedValueOnce({
            card: mockCard,
            session_progress: { completed_today: 0, goal_today: 50 },
        });

        fireEvent.click(retryBtn);

        await waitFor(() => {
            expect(screen.getByText('hint')).toBeInTheDocument();
        });
    });

    it('supports keyboard shortcut ArrowLeft for undo', async () => {
        const mockCard1 = { card_id: '1', target: { word: 'one', hint: 'h1' }, sentence_template: 'is __', reading: 'one', sentence_translation: 't1', deck: { id: 'd1', name: 'D1' } };
        const mockCard2 = { card_id: '2', target: { word: 'two', hint: 'h2' }, sentence_template: 'is __', reading: 'two', sentence_translation: 't2', deck: { id: 'd2', name: 'D2' } };

        (api.getNextCard as Mock)
            .mockResolvedValueOnce({ card: mockCard1, session_progress: { completed_today: 0, goal_today: 50 } })
            .mockResolvedValueOnce({ card: mockCard2, session_progress: { completed_today: 1, goal_today: 50 } });

        render(<LearningSession />);

        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());

        // Answer card 1
        await typeAnswer('one');
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        // Wait for card 2 and the Previous button (proving loading finished and undo is available)
        await waitFor(() => {
            expect(screen.getByText('h2')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: en.session.previous })).toBeEnabled();
        });

        // Flush pending passive effects so the ArrowLeft keydown listener has re-subscribed with the new state
        await act(async () => {});

        // Press ArrowLeft once outside waitFor
        fireEvent.keyDown(window, { key: 'ArrowLeft' });

        // Should go back to h1
        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());
    });

    it('shows session completed message when no more cards', async () => {
        (api.getNextCard as Mock).mockResolvedValueOnce({
            card: null,
            session_progress: { completed_today: 50, goal_today: 50 },
        });

        render(<LearningSession />);

        await waitFor(() => {
            expect(screen.getByText(/Session Completed!/i)).toBeInTheDocument();
            expect(screen.getByText(/finished all your reviews/i)).toBeInTheDocument();
        });
    });

    it('does not submit answer when in review mode', async () => {
        const mockCard1 = { card_id: '1', target: { word: 'one', hint: 'h1' }, sentence_template: 'is __', reading: 'one', sentence_translation: 't1', deck: { id: 'd1', name: 'D1' } };
        const mockCard2 = { card_id: '2', target: { word: 'two', hint: 'h2' }, sentence_template: 'is __', reading: 'two', sentence_translation: 't2', deck: { id: 'd1', name: 'D1' } };

        (api.getNextCard as Mock)
            .mockResolvedValueOnce({ card: mockCard1, session_progress: { completed_today: 0, goal_today: 50 } })
            .mockResolvedValueOnce({ card: mockCard2, session_progress: { completed_today: 1, goal_today: 50 } });

        render(<LearningSession />);
        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());

        await typeAnswer('one');
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        await waitFor(() => expect(screen.getByText('h2')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: en.session.previous }));
        await waitFor(() => expect(screen.getByText('h1')).toBeInTheDocument());

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    });

    it('can close the daily goal popup', async () => {
        (api.getDailySummary as Mock).mockResolvedValue({
            to_learn_count: 0, learned_count: 50, reinforced_count: 10, total_answered: 50,
            total_time_seconds: 1200, new_words_count: 5, accuracy: 90.0,
        });

        const mockCard = { card_id: '1', target: { word: 'test', hint: 'hint' }, sentence_template: 'is __', reading: 'test', sentence_translation: 't', deck: { id: 'd1', name: 'D1' } };
        (api.getNextCard as Mock)
            .mockResolvedValueOnce({ card: mockCard, session_progress: { completed_today: 49, goal_today: 50 } })
            .mockResolvedValueOnce({ card: { ...mockCard, card_id: '2' }, session_progress: { completed_today: 50, goal_today: 50 } });

        render(<LearningSession />);
        await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());

        await typeAnswer('test');
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        await waitFor(() => expect(screen.getByText(en.dailyGoal.celebration)).toBeInTheDocument());

        const closeBtn = screen.getByRole('button', { name: en.dailyGoal.continue });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(screen.queryByText(en.dailyGoal.celebration)).not.toBeInTheDocument();
        });
    });

    it('covers remaining branches in handleContinue and handleSubmitAnswer', async () => {
        const mockCard = { card_id: '1', target: { word: 'test', hint: 'hint' }, sentence_template: 'is __', reading: 'test', sentence_translation: 't', deck: { id: 'd1', name: 'D1' } };
        (api.getNextCard as Mock).mockResolvedValue({ card: mockCard, session_progress: { completed_today: 0, goal_today: 50 } });

        render(<LearningSession />);
        await waitFor(() => expect(screen.getByText('hint')).toBeInTheDocument());

        // We can't easily trigger the unreachable branches via the UI without mocking the child component.
        // But we can check that they are indeed safe.
        
        await typeAnswer('test');
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        await waitFor(() => expect(api.getNextCard).toHaveBeenCalledTimes(2));

        fireEvent.click(screen.getByRole('button', { name: en.session.previous }));
    });

    it('reloads the card on screen in the new language when the language changes', async () => {
        const card = {
            card_id: 'c1',
            deck: { id: 'd', name: 'deck' },
            target: { word: '高校', hint: '高中' },
            sentence_template: '妹は__に通っています',
            reading: 'こうこう',
            sentence_translation: '妹妹在上高中',
            sentence_audio_url: null,
            proficiency_level: 2,
        };
        (api.getNextCard as Mock).mockResolvedValue({ card, session_progress: { completed_today: 0, goal_today: 50 } });
        (api.getCard as Mock).mockResolvedValue({
            ...card, target: { word: '高校', hint: 'high school' }, sentence_translation: 'My younger sister attends high school.', language: 'en',
        });
        localStorage.clear();
        render(
            <LanguageProvider initialLanguage="zh">
                <LanguageSelect />
                <LearningSession />
            </LanguageProvider>,
        );
        expect(await screen.findByText('高中')).toBeInTheDocument();
        expect(api.getCard).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: zh.language.label }));
        fireEvent.click(await screen.findByText('English'));

        expect(await screen.findByText('high school')).toBeInTheDocument();
        expect(screen.getByText('My younger sister attends high school.')).toBeInTheDocument();
        expect(api.getCard).toHaveBeenCalledWith('c1');
        expect(api.getNextCard).toHaveBeenCalledTimes(1); // the session itself does not move on
    });
});
