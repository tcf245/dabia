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

describe('Profile Component - Heatmap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const wrap = (component: React.ReactNode) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it('renders the heatmap with correct layout and colors', async () => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        // Mock data: 
        // 1 day with 0 count (should be empty color)
        // 1 day with 5 count (should be light)
        // 1 day with 15 count (should be medium-light)
        // 1 day with 35 count (should be medium)
        // 1 day with 55 count (should be dark)

        const mockHeatmapData = [
            { date: '2023-01-01', count: 0, level: 0 },
            { date: '2023-01-02', count: 5, level: 1 },
            { date: '2023-01-03', count: 15, level: 2 },
            { date: '2023-01-04', count: 35, level: 3 },
            { date: '2023-01-05', count: 55, level: 4 },
        ];

        // Just mock empty garden for now
        (api.getProfileGarden as any).mockResolvedValue([]);
        (api.getProfileHeatmap as any).mockResolvedValue(mockHeatmapData);

        wrap(<Profile />);

        // Wait for header to appear
        expect(await screen.findByText('Your Journey')).toBeInTheDocument();

        // Check for specific colors based on our logic
        // We can't easily check date mapping without calculating exact dates relative to "today" 
        // but existing logic uses real dates. 
        // Let's rely on finding elements with specific classes.

        // We know the logic:
        // 0 -> bg-[#F2F0EF]
        // 1-9 -> bg-[#F2DCD6]
        // 10-29 -> bg-[#E5A087]
        // 30-49 -> bg-[#D97757]
        // 50+ -> bg-[#B05030]

        // Since we render a huge grid (6 months), there will be many empty days.
        // We just want to ensure our specific buckets exist in the DOM if we inject them into the date range.
        // However, the component calculates the range relative to TODAY.
        // So we need to ensure our mock dates are within the last 6 months.

        // Let's construct mock data relative to TODAY to ensure they are rendered.
        const makeDate = (daysAgo: number) => {
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            return d.toISOString().split('T')[0];
        };

        const testData = [
            { date: makeDate(0), count: 55, level: 0 }, // Should be Dark (50+)
            { date: makeDate(1), count: 35, level: 0 }, // Should be Med (30-49)
            { date: makeDate(2), count: 15, level: 0 }, // Should be Med-Light (10-29)
            { date: makeDate(3), count: 5, level: 0 },  // Should be Light (1-9)
            { date: makeDate(4), count: 0, level: 0 },  // Should be Empty (0)
        ];

        (api.getProfileHeatmap as any).mockResolvedValue(testData);

        // Re-render
        wrap(<Profile />);

        // Wait for data
        await waitFor(() => {
            const dark = document.querySelector('.bg-\\[\\#B05030\\]');
            expect(dark).toBeInTheDocument();
        });

        // Check for all colors
        // Note: class names in DOM might be escaped or formatted, simple query selector might need escaping
        // React renders `class="... bg-[#B05030] ..."`

        const hasColor = (color: string) => {
            // We use a partial attribute match logic or get by class
            // Since tailwind classes are literal strings in the code, they should appear.
            const elements = document.getElementsByClassName(color);
            return elements.length > 0;
        };

        await waitFor(() => {
            expect(hasColor('bg-[#B05030]')).toBe(true); // 50+
            expect(hasColor('bg-[#D97757]')).toBe(true); // 30-49
            expect(hasColor('bg-[#E5A087]')).toBe(true); // 10-29
            expect(hasColor('bg-[#F2DCD6]')).toBe(true); // 1-9
            expect(hasColor('bg-[#F2DCD6]')).toBe(true); // 1-9
            expect(hasColor('bg-[var(--paper-gray)]')).toBe(true); // 0 (There should always be some 0s)
        });

        // Verify Layout Structure
        // We expect a flex container with flex-col children (weeks)
        // The container has class `flex flex-row gap-1 overflow-x-auto no-scrollbar`
        const container = document.querySelector('.overflow-x-auto');
        expect(container).toBeInTheDocument();

        // It should have children (weeks)
        expect(container?.children.length).toBeGreaterThan(0);

        // Check first week
        const firstWeek = container?.children[0];
        expect(firstWeek).toHaveClass('flex', 'flex-col', 'gap-1');
    });
});
