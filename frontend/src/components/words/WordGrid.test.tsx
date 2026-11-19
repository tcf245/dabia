import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WordGrid from './WordGrid';
import type { WordItem } from '../../services/api';
import { en } from '../../i18n/messages/en';
import { setFallbackLanguage } from '../../i18n/context';

setFallbackLanguage('en');

const item = (id: string, word: string): WordItem => ({
    card_id: id, deck: { id: 'd1', name: 'Deck' }, word, reading: 'よみ', hint: 'meaning',
    sentence: `${word}です。`, sentence_furigana: null, sentence_translation: 'It is.',
    audio_url: `https://cdn.example.com/${id}.mp3`, sentence_audio_url: `https://cdn.example.com/${id}-s.mp3`,
    language: 'en', proficiency_level: 2, status: 'learning', first_seen_at: null, last_reviewed_at: null,
    next_review_at: null, review_count: 0, correct_count: 0, accuracy: null, lapses_count: 0,
});
const ITEMS = [item('c1', '何'), item('c2', '花')];
const playing = (button: HTMLElement) => button.className.includes('bg-[#F2DCD6]');

describe('WordGrid', () => {
    it('plays one track at a time and clears the state when it ends', () => {
        render(<WordGrid items={ITEMS} expandedCardId="c1" onToggleCard={vi.fn()} />);
        const wordBtn = screen.getByRole('button', { name: en.words.wordAudio });
        const sentenceBtn = screen.getByRole('button', { name: en.words.sentenceAudio });

        fireEvent.click(wordBtn);
        expect(playing(wordBtn)).toBe(true);
        fireEvent.click(sentenceBtn);
        expect(globalThis.pauseMock).toHaveBeenCalled();
        expect(playing(wordBtn)).toBe(false);
        expect(playing(sentenceBtn)).toBe(true);

        act(() => globalThis.triggerOnended());
        expect(playing(sentenceBtn)).toBe(false);
    });

    it('clears the playing state when playback is refused', async () => {
        globalThis.playMock.mockImplementationOnce(() => Promise.reject(new Error('autoplay blocked')));
        render(<WordGrid items={ITEMS} expandedCardId="c1" onToggleCard={vi.fn()} />);
        const wordBtn = screen.getByRole('button', { name: en.words.wordAudio });

        fireEvent.click(wordBtn);
        await waitFor(() => expect(playing(wordBtn)).toBe(false));
    });

    it('stops the audio when another card is expanded', () => {
        const { rerender } = render(<WordGrid items={ITEMS} expandedCardId="c1" onToggleCard={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: en.words.wordAudio }));
        globalThis.pauseMock.mockClear();

        rerender(<WordGrid items={ITEMS} expandedCardId="c2" onToggleCard={vi.fn()} />);
        expect(globalThis.pauseMock).toHaveBeenCalled();
    });

    it('passes card clicks to onToggleCard with the card id', () => {
        const onToggle = vi.fn();
        render(<WordGrid items={ITEMS} expandedCardId={null} onToggleCard={onToggle} />);
        fireEvent.click(screen.getByText('花'));
        expect(onToggle).toHaveBeenCalledWith('c2');
    });
});
