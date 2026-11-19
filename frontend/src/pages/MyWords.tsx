import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookMarked, ChevronDown } from 'lucide-react';
import * as api from '../services/api';
import { deckTitle } from '../utils/decks';
import { useI18n } from '../i18n/LanguageProvider';
import DeckProgressBar from '../components/words/DeckProgressBar';

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
  const { messages } = useI18n();
  const t = messages.words;
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<api.WordsProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

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

  const activeDecks = data ? data.decks.filter((deck) => deck.is_active) : [];
  const otherDecks = data ? data.decks.filter((deck) => !deck.is_active) : [];
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

  const handleDeckChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('deck', value);
    setSearchParams(next);
  };

  const currentCounts: api.ProgressCounts | null = (() => {
    if (!data || data.decks.length === 0) return null;
    if (selectedDeck === 'all') {
      // Response aggregate includes studied non-active decks, so sum active decks on the client.
      return sumProgressCounts(activeDecks);
    }
    return data.decks.find((deck) => deck.deck_id === selectedDeck) ?? null;
  })();

  const learnedCount = currentCounts ? currentCounts.mastered + currentCounts.learning : 0;

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
          </div>

          <section className="rounded-[20px] border border-[#E6E6E3] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <DeckProgressBar counts={currentCounts} size="regular" />
          </section>

          {learnedCount === 0 && (
            <div className="mt-6 rounded-[20px] border border-[#E6E6E3] bg-white p-10 text-center flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <p className="text-base text-[#2A2A29]">{t.notStartedDeck}</p>
              <Link
                to="/"
                className="rounded-xl bg-[#D97757] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
              >
                {t.startLearning}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyWords;
