import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ProficiencyLevelModal from './ProficiencyLevelModal';

// Mock framer-motion to be synchronous and non-animated for tests
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    },
}));

describe('ProficiencyLevelModal', () => {
    const mockOnClose = vi.fn();

    test('renders all 5 levels and descriptions', () => {
        render(<ProficiencyLevelModal isOpen={true} onClose={mockOnClose} />);

        expect(screen.getByText('掌握你的每日词汇')).toBeInTheDocument();
        expect(screen.getByText('记忆满点！')).toBeInTheDocument();
        expect(screen.getByText('唾手可得！')).toBeInTheDocument();
        expect(screen.getByText('就要学起来了！')).toBeInTheDocument();
        expect(screen.getByText('这个单词需要多练练！')).toBeInTheDocument();
        expect(screen.getByText('没见过的新单词！')).toBeInTheDocument();

        // Check for 5 segments sets
        const allSegments = screen.getAllByTestId('modal-proficiency-segments');
        expect(allSegments).toHaveLength(5);
    });

    test('calls onClose when close button is clicked', () => {
        render(<ProficiencyLevelModal isOpen={true} onClose={mockOnClose} />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    test('does not render when isOpen is false', () => {
        const { container } = render(<ProficiencyLevelModal isOpen={false} onClose={mockOnClose} />);
        expect(container.firstChild).toBeNull();
    });
});
