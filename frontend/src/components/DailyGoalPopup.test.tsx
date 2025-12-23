import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DailyGoalPopup from './DailyGoalPopup';
import * as statsApi from '../services/api';

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
        expect(await screen.findByText(/你做得很棒!/i)).toBeInTheDocument();
        expect(screen.getByText(/完成\s*50\s*张词卡/i)).toBeInTheDocument();

        // Check stats
        expect(screen.getByText('14')).toBeInTheDocument(); // Learned
        expect(screen.getByText('11')).toBeInTheDocument(); // Reinforced

        expect(screen.getByText(/64%/)).toBeInTheDocument(); // Accuracy
    });
});
