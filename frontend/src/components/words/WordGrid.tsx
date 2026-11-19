import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { WordItem } from '../../services/api';
import WordCard from './WordCard';

export interface WordGridProps {
  items: WordItem[];
  expandedCardId: string | null;
  onToggleCard: (cardId: string) => void;
}

/** Responsive 1/2/3-column grid of WordCards with shared single-track audio playback. */
export const WordGrid: React.FC<WordGridProps> = ({
  items,
  expandedCardId,
  onToggleCard,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudioUrl(null);
  }, []);

  useEffect(() => {
    stopAudio();
  }, [expandedCardId, stopAudio]);

  useEffect(() => stopAudio, [stopAudio]);

  const handlePlayAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioUrl(url);
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingAudioUrl(null);
      }
    };
    audio.play()?.catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingAudioUrl(null);
      }
    });
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <WordCard
          key={item.card_id}
          item={item}
          expanded={expandedCardId === item.card_id}
          onToggle={() => onToggleCard(item.card_id)}
          onPlayAudio={handlePlayAudio}
          playingAudioUrl={playingAudioUrl}
        />
      ))}
    </div>
  );
};

export default WordGrid;
