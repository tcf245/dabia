import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Flashcard from './Flashcard';
import { getCardGrammar, type Card } from '../services/api';

// Mock framer-motion to be synchronous and non-animated for tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    getCardGrammar: vi.fn(),
  };
});


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
    vi.mocked(getCardGrammar).mockReset();
    if (globalThis.playMock) {
      globalThis.playMock.mockClear();
    }
  });

  test('renders initial card state correctly', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    expect(screen.getByText(mockCard.target.hint!)).toBeInTheDocument();
    expect(screen.getByText(mockCard.sentence_translation!)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /learn/i })).toBeInTheDocument();
  });

  test('handles correct answer and auto-advances with audio', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText('test (てすと)')).toBeInTheDocument();
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

    const feedback = await screen.findByText('test (てすと)');
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
    expect(await screen.findByText('test (てすと)')).toBeInTheDocument();

    // Second attempt (correct)
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should show correct UI, but submit as false
    expect(await screen.findByText('test (てすと)', { selector: '.text-primary span' })).toBeInTheDocument();
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

    expect(screen.getByText('test (てすと)')).toBeInTheDocument();
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
    expect(screen.getByText('test (てすと)')).toBeInTheDocument();
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

    expect(await screen.findByText('test (てすと)')).toBeInTheDocument();
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
    expect(await screen.findByText('test (てすと)')).toBeInTheDocument();
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
    // Note: Empty submission via Learn button (which is the default when empty) triggers handleCheck
    // handleCheck sees empty, treats as incorrect
    const feedback = await screen.findByText('test (てすと)');
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
    expect(await screen.findByText('test (てすと)')).toBeInTheDocument();

    // Second attempt (incorrect again)
    // Clear input first as useFlashcardLogic does on incorrect
    fireEvent.change(input, { target: { value: 'wrong2' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Input should be cleared again
    expect(input).toHaveValue('');
  });

  test('audio playback: handles end event and manual playback errors', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    // Move to state where audio is enabled
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    const audioBtn = await screen.findByRole('button', { name: /play audio/i });

    // Test end event
    fireEvent.click(audioBtn);
    expect(globalThis.playMock).toHaveBeenCalled();
    act(() => {
      globalThis.triggerOnended();
    });

    // Test playback error
    globalThis.playMock.mockReturnValueOnce(Promise.reject(new Error('Playback failed')));
    await act(async () => {
      fireEvent.click(audioBtn);
      // Wait for the error to be caught and state to update
      await Promise.resolve();
    });
  });

  test('audio cleanup and advance error handling', async () => {
    const { rerender } = render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    // Test cleanup when card changes
    // First play some audio
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    const audioBtn = await screen.findByRole('button', { name: /play audio/i });
    fireEvent.click(audioBtn);
    expect(globalThis.playMock).toHaveBeenCalled();

    // Now change card
    const nextCard = { ...mockCard, card_id: '2', target: { word: 'next', hint: 'next' }, reading: 'next' };
    rerender(<Flashcard card={nextCard} onSubmit={mockOnSubmit} />);
    expect(globalThis.pauseMock).toHaveBeenCalled();

    // Test advance audio play error
    const errCard = { ...nextCard, sentence_audio_url: 'http://err.com' };
    rerender(<Flashcard card={errCard} onSubmit={mockOnSubmit} />);

    globalThis.playMock.mockReturnValueOnce(Promise.reject(new Error('Advance audio failed')));

    const input2 = screen.getByRole('textbox');
    fireEvent.change(input2, { target: { value: 'next' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    });

    // Should still call onSubmit even if audio fails
    expect(await screen.findByText('next', { selector: '.text-primary span' })).toBeInTheDocument();
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

  test('loads and renders grammar annotations on demand', async () => {
    vi.mocked(getCardGrammar).mockResolvedValueOnce({
      card_id: '1',
      annotations: [
        {
          id: 'a1',
          surface_text: 'を',
          start_index: 5,
          end_index: 6,
          role_label: 'object-marker',
          explanation_for_sentence: 'Marks the direct object.',
          display_order: 1,
          confidence: 0.99,
          source: 'manual',
          grammar_point: {
            id: 'g1',
            slug: 'particle-o',
            title: 'Particle を',
            short_meaning: 'Marks the direct object.',
            category: 'particle',
            jlpt_level: 'N5',
            formation: 'noun + を + verb',
            notes: 'Used with transitive verbs.',
          },
        },
      ],
    });

    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /show grammar/i }));

    await waitFor(() => {
      expect(getCardGrammar).toHaveBeenCalledWith('1');
    });

    expect(await screen.findByText('Particle を')).toBeInTheDocument();
    expect(screen.getAllByText('Marks the direct object.')[0]).toBeInTheDocument();
    expect(screen.getByText('object-marker')).toBeInTheDocument();
  });

  test('reuses loaded grammar data when toggling panel', async () => {
    vi.mocked(getCardGrammar).mockResolvedValueOnce({
      card_id: '1',
      annotations: [],
    });

    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /show grammar/i }));
    await waitFor(() => {
      expect(getCardGrammar).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /hide grammar/i }));
    fireEvent.click(screen.getByRole('button', { name: /show grammar/i }));

    expect(getCardGrammar).toHaveBeenCalledTimes(1);
  });

  test('shows grammar fallback text when sentence is missing', async () => {
    vi.mocked(getCardGrammar).mockResolvedValueOnce({
      card_id: '1',
      annotations: [],
    });

    const cardWithoutSentence = { ...mockCard, sentence: null };
    render(<Flashcard card={cardWithoutSentence} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /show grammar/i }));

    await waitFor(() => {
      expect(getCardGrammar).toHaveBeenCalledWith('1');
    });

    expect(screen.getByText(cardWithoutSentence.sentence_template)).toBeInTheDocument();
  });

  test('shows grammar error state when loading fails', async () => {
    vi.mocked(getCardGrammar).mockRejectedValueOnce(new Error('grammar failed'));

    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /show grammar/i }));

    expect(await screen.findByText('Could not load grammar details right now.')).toBeInTheDocument();
  });
});
