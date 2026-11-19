import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Volume2 } from 'lucide-react';
import type { WordItem } from '../../services/api';
import { useI18n } from '../../i18n/LanguageProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { buildSentenceSegments } from '../../utils/furigana';
import { formatRelativeTime, formatShortDate } from '../../utils/wordTime';

export interface WordCardProps {
  item: WordItem;
  expanded: boolean;
  onToggle: () => void;
  onPlayAudio?: (url: string) => void;
  playingAudioUrl?: string | null;
  now?: number;
}

const LEVEL_DOTS = [1, 2, 3, 4, 5] as const;

/** Compact learned-word card; collapses to key details and expands inline across the grid row. */
export const WordCard: React.FC<WordCardProps> = ({
  item,
  expanded,
  onToggle,
  onPlayAudio,
  playingAudioUrl,
  now,
}) => {
  const { messages } = useI18n();
  const t = messages.words;
  const panelId = useId();
  const [mountNow] = useState(() => Date.now());
  const currentNow = now ?? mountNow;

  // Standalone audio management when rendered outside WordGrid (e.g. in unit tests).
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [localPlayingUrl, setLocalPlayingUrl] = useState<string | null>(null);
  const activePlayingUrl = onPlayAudio ? playingAudioUrl : localPlayingUrl;

  useEscapeKey(expanded, onToggle);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = (url: string) => {
    if (onPlayAudio) {
      onPlayAudio(url);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setLocalPlayingUrl(url);
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setLocalPlayingUrl(null);
      }
    };
    audio.play()?.catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setLocalPlayingUrl(null);
      }
    });
  };

  const handleToggleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const isMastered = item.status === 'mastered';
  const dotFillClass = isMastered ? 'bg-[#B05030]' : 'bg-[#D97757]';

  const footerStatusText = (() => {
    if (isMastered) {
      return item.next_review_at
        ? t.masteredNext(formatShortDate(item.next_review_at, messages.locale))
        : t.mastered;
    }
    const nextMs = item.next_review_at ? Date.parse(item.next_review_at) : Number.NaN;
    if (!Number.isNaN(nextMs) && nextMs > currentNow && item.next_review_at) {
      return t.dueRelative(
        formatRelativeTime(item.next_review_at, messages.locale, currentNow),
      );
    }
    if (item.last_reviewed_at) {
      return t.reviewedRelative(
        formatRelativeTime(item.last_reviewed_at, messages.locale, currentNow),
      );
    }
    if (item.next_review_at) {
      return t.dueRelative(
        formatRelativeTime(item.next_review_at, messages.locale, currentNow),
      );
    }
    return t.learning;
  })();

  const sentenceSegments = expanded
    ? buildSentenceSegments(item.sentence, item.sentence_furigana, item.word)
    : [];

  const statsParts: string[] = [];
  if (item.first_seen_at) {
    statsParts.push(
      t.statsFirstSeen(formatShortDate(item.first_seen_at, messages.locale)),
    );
  }
  statsParts.push(t.statsReviews(item.review_count));
  if (item.accuracy !== null) {
    statsParts.push(t.statsAccuracy(Math.round(item.accuracy)));
  }
  statsParts.push(t.statsLapses(item.lapses_count));

  return (
    <article
      className={`rounded-[20px] border bg-white transition-colors ${
        expanded
          ? 'col-span-full border-[#D97757] shadow-[0_8px_24px_rgba(42,42,41,0.06)]'
          : 'border-[#E6E6E3] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-[#E5A087]'
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        onKeyDown={handleToggleKeyDown}
        className="flex min-h-[112px] w-full flex-col justify-between p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-inset rounded-[20px]"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span lang="ja" className="truncate text-xs text-[#888888]">
            {item.reading ?? ''}
          </span>
          <span
            role="img"
            aria-label={t.levelDotsAria(item.proficiency_level)}
            className="flex shrink-0 items-center gap-1"
          >
            {LEVEL_DOTS.map((dot) => (
              <span
                key={dot}
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  dot <= item.proficiency_level ? dotFillClass : 'bg-[#F2F0EF]'
                }`}
              />
            ))}
          </span>
        </div>

        <div className="my-1.5 min-w-0">
          <div
            lang="ja"
            className="font-serif text-[28px] leading-tight font-normal text-[#2A2A29] truncate"
          >
            {item.word}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-[#888888]">
            {item.hint ?? ''}
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-2 text-xs text-[#888888]">
          <span className="truncate">{footerStatusText}</span>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-200 ${
              expanded ? 'rotate-180 text-[#D97757]' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div
          id={panelId}
          className="animate-expand-in space-y-3 rounded-b-[20px] border-t border-[#E6E6E3] bg-[#F9F9F8] px-5 py-4"
        >
          {sentenceSegments.length > 0 && (
            <p
              lang="ja"
              className="font-serif text-lg leading-loose text-[#2A2A29]"
            >
              {sentenceSegments.map((seg, idx) => {
                const highlightClass = seg.highlighted
                  ? 'font-medium text-[#D97757]'
                  : undefined;
                if (seg.reading) {
                  return (
                    <ruby key={idx} className={highlightClass}>
                      {seg.text}
                      <rt className="text-[10px] font-normal text-[#888888] select-none">
                        {seg.reading}
                      </rt>
                    </ruby>
                  );
                }
                return (
                  <span key={idx} className={highlightClass}>
                    {seg.text}
                  </span>
                );
              })}
            </p>
          )}

          {item.sentence_translation && (
            <p className="text-sm text-[#888888]">{item.sentence_translation}</p>
          )}

          {(item.audio_url || item.sentence_audio_url) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {item.audio_url && (
                <button
                  type="button"
                  onClick={() => handlePlay(item.audio_url!)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] ${
                    activePlayingUrl === item.audio_url
                      ? 'border-[#D97757] bg-[#F2DCD6] text-[#B05030]'
                      : 'border-[#E6E6E3] bg-white text-[#2A2A29] hover:border-[#D97757] hover:text-[#D97757]'
                  }`}
                >
                  <Volume2 size={14} aria-hidden="true" />
                  <span>{t.wordAudio}</span>
                </button>
              )}
              {item.sentence_audio_url && (
                <button
                  type="button"
                  onClick={() => handlePlay(item.sentence_audio_url!)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] ${
                    activePlayingUrl === item.sentence_audio_url
                      ? 'border-[#D97757] bg-[#F2DCD6] text-[#B05030]'
                      : 'border-[#E6E6E3] bg-white text-[#2A2A29] hover:border-[#D97757] hover:text-[#D97757]'
                  }`}
                >
                  <Volume2 size={14} aria-hidden="true" />
                  <span>{t.sentenceAudio}</span>
                </button>
              )}
            </div>
          )}

          <p className="pt-1 text-xs text-[#888888] tabular-nums">
            {statsParts.join(' · ')}
          </p>
        </div>
      )}
    </article>
  );
};

export default WordCard;
