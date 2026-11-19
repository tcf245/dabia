import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookMarked, ChevronDown, Search, X } from 'lucide-react';
import * as api from '../services/api';
import { deckTitle } from '../utils/decks';
import { useI18n } from '../i18n/LanguageProvider';
import type { Messages } from '../i18n';
import { useWordsQuery } from '../hooks/useWordsQuery';
import DeckProgressBar from '../components/words/DeckProgressBar';
import ExportButton from '../components/words/ExportButton';
import ScopeNotice from '../components/words/ScopeNotice';
import WordGrid from '../components/words/WordGrid';

const LEARNING_LEVELS = [1, 2, 3, 4] as const;

const VALID_STATUSES: ReadonlySet<api.WordsStatusFilter> = new Set([
  'all',
  'learning',
  'mastered',
]);

const VALID_STANDARD_SORTS: ReadonlySet<api.WordsSortKey> = new Set([
  'last_reviewed',
  'next_review',
  'level',
  'first_seen',
  'lapses',
]);

const STANDARD_SORT_OPTIONS: ReadonlyArray<{
  key: api.WordsSortKey;
  labelKey: keyof Messages['words']['sort'];
}> = [
  { key: 'last_reviewed', labelKey: 'lastReviewed' },
  { key: 'next_review', labelKey: 'nextReview' },
  { key: 'level', labelKey: 'level' },
  { key: 'first_seen', labelKey: 'firstSeen' },
  { key: 'lapses', labelKey: 'lapses' },
];

const parseLevels = (raw: string | null): number[] => {
  if (!raw) return [];
  const seen = new Set<number>();
  for (const part of raw.split(',')) {
    const value = Number(part.trim());
    if (Number.isInteger(value) && value >= 1 && value <= 4) {
      seen.add(value);
    }
  }
  return Array.from(seen).sort((a, b) => a - b);
};

const sumProgressCounts = (decks: api.DeckProgress[]): api.ProgressCounts => {
  const sum: api.ProgressCounts = {
    total: 0,
    mastered: 0,
    learning: 0,
    not_started: 0,
    learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
  };
  for (const deck of decks) {
    sum.total += deck.total;
    sum.mastered += deck.mastered;
    sum.learning += deck.learning;
    sum.not_started += deck.not_started;
    for (const level of ['1', '2', '3', '4']) {
      sum.learning_by_level[level] += deck.learning_by_level[level] ?? 0;
    }
  }
  return sum;
};

