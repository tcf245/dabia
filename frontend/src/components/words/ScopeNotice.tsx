import React from 'react';
import { Info } from 'lucide-react';
import type { WordsStatusFilter } from '../../services/api';
import { useI18n } from '../../i18n/LanguageProvider';
import { deckTitle } from '../../utils/decks';

export interface ScopeNoticeProps {
  deckName: string | null;
  activeDeckCount: number;
  status: WordsStatusFilter;
  count: number | null;
  levels?: number[];
  query?: string;
}

/** One-line scope summary between filters and the word grid; announces filter updates politely. */
export const ScopeNotice: React.FC<ScopeNoticeProps> = ({
  deckName,
  activeDeckCount,
  status,
  count,
  levels,
  query,
}) => {
  const { messages } = useI18n();
  const t = messages.words;

  const deckSegment = deckName
    ? t.scopeDeck(deckTitle(deckName, messages.decks.grammarSuffix))
    : t.scopeAllActiveDecks(activeDeckCount);

  const parts: string[] = [deckSegment, t.tabs[status]];

  if (count !== null) {
    parts.push(t.scopeCount(count));
  }

  if (status === 'learning' && levels && levels.length > 0) {
    const sorted = [...levels].sort((a, b) => a - b);
    parts.push(t.scopeLevels(sorted));
  }

  const trimmedQuery = query?.trim();
  if (trimmedQuery) {
    parts.push(t.scopeSearch(trimmedQuery));
  }

  return (
    <p
      aria-live="polite"
      className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#888888]"
    >
      <Info size={14} aria-hidden="true" className="shrink-0" />
      <span>{parts.join(' · ')}</span>
    </p>
  );
};

export default ScopeNotice;
