import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ExportButton, { type ExportButtonProps } from './ExportButton';
import * as api from '../../services/api';
import { en } from '../../i18n/messages/en';
import { zh } from '../../i18n/messages/zh';
import { setFallbackLanguage } from '../../i18n/context';

vi.mock('../../services/api', () => ({
  exportWords: vi.fn(),
}));

const defaultProps: ExportButtonProps = {
  currentQuery: {
    deckIds: ['d1'],
    status: 'learning',
    levels: [1, 2],
    q: 'taberu',
    sort: 'relevance',
  },
  deckLabel: 'JLPT N5–N4',
  status: 'learning',
  currentListCount: 292,
  currentDeckCount: 612,
  allDecksCount: 1204,
};

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    vi.mocked(api.exportWords).mockResolvedValue({ filename: 'dabia-words.csv' });
  });

  afterEach(() => {
    localStorage.removeItem('token');
    vi.useRealTimers();
  });

  it('opens an accessible non-modal popover with three options, counts, 17-col note, and moves focus in', () => {
    render(<ExportButton {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: en.words.export.button });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog', { name: en.words.export.title });
    expect(dialog).toHaveAttribute('aria-modal', 'false');

    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
    expect(radios[2].checked).toBe(false);
    expect(document.activeElement).toBe(radios[0]);

    expect(screen.getByText(en.words.export.currentList)).toBeInTheDocument();
    expect(screen.getByText('JLPT N5–N4 · Learning · 292 words')).toBeInTheDocument();
    expect(screen.getByText(en.words.export.currentDeck)).toBeInTheDocument();
    expect(screen.getByText('JLPT N5–N4 · 612 words')).toBeInTheDocument();
    expect(screen.getByText(en.words.export.allDecks)).toBeInTheDocument();
    expect(screen.getByText('1,204 words')).toBeInTheDocument();
    expect(screen.getByText(en.words.export.columnsNote)).toBeInTheDocument();
  });

  it('exports each scope with its mapped query', async () => {
    const { rerender } = render(<ExportButton {...defaultProps} />);

    // 1) Current list (default)
    fireEvent.click(screen.getByRole('button', { name: en.words.export.button }));
    fireEvent.click(screen.getByRole('button', { name: en.words.export.confirm }));
    await waitFor(() =>
      expect(api.exportWords).toHaveBeenCalledWith({
        deckIds: ['d1'],
        status: 'learning',
        levels: [1, 2],
        q: 'taberu',
        sort: 'relevance',
      }),
    );

    // 2) Whole current deck
    fireEvent.click(screen.getByRole('button', { name: en.words.export.button }));
    fireEvent.click(screen.getByRole('radio', { name: /Whole current deck/i }));
    fireEvent.click(screen.getByRole('button', { name: en.words.export.confirm }));
    await waitFor(() =>
      expect(api.exportWords).toHaveBeenLastCalledWith({
        deckIds: ['d1'],
        status: 'all',
      }),
    );

    // 3) All decks
    rerender(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: en.words.export.button }));
    fireEvent.click(screen.getByRole('radio', { name: /All decks/i }));
    fireEvent.click(screen.getByRole('button', { name: en.words.export.confirm }));
    await waitFor(() =>
      expect(api.exportWords).toHaveBeenLastCalledWith({
        allDecks: true,
        status: 'all',
      }),
    );
  });

  it('disables zero-count options, selects first enabled option, and disables button when all are zero', () => {
    const { rerender } = render(
      <ExportButton
        {...defaultProps}
        currentListCount={0}
        currentDeckCount={15}
        allDecksCount={40}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: en.words.export.button }));
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0]).toBeDisabled();
    expect(radios[1]).not.toBeDisabled();
    expect(radios[1].checked).toBe(true);
    expect(document.activeElement).toBe(radios[1]);

    // When all three counts are 0, the trigger button is disabled with a tooltip.
    rerender(
      <ExportButton
        {...defaultProps}
        currentListCount={0}
        currentDeckCount={0}
        allDecksCount={0}
      />,
    );

    const trigger = screen.getByRole('button', { name: en.words.export.button });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('title', en.words.export.emptyTooltip);
  });

  it('shows spinner and disables buttons while exporting, then closes and shows auto-hiding toast on success', async () => {
    let resolveExport: (val: { filename: string }) => void = () => {};
    vi.mocked(api.exportWords).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );

    render(<ExportButton {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: en.words.export.button });
    fireEvent.click(trigger);

    const cancelBtn = screen.getByRole('button', { name: en.words.export.cancel });
    const exportBtn = screen.getByRole('button', { name: en.words.export.confirm });
    fireEvent.click(exportBtn);

    expect(cancelBtn).toBeDisabled();
    expect(exportBtn).toBeDisabled();
    expect(exportBtn.querySelector('svg.animate-spin')).toBeInTheDocument();

    // Esc should not close while exporting is in flight.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => {
      resolveExport({ filename: 'dabia-words.csv' });
      await Promise.resolve();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole('status')).toHaveTextContent('Exported 292 words');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps popover open, shows error message, and re-enables buttons on failure', async () => {
    vi.mocked(api.exportWords).mockRejectedValueOnce(new Error('Export failed'));

    render(<ExportButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: en.words.export.button }));

    const cancelBtn = screen.getByRole('button', { name: en.words.export.cancel });
    const exportBtn = screen.getByRole('button', { name: en.words.export.confirm });
    fireEvent.click(exportBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.words.export.error);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(cancelBtn).not.toBeDisabled();
    expect(exportBtn).not.toBeDisabled();
  });

  it('closes on Cancel, Escape key, and outside click, returning focus to trigger button', () => {
    render(
      <div>
        <ExportButton {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: en.words.export.button });

    // Cancel
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.words.export.cancel }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // Escape
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // Outside click
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('renders Chinese copy accurately', () => {
    setFallbackLanguage('zh');
    render(<ExportButton {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: zh.words.export.button }));
    expect(screen.getByRole('dialog', { name: zh.words.export.title })).toBeInTheDocument();
    expect(screen.getByText(zh.words.export.currentList)).toBeInTheDocument();
    expect(screen.getByText('JLPT N5–N4 · 学习中 · 292 词')).toBeInTheDocument();
    expect(screen.getByText(zh.words.export.currentDeck)).toBeInTheDocument();
    expect(screen.getByText('JLPT N5–N4 · 612 词')).toBeInTheDocument();
    expect(screen.getByText(zh.words.export.allDecks)).toBeInTheDocument();
    expect(screen.getByText('1,204 词')).toBeInTheDocument();
    expect(screen.getByText(zh.words.export.columnsNote)).toBeInTheDocument();
  });

  it('shows Sign in to export when signed out and dispatches dabia:unauthorized without calling the API', () => {
    localStorage.removeItem('token');
    const unauthorizedHandler = vi.fn();
    window.addEventListener('dabia:unauthorized', unauthorizedHandler);

    try {
      render(<ExportButton {...defaultProps} />);

      const btn = screen.getByRole('button', { name: en.words.export.signIn });
      expect(btn).toHaveTextContent(en.words.export.signIn);

      fireEvent.click(btn);

      expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.exportWords).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('dabia:unauthorized', unauthorizedHandler);
    }
  });
});
