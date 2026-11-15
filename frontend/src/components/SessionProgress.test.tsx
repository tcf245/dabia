import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SessionProgress from './SessionProgress';

describe('SessionProgress', () => {
    it('shows today\'s count against the goal as a compact ring', () => {
        render(<SessionProgress progress={{ completed_today: 12, goal_today: 50 }} />);

        const meter = screen.getByRole('progressbar', { name: 'Daily goal' });
        expect(meter).toHaveAttribute('aria-valuenow', '12');
        expect(meter).toHaveAttribute('aria-valuemax', '50');
        expect(meter).toHaveTextContent('12 / 50');
        expect(screen.queryByTestId('goal-complete')).not.toBeInTheDocument();
    });

    it('marks the goal as reached and caps the ring at full', () => {
        render(<SessionProgress progress={{ completed_today: 63, goal_today: 50 }} />);

        expect(screen.getByTestId('goal-complete')).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: 'Daily goal' })).toHaveTextContent('63 / 50');
    });

    it('handles a zero goal without dividing by zero', () => {
        render(<SessionProgress progress={{ completed_today: 0, goal_today: 0 }} />);
        expect(screen.getByRole('progressbar', { name: 'Daily goal' })).toHaveTextContent('0 / 0');
    });

    it('renders the left slot content', () => {
        render(<SessionProgress progress={{ completed_today: 1, goal_today: 50 }} headerLeft={<button>Back</button>} />);
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });
});
