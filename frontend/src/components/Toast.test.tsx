import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders status pill and auto-hides after 3s', () => {
    const onClose = vi.fn();
    render(<Toast message="Exported 12 words" onClose={onClose} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Exported 12 words');
    expect(status).toHaveClass('fixed', 'bottom-6');

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancels auto-hide timer on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Toast message="Exported 1 word" onClose={onClose} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
