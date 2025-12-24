import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Profile from './Profile';
import * as api from '../services/api';
import { BrowserRouter } from 'react-router-dom';

// Mock the API calls
vi.mock('../services/api', () => ({
    getProfileHeatmap: vi.fn(),
    getProfileGarden: vi.fn(),
}));

describe('Profile Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const wrap = (component: React.ReactNode) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it('renders the heatmap with correct layout and colors', async () => {
        const makeDate = (daysAgo: number) => {
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            return d.toISOString().split('T')[0];
        };

        const testData = [
            { date: makeDate(0), count: 55, level: 0 },
            { date: makeDate(1), count: 35, level: 0 },
            { date: makeDate(2), count: 15, level: 0 },
            { date: makeDate(3), count: 5, level: 0 },
            { date: makeDate(4), count: 0, level: 0 },
        ];

        (api.getProfileHeatmap as any).mockResolvedValue(testData);
        (api.getProfileGarden as any).mockResolvedValue([]);

        wrap(<Profile />);

        // Wait for header
        expect(await screen.findByText('Your Journey')).toBeInTheDocument();

        // Wait for grid to render with specific colors
        await waitFor(() => {
            expect(document.querySelector('.bg-\\[\\#B05030\\]')).toBeInTheDocument();
        });

        const hasColor = (color: string) => {
            const elements = document.getElementsByClassName(color);
            return elements.length > 0;
        };

        expect(hasColor('bg-[#B05030]')).toBe(true);
        expect(hasColor('bg-[#D97757]')).toBe(true);
        expect(hasColor('bg-[#E5A087]')).toBe(true);
        expect(hasColor('bg-[#F2DCD6]')).toBe(true);
        expect(hasColor('bg-[var(--paper-gray)]')).toBe(true);

        // Verify layout
        const container = document.querySelector('.overflow-x-auto');
        expect(container).toBeInTheDocument();
        expect(container?.children.length).toBeGreaterThan(0);
    });

    it('renders vocabulary garden with items', async () => {
        const mockGarden: api.GardenWord[] = [
            { text: '花', romaji: 'hana', type: 'learned' },
            { text: '水', romaji: 'mizu', type: 'review' },
        ];

        (api.getProfileHeatmap as any).mockResolvedValue([]);
        (api.getProfileGarden as any).mockResolvedValue(mockGarden);

        wrap(<Profile />);

        expect(await screen.findByText('花')).toBeInTheDocument();
        expect(screen.getByText('hana')).toBeInTheDocument();
        expect(screen.getByText('水')).toBeInTheDocument();
        expect(screen.getByText('mizu')).toBeInTheDocument();
    });

    it('handles API fetch error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (api.getProfileHeatmap as any).mockRejectedValue(new Error('API Failure'));
        (api.getProfileGarden as any).mockResolvedValue([]);

        wrap(<Profile />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch profile data", expect.any(Error));
        });

        consoleSpy.mockRestore();
    });
});
