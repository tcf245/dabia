import React, { useId, useState } from 'react';
import type { ProgressCounts } from '../../services/api';
import { useI18n } from '../../i18n/LanguageProvider';

export interface DeckProgressBarProps {
  counts: ProgressCounts;
  size?: 'regular' | 'thin';
}

const LEARNING_LEVELS = ['1', '2', '3', '4'] as const;

const rawPercent = (count: number, total: number): number =>
  total > 0 ? (count / total) * 100 : 0;

const formatPercent = (count: number, total: number): string =>
  total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%';

/** Three-colour deck progress bar (Mastered / Learning / Not started) with L1-L4 breakdown tooltip. */
export const DeckProgressBar: React.FC<DeckProgressBarProps> = ({
  counts,
  size = 'regular',
}) => {
  const { messages } = useI18n();
  const t = messages.words;
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);

  const showTooltip = size === 'regular' && (hovered || focused || pinned);
  const learned = counts.mastered + counts.learning;
  const hasTotal = counts.total > 0;

  const closeTooltip = () => {
    setHovered(false);
    setFocused(false);
    setPinned(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeTooltip();
    }
  };

  const tooltipTriggers = {
    'aria-describedby': showTooltip ? tooltipId : undefined,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setPinned(false);
    },
    onClick: () => setPinned((prev) => !prev),
    onKeyDown: handleKeyDown,
  };

  const barElement = (
    <div
      role="img"
      aria-label={t.progressAria(
        counts.mastered,
        counts.learning,
        counts.not_started,
        counts.total,
      )}
      className={`relative flex w-full overflow-hidden rounded-full bg-[#F2F0EF] shadow-[inset_0_0_0_1px_#E6E6E3] ${
        size === 'thin' ? 'h-[4px]' : 'h-[10px]'
      }`}
    >
      <div
        data-testid="progress-segment-mastered"
        className="h-full bg-[#B05030] animate-progress-width shrink-0"
        style={{
          width: `${rawPercent(counts.mastered, counts.total)}%`,
          minWidth: hasTotal && counts.mastered > 0 ? '2px' : undefined,
        }}
      />
      <div
        data-testid="progress-segment-learning"
        tabIndex={size === 'regular' && counts.learning > 0 ? 0 : undefined}
        {...(size === 'regular' ? tooltipTriggers : {})}
        className={`h-full bg-[#D97757] animate-progress-width shrink-0 ${
          size === 'regular' && counts.learning > 0
            ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]'
            : ''
        }`}
        style={{
          width: `${rawPercent(counts.learning, counts.total)}%`,
          minWidth: hasTotal && counts.learning > 0 ? '2px' : undefined,
        }}
      />
      <div
        data-testid="progress-segment-not-started"
        className="h-full bg-transparent shrink"
        style={{
          width: `${rawPercent(counts.not_started, counts.total)}%`,
          minWidth: hasTotal && counts.not_started > 0 ? '2px' : undefined,
        }}
      />
    </div>
  );

  if (size === 'thin') {
    return barElement;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-[#2A2A29] tabular-nums">
          {t.learnedOf(
            learned.toLocaleString(messages.locale),
            counts.total.toLocaleString(messages.locale),
          )}
        </span>
        <span className="text-sm font-medium text-[#2A2A29] tabular-nums">
          {formatPercent(learned, counts.total)}
        </span>
      </div>

      <div className="relative">{barElement}</div>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#888888]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#B05030]" aria-hidden="true" />
          <span>{t.mastered}</span>
          <span className="font-medium text-[#2A2A29] tabular-nums">
            {counts.mastered.toLocaleString(messages.locale)}
          </span>
          <span className="tabular-nums">({formatPercent(counts.mastered, counts.total)})</span>
        </span>

        <button
          type="button"
          {...tooltipTriggers}
          className="inline-flex items-center gap-1.5 rounded underline decoration-dotted decoration-[#D97757]/60 underline-offset-4 transition-colors hover:text-[#2A2A29] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#D97757]" aria-hidden="true" />
          <span>{t.learning}</span>
          <span className="font-medium text-[#2A2A29] tabular-nums">
            {counts.learning.toLocaleString(messages.locale)}
          </span>
          <span className="tabular-nums">({formatPercent(counts.learning, counts.total)})</span>
        </button>

        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full border border-[#E6E6E3] bg-[#F2F0EF]"
            aria-hidden="true"
          />
          <span>{t.notStarted}</span>
          <span className="font-medium text-[#2A2A29] tabular-nums">
            {counts.not_started.toLocaleString(messages.locale)}
          </span>
          <span className="tabular-nums">({formatPercent(counts.not_started, counts.total)})</span>
        </span>

        {showTooltip && (
          <div
            id={tooltipId}
            role="tooltip"
            className="absolute left-0 top-full z-20 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-[#E6E6E3] bg-white px-3.5 py-2 text-xs text-[#2A2A29] shadow-[0_8px_24px_-6px_rgba(42,42,41,0.12)]"
          >
            {LEARNING_LEVELS.map((level) => (
              <span key={level} className="inline-flex items-center gap-1 tabular-nums">
                <span className="text-[#888888]">{t.level(Number(level))}</span>
                <span className="font-medium">
                  {(counts.learning_by_level[level] ?? 0).toLocaleString(messages.locale)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckProgressBar;