const MyWords: React.FC = () => {
  const { language, messages } = useI18n();
  const t = messages.words;
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<api.WordsProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getWordsProgress({ includeStudied: true })
      .then((response) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((err) => {
        console.error('Failed to load words progress:', err);
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    setAttempt((prev) => prev + 1);
  };

  const activeDecks = useMemo(
    () => (data ? data.decks.filter((deck) => deck.is_active) : []),
    [data],
  );
  const otherDecks = useMemo(
    () => (data ? data.decks.filter((deck) => !deck.is_active) : []),
    [data],
  );
  const hasMultipleActive = activeDecks.length > 1;
  const urlDeck = searchParams.get('deck');

  let selectedDeck = '';
  if (data && data.decks.length > 0) {
    if (urlDeck === 'all' && hasMultipleActive) {
      selectedDeck = 'all';
    } else if (urlDeck && data.decks.some((deck) => deck.deck_id === urlDeck)) {
      selectedDeck = urlDeck;
    } else if (activeDecks.length > 0) {
      selectedDeck = activeDecks[0].deck_id;
    } else {
      selectedDeck = otherDecks[0].deck_id;
    }
  }

  const rawStatus = searchParams.get('status');
  const status: api.WordsStatusFilter =
    rawStatus && VALID_STATUSES.has(rawStatus as api.WordsStatusFilter)
      ? (rawStatus as api.WordsStatusFilter)
      : 'learning';

  const levels = useMemo(
    () => (status === 'learning' ? parseLevels(searchParams.get('level')) : []),
    [status, searchParams],
  );

  const q = searchParams.get('q') ?? '';
  const hasQuery = q.trim().length > 0;

  const rawSort = searchParams.get('sort') as api.WordsSortKey | null;
  const sort: api.WordsSortKey = hasQuery
    ? rawSort === 'relevance' || (rawSort && VALID_STANDARD_SORTS.has(rawSort))
      ? rawSort
      : 'relevance'
    : rawSort && VALID_STANDARD_SORTS.has(rawSort)
      ? rawSort
      : 'last_reviewed';

  const currentCounts: api.ProgressCounts | null = (() => {
    if (!data || data.decks.length === 0) return null;
    if (selectedDeck === 'all') {
      // Response aggregate includes studied non-active decks, so sum active decks on the client.
      return sumProgressCounts(activeDecks);
    }
    return data.decks.find((deck) => deck.deck_id === selectedDeck) ?? null;
  })();

  const learnedCount = currentCounts ? currentCounts.mastered + currentCounts.learning : 0;

  const allDecksLearnedCount = useMemo(
    () =>
      data
        ? data.decks.reduce((sum, deck) => sum + deck.mastered + deck.learning, 0)
        : 0,
    [data],
  );

  const selectedDeckObj =
    selectedDeck && selectedDeck !== 'all'
      ? data?.decks.find((deck) => deck.deck_id === selectedDeck) ?? null
      : null;

  const exportDeckLabel =
    selectedDeck === 'all'
      ? t.allActiveDecks
      : selectedDeckObj
        ? deckTitle(selectedDeckObj.name, messages.decks.grammarSuffix)
        : '';

  const queryDeckIds = useMemo(() => {
    if (!selectedDeck) return [];
    if (selectedDeck === 'all') {
      return activeDecks.map((deck) => deck.deck_id);
    }
    return [selectedDeck];
  }, [selectedDeck, activeDecks]);

  const currentExportQuery = useMemo<api.WordsExportQuery>(() => {
    const trimmedQ = q.trim();
    const query: api.WordsExportQuery = {
      deckIds: queryDeckIds,
      status,
      sort: sort === 'relevance' && !trimmedQ ? undefined : sort,
    };
    if (status === 'learning' && levels.length > 0) {
      query.levels = levels;
    }
    if (trimmedQ) {
      query.q = trimmedQ;
    }
    return query;
  }, [queryDeckIds, status, levels, q, sort]);

  const listEnabled =
    !loading &&
    !error &&
    Boolean(currentCounts) &&
    learnedCount > 0 &&
    queryDeckIds.length > 0;

  const {
    items,
    total: listTotal,
    loading: listLoading,
    loadingMore,
    error: listError,
    loadMore,
    retry: retryList,
  } = useWordsQuery({
    deckIds: queryDeckIds,
    status,
    levels,
    q,
    sort,
    enabled: listEnabled,
    refetchKey: language,
  });

  const handleDeckChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('deck', value);
    setExpandedCardId(null);
    setSearchParams(next);
  };

  const handleStatusChange = (nextStatus: api.WordsStatusFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', nextStatus);
    if (nextStatus !== 'learning') {
      next.delete('level');
    }
    setExpandedCardId(null);
    setSearchParams(next);
  };

  const handleLevelToggle = (lvl: number) => {
    const nextLevels = levels.includes(lvl)
      ? levels.filter((item) => item !== lvl)
      : [...levels, lvl].sort((a, b) => a - b);
    const next = new URLSearchParams(searchParams);
    if (nextLevels.length > 0) {
      next.set('level', nextLevels.join(','));
    } else {
      next.delete('level');
    }
    setExpandedCardId(null);
    setSearchParams(next);
  };

  const handleClearLevels = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('level');
    setExpandedCardId(null);
    setSearchParams(next);
  };

  const handleSearchChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    const wasEmpty = q.trim().length === 0;
    const isEmpty = value.trim().length === 0;
    if (value) {
      next.set('q', value);
    } else {
      next.delete('q');
    }
    if (wasEmpty && !isEmpty) {
      next.set('sort', 'relevance');
    } else if (!wasEmpty && isEmpty && searchParams.get('sort') === 'relevance') {
      next.delete('sort');
    }
    setExpandedCardId(null);
    setSearchParams(next, { replace: true });
  };

  const handleClearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    if (next.get('sort') === 'relevance') {
      next.delete('sort');
    }
    setExpandedCardId(null);
    setSearchParams(next);
  };

  const handleSortChange = (nextSort: api.WordsSortKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', nextSort);
    setExpandedCardId(null);
    setSearchParams(next);
  };

  const handleToggleCard = (cardId: string) => {
    setExpandedCardId((prev) => (prev === cardId ? null : cardId));
  };

  const statusTabs: ReadonlyArray<{
    value: api.WordsStatusFilter;
    label: string;
    count: number;
  }> = currentCounts
    ? [
        { value: 'all', label: t.tabs.all, count: learnedCount },
        { value: 'learning', label: t.tabs.learning, count: currentCounts.learning },
        { value: 'mastered', label: t.tabs.mastered, count: currentCounts.mastered },
      ]
    : [];

  return (
    <div className="pb-24 w-full max-w-4xl mx-auto">
      <header className="text-center mb-12">
        <h1
          className="font-serif text-5xl font-normal text-[#2A2A29] mb-4 tracking-tight"
          style={{ lineHeight: '1' }}
        >
          {t.title}
        </h1>
        <p className="text-[#888888] text-sm font-light tracking-wider mt-3">{t.subtitle}</p>
      </header>

      {loading && (
        <div data-testid="words-loading-skeleton" className="animate-pulse space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-4 w-12 rounded bg-[#F2F0EF]" />
            <div className="h-10 w-56 rounded-xl border border-[#E6E6E3] bg-white" />
          </div>
          <div className="rounded-[20px] border border-[#E6E6E3] bg-white p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-4 w-40 rounded bg-[#F2F0EF]" />
              <div className="h-4 w-12 rounded bg-[#F2F0EF]" />
            </div>
            <div className="h-[10px] w-full rounded-full bg-[#F2F0EF]" />
            <div className="h-3.5 w-72 rounded bg-[#F2F0EF]" />
            <div className="h-3.5 w-48 rounded bg-[#F2F0EF]" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-[20px] border border-[#E6E6E3] bg-white p-8 text-center flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
        >
          <p className="text-sm text-[#2A2A29]">{t.loadError}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl bg-[#D97757] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
          >
            {t.retry}
          </button>
        </div>
      )}

      {!loading && !error && data && data.decks.length === 0 && (
        <div className="rounded-[20px] border border-[#E6E6E3] bg-white p-10 text-center flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2DCD6] text-[#B05030]">
            <BookMarked size={22} />
          </div>
          <p className="text-base text-[#2A2A29]">{t.noActiveDecks}</p>
          <Link
            to="/decks"
            className="rounded-xl bg-[#D97757] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
          >
            {t.chooseDecks}
          </Link>
        </div>
      )}

      {!loading && !error && currentCounts && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="words-deck-select" className="text-sm text-[#888888]">
                {t.deckLabel}
              </label>
              <div className="relative">
                <select
                  id="words-deck-select"
                  value={selectedDeck}
                  onChange={(e) => handleDeckChange(e.target.value)}
                  className="h-10 appearance-none rounded-xl border border-[#E6E6E3] bg-white pl-3.5 pr-9 text-sm font-medium text-[#2A2A29] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#D97757] focus:border-[#D97757] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                >
                  {activeDecks.map((deck) => (
                    <option key={deck.deck_id} value={deck.deck_id}>
                      {deckTitle(deck.name, messages.decks.grammarSuffix)}
                    </option>
                  ))}
                  {hasMultipleActive && <option value="all">{t.allActiveDecks}</option>}
                  {otherDecks.length > 0 && (
                    <optgroup label={t.otherDecks}>
                      {otherDecks.map((deck) => (
                        <option key={deck.deck_id} value={deck.deck_id}>
                          {deckTitle(deck.name, messages.decks.grammarSuffix)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888888]"
                />
              </div>
            </div>

            <ExportButton
              currentQuery={currentExportQuery}
              deckLabel={exportDeckLabel}
              status={status}
              currentListCount={listTotal}
              currentDeckCount={learnedCount}
              allDecksCount={allDecksLearnedCount}
            />
          </div>

          <section className="rounded-[20px] border border-[#E6E6E3] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <DeckProgressBar counts={currentCounts} size="regular" />
          </section>

          {learnedCount === 0 ? (
            <div className="mt-6 rounded-[20px] border border-[#E6E6E3] bg-white p-10 text-center flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <p className="text-base text-[#2A2A29]">{t.notStartedDeck}</p>
              <Link
                to="/"
                className="rounded-xl bg-[#D97757] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
              >
                {t.startLearning}
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Status tabs */}
              <div
                role="tablist"
                aria-label={t.tabsAria}
                className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#E6E6E3] bg-[#F2F0EF] p-1"
              >
                {statusTabs.map((tab) => {
                  const selected = status === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => handleStatusChange(tab.value)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] ${
                        selected
                          ? 'bg-white text-[#2A2A29] shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                          : 'text-[#888888] hover:text-[#2A2A29]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-xs tabular-nums ${
                          selected ? 'text-[#D97757]' : 'text-[#888888]'
                        }`}
                      >
                        {tab.count.toLocaleString(messages.locale)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filter row: level chips (Learning only) + search + sort */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {status === 'learning' ? (
                  <div
                    aria-label={t.levelFilterLabel}
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
                  >
                    <span className="mr-1 shrink-0 text-xs text-[#888888]">
                      {t.levelFilterLabel}
                    </span>
                    {LEARNING_LEVELS.map((lvl) => {
                      const active = levels.includes(lvl);
                      return (
                        <button
                          key={lvl}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleLevelToggle(lvl)}
                          className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] ${
                            active
                              ? 'border-[#D97757] bg-[#F2DCD6] text-[#B05030]'
                              : 'border-[#E6E6E3] bg-white text-[#888888] hover:border-[#E5A087] hover:text-[#2A2A29]'
                          }`}
                        >
                          {t.level(lvl)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex w-full sm:w-auto flex-1 sm:flex-initial items-center gap-2.5 justify-end">
                  <div className="relative flex-1 sm:w-64 sm:flex-initial">
                    <Search
                      size={15}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]"
                    />
                    <input
                      type="text"
                      value={q}
                      maxLength={64}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      aria-label={t.searchPlaceholder}
                      className="h-10 w-full rounded-xl border border-[#E6E6E3] bg-white pl-9 pr-8 text-sm text-[#2A2A29] placeholder:text-[#888888] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#E5A087] focus:border-[#D97757] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                    />
                    {q && (
                      <button
                        type="button"
                        aria-label={t.clearSearch}
                        onClick={handleClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#888888] transition-colors hover:bg-[#F2F0EF] hover:text-[#2A2A29] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    <select
                      aria-label={t.sortLabel}
                      value={sort}
                      onChange={(e) => handleSortChange(e.target.value as api.WordsSortKey)}
                      className="h-10 appearance-none rounded-xl border border-[#E6E6E3] bg-white pl-3.5 pr-9 text-sm text-[#2A2A29] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#D97757] focus:border-[#D97757] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                    >
                      {hasQuery && <option value="relevance">{t.sort.relevance}</option>}
                      {STANDARD_SORT_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {t.sort[opt.labelKey]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888888]"
                    />
                  </div>
                </div>
              </div>

              <ScopeNotice
                deckName={selectedDeck === 'all' ? null : (selectedDeckObj?.name ?? null)}
                activeDeckCount={activeDecks.length}
                status={status}
                count={listLoading ? null : listTotal}
                levels={levels}
                query={q}
              />

              {listLoading && (
                <div
                  data-testid="words-list-skeleton"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse"
                >
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className="min-h-[112px] rounded-[20px] border border-[#E6E6E3] bg-white p-4 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-12 rounded bg-[#F2F0EF]" />
                        <div className="h-2.5 w-14 rounded bg-[#F2F0EF]" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-7 w-24 rounded bg-[#F2F0EF]" />
                        <div className="h-3.5 w-36 rounded bg-[#F2F0EF]" />
                      </div>
                      <div className="h-3 w-28 rounded bg-[#F2F0EF]" />
                    </div>
                  ))}
                </div>
              )}

              {!listLoading && listError && items.length === 0 && (
                <div
                  role="alert"
                  className="rounded-[20px] border border-[#E6E6E3] bg-white p-8 text-center flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                >
                  <p className="text-sm text-[#2A2A29]">{t.listLoadError}</p>
                  <button
                    type="button"
                    onClick={retryList}
                    className="rounded-xl bg-[#D97757] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
                  >
                    {t.retry}
                  </button>
                </div>
              )}

              {!listLoading && !listError && items.length === 0 && (
                <div className="rounded-[20px] border border-[#E6E6E3] bg-white p-10 text-center flex flex-col items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  {hasQuery ? (
                    <>
                      <p className="text-base text-[#2A2A29]">{t.emptySearch}</p>
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="text-sm font-medium text-[#D97757] underline underline-offset-4 transition-colors hover:text-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                      >
                        {t.clearSearch}
                      </button>
                    </>
                  ) : status === 'learning' && levels.length > 0 ? (
                    <>
                      <p className="text-base text-[#2A2A29]">{t.emptyLevelFilter}</p>
                      <button
                        type="button"
                        onClick={handleClearLevels}
                        className="text-sm font-medium text-[#D97757] underline underline-offset-4 transition-colors hover:text-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                      >
                        {t.clearFilter}
                      </button>
                    </>
                  ) : (
                    <p className="text-base text-[#2A2A29]">
                      {status === 'mastered'
                        ? t.emptyMastered
                        : status === 'learning'
                          ? t.emptyLearning
                          : t.emptyAll}
                    </p>
                  )}
                </div>
              )}

              {!listLoading && items.length > 0 && (
                <>
                  <WordGrid
                    items={items}
                    expandedCardId={expandedCardId}
                    onToggleCard={handleToggleCard}
                  />

                  <div className="pt-2 flex flex-col items-center gap-3">
                    <p className="text-xs text-[#888888] tabular-nums">
                      {t.showingOf(
                        items.length.toLocaleString(messages.locale),
                        listTotal.toLocaleString(messages.locale),
                      )}
                    </p>
                    {items.length < listTotal &&
                      (listError ? (
                        <div role="alert" className="flex items-center gap-3 text-sm">
                          <span className="text-[#888888]">{t.listLoadError}</span>
                          <button
                            type="button"
                            onClick={retryList}
                            className="rounded-xl border border-[#D97757] px-4 py-1.5 text-sm font-medium text-[#D97757] transition-colors hover:bg-[#F2DCD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                          >
                            {t.retry}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={loadMore}
                          disabled={loadingMore}
                          className="rounded-xl border border-[#E6E6E3] bg-white px-6 py-2.5 text-sm font-medium text-[#2A2A29] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#D97757] hover:text-[#D97757] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                        >
                          {loadingMore ? t.loadingMore : t.loadMore}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyWords;
