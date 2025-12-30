import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import Flashcard from './Flashcard';
import type { Card } from '../services/api';

// Mock framer-motion to be synchronous and non-animated for tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));


describe('Flashcard component', () => {
  const mockCard: Card = {
    card_id: '1',
    deck: { id: 'd1', name: 'Deck 1' },
    sentence_template: 'This is a __.',
    target: { word: 'test', hint: 'A check' },
    reading: 'てすと',
    sentence_audio_url: 'http://example.com/test.mp3',
    sentence: 'This is a test.',
    sentence_furigana: null,
    sentence_translation: '这是一个测试。',
    proficiency_level: 0,
    audio_url: null,
  };

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    if (globalThis.playMock) {
      globalThis.playMock.mockClear();
    }
  });

  test('renders initial card state correctly', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    expect(screen.getByText(mockCard.target.hint!)).toBeInTheDocument();
    expect(screen.getByText(mockCard.sentence_translation!)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('handles correct answer and auto-advances with audio', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
    expect(globalThis.playMock).toHaveBeenCalled();

    await act(async () => {
      globalThis.triggerOnended();
    });

    expect(mockOnSubmit).toHaveBeenCalledWith('1', true, expect.any(Number));
  });

  test('opens and closes proficiency level modal', async () => {
    render(<Flashcard card={mockCard} onSubmit={vi.fn()} />);

    // Find the proficiency indicator by its testId
    const indicator = screen.getByTestId('proficiency-indicator-container');
    fireEvent.click(indicator);

    // Verify modal is open (checks title text)
    expect(screen.getByText('掌握你的每日词汇')).toBeInTheDocument();

    // Close the modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Verify modal is closed
    expect(screen.queryByText('掌握你的每日词汇')).not.toBeInTheDocument();
  });

  test('handles incorrect answer and shows reading hint', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    const feedback = await screen.findByText(mockCard.reading!);
    expect(feedback).toBeInTheDocument();
    expect(feedback.parentElement).toHaveClass('text-muted-foreground');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('handles correcting a previously incorrect answer', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');

    // First attempt (incorrect)
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(await screen.findByText(mockCard.reading!)).toBeInTheDocument();

    // Second attempt (correct)
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should show "Correct!" UI, but submit as false
    expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
    expect(globalThis.playMock).toHaveBeenCalled();

    await act(async () => {
      globalThis.triggerOnended();
    });
    expect(mockOnSubmit).toHaveBeenCalledWith('1', false, expect.any(Number));
  });


  test('advances without audio after a correct answer', async () => {
    vi.useFakeTimers();
    const cardWithoutAudio = { ...mockCard, sentence_audio_url: null };
    render(<Flashcard card={cardWithoutAudio} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(screen.getByText(/correct!/i)).toBeInTheDocument();
    expect(globalThis.playMock).not.toHaveBeenCalled();

    // Run the timers to fire the setTimeout
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith('1', true, expect.any(Number));

    vi.useRealTimers();
  });

  test('renders review mode correctly', () => {
    const onContinue = vi.fn();
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} mode="review" onContinue={onContinue} />);

    expect(screen.getByText(mockCard.target.word)).toBeInTheDocument();
    expect(screen.getByText(mockCard.reading!)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalled();
  });

  test('handles ArrowRight shortcut for continuing', () => {
    const onContinue = vi.fn();
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} mode="review" onContinue={onContinue} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onContinue).toHaveBeenCalled();
  });

  test('handles ArrowRight shortcut for submitting in quiz mode', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // ArrowRight should trigger submit
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
  });

  test('audio button behavior: disabled initially, enabled after submit', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const audioBtn = screen.getByRole('button', { name: /play audio/i });

    // Initially disabled in quiz mode (unanswered)
    expect(audioBtn).toBeDisabled();

    // Submit correct answer
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Should be enabled now (state is correct)
    expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
    expect(audioBtn).not.toBeDisabled();

    // Clicking it should play audio
    fireEvent.click(audioBtn);
    expect(globalThis.playMock).toHaveBeenCalled();
  });

  test('handles empty input submission as incorrect', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });

    // Press Enter
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should show reading hint (incorrect state)
    const feedback = await screen.findByText(mockCard.reading!);
    expect(feedback).toBeInTheDocument();

    // Should NOT submit to backend yet
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('handles correction retry with incorrect input', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    const input = screen.getByRole('textbox');

    // First attempt (incorrect)
    fireEvent.change(input, { target: { value: 'wrong1' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(await screen.findByText(mockCard.reading!)).toBeInTheDocument();

    // Second attempt (incorrect again)
    // Clear input first as useFlashcardLogic does on incorrect
    fireEvent.change(input, { target: { value: 'wrong2' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Input should be cleared again (line 115)
    expect(input).toHaveValue('');
  });

  test('audio playback: handles end event and manual playback errors', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    // Move to state where audio is enabled
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    const audioBtn = await screen.findByRole('button', { name: /play audio/i });

    // Test end event (line 82)
    fireEvent.click(audioBtn);
    expect(globalThis.playMock).toHaveBeenCalled();
    act(() => {
      globalThis.triggerOnended();
    });

    // Test playback error (lines 86-87)
    globalThis.playMock.mockReturnValueOnce(Promise.resolve().then(() => { throw new Error('Playback failed'); }));
    fireEvent.click(audioBtn);
  });

  test('audio cleanup and advance error handling', async () => {
    const { rerender } = render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    // Test cleanup when card changes (lines 39-40)
    // First play some audio
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    const audioBtn = await screen.findByRole('button', { name: /play audio/i });
    fireEvent.click(audioBtn);
    expect(globalThis.playMock).toHaveBeenCalled();

    // Now change card
    const nextCard = { ...mockCard, card_id: '2', target: { word: 'next', hint: 'next' } };
    rerender(<Flashcard card={nextCard} onSubmit={mockOnSubmit} />);
    expect(globalThis.pauseMock).toHaveBeenCalled();

    // Test advance audio play error (lines 61-62)
    const errCard = { ...nextCard, sentence_audio_url: 'http://err.com' };
    rerender(<Flashcard card={errCard} onSubmit={mockOnSubmit} />);

    globalThis.playMock.mockReturnValueOnce(Promise.reject(new Error('Advance audio failed')));

    const input2 = screen.getByRole('textbox');
    fireEvent.change(input2, { target: { value: 'next' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Should still call onSubmit even if audio fails
    expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
    // Wait for the catch block to call handleSubmission
    await act(async () => {
      await Promise.resolve(); // flush microtasks
    });
    expect(mockOnSubmit).toHaveBeenCalledWith('2', true, expect.any(Number));
  });

  test('playAudioAndAdvance cleanup previous audio (line 53)', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    // We need to trigger playAudioAndAdvance while audioRef.current is already set.
    // 1. Play manual audio
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    const audioBtn = await screen.findByRole('button', { name: /play audio/i });
    fireEvent.click(audioBtn);

    // 2. Now submit correctly to trigger playAudioAndAdvance
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(globalThis.pauseMock).toHaveBeenCalled();
  });
});
