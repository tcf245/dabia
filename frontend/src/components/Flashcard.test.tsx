import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Flashcard from './Flashcard';
import type { Card } from '../services/api';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: {
      div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
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
    audio_url: null, // Ensure we are using sentence_audio_url
  };

  const mockOnSubmit = vi.fn();

  // Note: `beforeEach` is now in the global setup file (src/test/setup.ts)

  test('renders initial card state correctly', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('A check')).toBeInTheDocument();
    expect(screen.getByText('这是一个测试。')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
  });

  test('handles correct answer on first try', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    const checkButton = screen.getByRole('button', { name: /check/i });

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(checkButton);

    expect(await screen.findByText('Correct!')).toBeInTheDocument();
    expect(global.audioInstanceMock.play).toHaveBeenCalled();

    // Simulate audio finishing
    global.onendedHandler();

    expect(mockOnSubmit).toHaveBeenCalledWith('1', true, expect.any(Number));
  });

  test('handles incorrect answer', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(await screen.findByText(/Correct answer: test \(てすと\)/)).toBeInTheDocument();
    expect(global.audioInstanceMock.play).not.toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
    // Input should be cleared for re-typing
    expect(input).toHaveValue('');
  });

  test('handles empty input as an incorrect answer', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(await screen.findByText(/Correct answer: test \(てすと\)/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('handles correcting a wrong answer', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    
    // First, answer incorrectly
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(await screen.findByText(/Correct answer: test \(てすと\)/)).toBeInTheDocument();

    // Now, type the correct answer
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Audio should play, and then submit
    expect(global.audioInstanceMock.play).toHaveBeenCalled();
    global.onendedHandler();
    expect(mockOnSubmit).toHaveBeenCalledWith('1', false, expect.any(Number));
  });

  test('advances without audio if URL is null', () => {
    vi.useFakeTimers();
    const cardWithoutAudio = { ...mockCard, sentence_audio_url: null };
    render(<Flashcard card={cardWithoutAudio} onSubmit={mockOnSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(global.audioInstanceMock.play).not.toHaveBeenCalled();
    
    // Fast-forward timers
    vi.runAllTimers();

    expect(mockOnSubmit).toHaveBeenCalledWith('1', true, expect.any(Number));
    vi.useRealTimers();
  });
});
