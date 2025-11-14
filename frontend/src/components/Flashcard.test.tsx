import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Flashcard from './Flashcard';
import type { Card } from '../services/api';

// Mock framer-motion to be synchronous and non-animated for tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div>,
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
  });

  test('renders initial card state correctly', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('てすと')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check answer/i })).toBeInTheDocument();
    expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument();
  });

  test('handles checking a correct answer via button click', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    const checkButton = screen.getByRole('button', { name: /check answer/i });
    fireEvent.click(checkButton);

    // After checking, the "Correct" and "Incorrect" buttons should appear
    expect(screen.getByRole('button', { name: /^Correct$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Incorrect$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check answer/i })).not.toBeInTheDocument();
    
    // The input should be disabled and styled correctly
    expect(input).toBeDisabled();
    expect(input).toHaveClass('border-primary bg-primary/10');
  });

  test('handles checking an incorrect answer via Enter key', async () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should show the "Correct Answer" text, split into two parts
    expect(await screen.findByText(/Correct answer:/i)).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    
    // The input should be disabled and styled correctly
    expect(input).toBeDisabled();
    expect(input).toHaveClass('border-destructive bg-destructive/10');
  });

  test('submits "correct" after checking', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));

    // Click the "Correct" button
    fireEvent.click(screen.getByRole('button', { name: /^Correct$/i }));
    expect(mockOnSubmit).toHaveBeenCalledWith('1', true, expect.any(Number));
  });

  test('submits "incorrect" after checking', () => {
    render(<Flashcard card={mockCard} onSubmit={mockOnSubmit} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));

    // Click the "Incorrect" button
    fireEvent.click(screen.getByRole('button', { name: /^Incorrect$/i }));
    expect(mockOnSubmit).toHaveBeenCalledWith('1', false, expect.any(Number));
  });
});
