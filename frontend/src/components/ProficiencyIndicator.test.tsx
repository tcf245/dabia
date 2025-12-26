import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ProficiencyIndicator from './ProficiencyIndicator';

// Mock framer-motion to be synchronous and non-animated for tests
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
    },
}));

describe('ProficiencyIndicator', () => {
    const levels = [
        { level: 1, text: '没见过的新单词！' },
        { level: 2, text: '这个单词需要多练练！' },
        { level: 3, text: '就要学起来了！' },
        { level: 4, text: '唾手可得！' },
        { level: 5, text: '记忆满点！' },
    ];

    test.each(levels)('renders segments correctly for level $level', ({ level }) => {
        const { container } = render(<ProficiencyIndicator level={level} onClick={vi.fn()} />);

        // Check for 5 segments
        const segments = container.querySelectorAll('.proficiency-segment');
        expect(segments).toHaveLength(5);

        // Check filled segments (should have a specific class or background)
        const filledSegments = container.querySelectorAll('.proficiency-segment-filled');
        expect(filledSegments).toHaveLength(level);
    });

    test('shows text and "看更多" on hover', async () => {
        render(<ProficiencyIndicator level={3} onClick={vi.fn()} />);

        const container = screen.getByTestId('proficiency-indicator-container');

        // Initially should not show text (default bar only requirement)
        expect(screen.queryByText('就要学起来了！')).not.toBeInTheDocument();

        // Hover
        fireEvent.mouseEnter(container);

        expect(await screen.findByText('就要学起来了！')).toBeInTheDocument();
        expect(screen.queryByText('看更多')).not.toBeInTheDocument();

        // Mouse leave
        fireEvent.mouseLeave(container);
        expect(screen.queryByText('就要学起来了！')).not.toBeInTheDocument();
    });

    test('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<ProficiencyIndicator level={3} onClick={handleClick} />);

        const container = screen.getByTestId('proficiency-indicator-container');
        fireEvent.click(container);

        expect(handleClick).toHaveBeenCalled();
    });
});
