import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WordCard from './WordCard';
import type { WordItem } from '../../services/api';
import { en } from '../../i18n/messages/en';
import { setFallbackLanguage } from '../../i18n/context';

const baseItem: WordItem = {
  card_id: 'c1',
  deck: { id: 'd1', name: 'eggrolls-JLPT10k-v3::1-N4+N5' },
  word: '何',
  reading: 'なに',
  hint: 'What?',
  sentence: 'これは何ですか？',
  sentence_furigana: 'これ[これ]は[は]何[なに]ですか[ですか]？',
  sentence_translation: 'What is this?',
  audio_url: 'https://cdn.example.com/word.mp3',
  sentence_audio_url: 'https://cdn.example.com/sentence.mp3',
  language: 'en',
  proficiency_level: 2,
  status: 'learning',
  first_seen_at: '2026-10-02T12:00:00Z',
  last_reviewed_at: '2026-11-16T12:00:00Z',
  next_review_at: '2026-11-18T12:00:00Z',
  review_count: 9,
  correct_count: 6,
  accuracy: 66.7,
  lapses_count: 2,
};

describe('WordCard', () => {
  it('renders collapsed word, reading, meaning, level dots, and relative review time without sentence', () => {
    const now = Date.parse('2026-11-19T12:00:00Z');
    render(
      <WordCard item={baseItem} expanded={false} onToggle={vi.fn()} now={now} />,
    );

    expect(screen.getByText('何')).toBeInTheDocument();
    expect(screen.getByText('なに')).toBeInTheDocument();
    expect(screen.getByText('What?')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: en.words.levelDotsAria(2) })).toBeInTheDocument();
    expect(screen.getByText('Reviewed 3 days ago')).toBeInTheDocument();

    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('What is this?')).not.toBeInTheDocument();
  });

  it('shows due relative time when next_review_at is in the future, and short date when mastered', () => {
    const now = Date.parse('2026-11-19T12:00:00Z');
    const dueItem: WordItem = {
      ...baseItem,
      next_review_at: '2026-11-19T12:02:00Z',
    };
    const { rerender } = render(
      <WordCard item={dueItem} expanded={false} onToggle={vi.fn()} now={now} />,
    );
    expect(screen.getByText('Due in 2 minutes')).toBeInTheDocument();

    const masteredItem: WordItem = {
      ...baseItem,
      status: 'mastered',
      proficiency_level: 5,
      next_review_at: '2026-12-18T12:00:00Z',
    };
    rerender(
      <WordCard item={masteredItem} expanded={false} onToggle={vi.fn()} now={now} />,
    );
    expect(screen.getByText('Mastered · next Dec 18')).toBeInTheDocument();
  });

  it('expands to show furigana ruby, highlighted target word, translation, stats, and audio', () => {
    const { container } = render(
      <WordCard item={baseItem} expanded={true} onToggle={vi.fn()} />,
    );

    const toggle = screen.getAllByRole('button')[0];
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const controlsId = toggle.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    const panel = document.getElementById(controlsId!);
    expect(panel).toBeInTheDocument();

    // Only 何 has reading different from surface text, so only one <rt> is rendered.
    const rts = container.querySelectorAll('rt');
    expect(rts).toHaveLength(1);
    expect(rts[0]).toHaveTextContent('なに');
    expect(rts[0].closest('ruby')).toHaveClass('text-[#D97757]');

    expect(screen.getByText('What is this?')).toBeInTheDocument();
    expect(
      screen.getByText('First learned Oct 2 · 9 reviews · Accuracy 67% · 2 lapses'),
    ).toBeInTheDocument();

    const wordBtn = screen.getByRole('button', { name: en.words.wordAudio });
    const sentenceBtn = screen.getByRole('button', { name: en.words.sentenceAudio });
    fireEvent.click(wordBtn);
    expect(globalThis.playMock).toHaveBeenCalledTimes(1);

    fireEvent.click(sentenceBtn);
    expect(globalThis.pauseMock).toHaveBeenCalledTimes(1);
    expect(globalThis.playMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to plain sentence when sentence_furigana is null', () => {
    const plainItem: WordItem = { ...baseItem, sentence_furigana: null };
    const { container } = render(
      <WordCard item={plainItem} expanded={true} onToggle={vi.fn()} />,
    );

    expect(container.querySelectorAll('ruby')).toHaveLength(0);
    const highlighted = screen.getByText('何', { selector: 'span' });
    expect(highlighted).toHaveClass('text-[#D97757]');
  });

  it('toggles via click, Enter, Space, and closes on Escape when expanded', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <WordCard item={baseItem} expanded={false} onToggle={onToggle} />,
    );

    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: 'Enter' });
    fireEvent.keyDown(toggle, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(3);

    // Escape should only trigger onToggle while expanded.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onToggle).toHaveBeenCalledTimes(3);

    rerender(<WordCard item={baseItem} expanded={true} onToggle={onToggle} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onToggle).toHaveBeenCalledTimes(4);
  });

  it('formats Chinese stats line matching the spec', () => {
    setFallbackLanguage('zh');
    render(<WordCard item={baseItem} expanded={true} onToggle={vi.fn()} />);

    expect(
      screen.getByText('首次学习 10月2日 · 复习 9 次 · 正确率 67% · 遗忘 2 次'),
    ).toBeInTheDocument();
  });
});
