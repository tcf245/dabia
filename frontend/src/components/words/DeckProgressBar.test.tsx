import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeckProgressBar from './DeckProgressBar';
import { en } from '../../i18n/messages/en';
import type { ProgressCounts } from '../../services/api';

const sampleCounts: ProgressCounts = {
  total: 1500,
  mastered: 320,
  learning: 292,
  not_started: 888,
  learning_by_level: { '1': 40, '2': 61, '3': 88, '4': 103 },
};

describe('DeckProgressBar', () => {
  it('renders segment widths, headline, legend, and aria-label for typical counts', () => {
    render(<DeckProgressBar counts={sampleCounts} size="regular" />);

    const bar = screen.getByRole('img', {
      name: en.words.progressAria(320, 292, 888, 1500),
    });
    expect(bar).toBeInTheDocument();

    const mastered = screen.getByTestId('progress-segment-mastered');
    const learning = screen.getByTestId('progress-segment-learning');
    const notStarted = screen.getByTestId('progress-segment-not-started');

    expect(mastered.style.width).toBe(`${(320 / 1500) * 100}%`);
    expect(learning.style.width).toBe(`${(292 / 1500) * 100}%`);
    expect(notStarted.style.width).toBe(`${(888 / 1500) * 100}%`);

    expect(screen.getByText('Learned 612 / 1,500 words')).toBeInTheDocument();
    expect(screen.getByText('40.8%')).toBeInTheDocument();

    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText('(21.3%)')).toBeInTheDocument();
    expect(screen.getByText('292')).toBeInTheDocument();
    expect(screen.getByText('(19.5%)')).toBeInTheDocument();
    expect(screen.getByText('888')).toBeInTheDocument();
    expect(screen.getByText('(59.2%)')).toBeInTheDocument();
  });

  it('renders empty bar without NaN when total is zero', () => {
    const emptyCounts: ProgressCounts = {
      total: 0,
      mastered: 0,
      learning: 0,
      not_started: 0,
      learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
    };

    const { container } = render(<DeckProgressBar counts={emptyCounts} />);

    expect(container.textContent).not.toContain('NaN');
    expect(screen.getByText('Learned 0 / 0 words')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();

    expect(screen.getByTestId('progress-segment-mastered').style.width).toBe('0%');
    expect(screen.getByTestId('progress-segment-learning').style.width).toBe('0%');
    expect(screen.getByTestId('progress-segment-not-started').style.width).toBe('0%');
    expect(screen.getByTestId('progress-segment-mastered').style.minWidth).toBe('');
  });

  it('renders 100% mastered state cleanly', () => {
    const masteredCounts: ProgressCounts = {
      total: 100,
      mastered: 100,
      learning: 0,
      not_started: 0,
      learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
    };

    render(<DeckProgressBar counts={masteredCounts} />);

    expect(screen.getByTestId('progress-segment-mastered').style.width).toBe('100%');
    expect(screen.getByTestId('progress-segment-learning').style.width).toBe('0%');
    expect(screen.getByTestId('progress-segment-not-started').style.width).toBe('0%');
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('enforces a 2px minimum width on tiny non-zero segments only', () => {
    const tinyCounts: ProgressCounts = {
      total: 10000,
      mastered: 1,
      learning: 0,
      not_started: 9999,
      learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
    };

    render(<DeckProgressBar counts={tinyCounts} />);

    const mastered = screen.getByTestId('progress-segment-mastered');
    const learning = screen.getByTestId('progress-segment-learning');

    expect(mastered.style.width).toBe('0.01%');
    expect(mastered.style.minWidth).toBe('2px');
    expect(learning.style.minWidth).toBe('');
  });

  it('shows the L1-L4 breakdown tooltip on hover, focus, and click, and closes on Escape', () => {
    render(<DeckProgressBar counts={sampleCounts} />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    const learningSegment = screen.getByTestId('progress-segment-learning');
    fireEvent.mouseEnter(learningSegment);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('L1');
    expect(tooltip).toHaveTextContent('40');
    expect(tooltip).toHaveTextContent('L2');
    expect(tooltip).toHaveTextContent('61');
    expect(tooltip).toHaveTextContent('L3');
    expect(tooltip).toHaveTextContent('88');
    expect(tooltip).toHaveTextContent('L4');
    expect(tooltip).toHaveTextContent('103');

    fireEvent.mouseLeave(learningSegment);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    const learningLegendBtn = screen.getByRole('button', { name: /learning/i });
    fireEvent.focus(learningLegendBtn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(learningLegendBtn, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(learningLegendBtn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(learningLegendBtn);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.click(learningSegment);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(learningSegment);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders only the 4px bar in thin mode without headline or legend', () => {
    render(<DeckProgressBar counts={sampleCounts} size="thin" />);

    const bar = screen.getByRole('img', {
      name: en.words.progressAria(320, 292, 888, 1500),
    });
    expect(bar.className).toContain('h-[4px]');
    expect(screen.queryByText(/Learned/)).not.toBeInTheDocument();
    expect(screen.queryByText(en.words.mastered)).not.toBeInTheDocument();
  });
});
