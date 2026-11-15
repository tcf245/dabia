import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DailyGoalPopup from './DailyGoalPopup';
import * as statsApi from '../services/api';
import { setFallbackLanguage } from '../i18n/context';
import { zh } from '../i18n/messages/zh';

// These assertions use the Chinese interface.
beforeEach(() => setFallbackLanguage('zh'));

vi.mock('../services/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return {
        ...actual,
        getDailySummary: vi.fn(),
    };
});

describe('DailyGoalPopup', () => {
    const mockStats: statsApi.DailyStats = {
        to_learn_count: 5,
        learned_count: 14,
        reinforced_count: 11,
        total_answered: 50,
        total_time_seconds: 664, // 11m 4s
        new_words_count: 0,
        accuracy: 64.0,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders nothing when closed', () => {
        render(<DailyGoalPopup isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByText(/DailyGoalPopup/i)).not.toBeInTheDocument();
    });

    test('renders and fetches data when open', async () => {
        vi.spyOn(statsApi, 'getDailySummary').mockResolvedValue(mockStats);

        render(<DailyGoalPopup isOpen={true} onClose={vi.fn()} />);

        // Should eventually display content
        // Note: The skeleton only renders "DailyGoalPopup", so this test verifying actual data will FAIL
        // This is intentional "Red" state.

        // Check for specific UI elements from the screenshot
        expect(await screen.findByText(zh.dailyGoal.celebration)).toBeInTheDocument();
        expect(screen.getByText(zh.dailyGoal.completed(50))).toBeInTheDocument();
        expect(screen.getByText(zh.dailyGoal.toLearn)).toBeInTheDocument();

        // Check stats
        expect(screen.getByText('14')).toBeInTheDocument(); // Learned
        expect(screen.getByText('11')).toBeInTheDocument(); // Reinforced

        expect(screen.getByText(/64%/)).toBeInTheDocument(); // Accuracy
    });
});
