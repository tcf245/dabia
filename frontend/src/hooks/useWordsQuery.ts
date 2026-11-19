import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getWords,
  type WordItem,
  type WordsQuery,
  type WordsSortKey,
  type WordsSortOrder,
  type WordsStatusFilter,
} from '../services/api';

export interface UseWordsQueryParams {
  deckIds?: string[];
  allDecks?: boolean;
  status?: WordsStatusFilter;
  levels?: number[];
  q?: string;
  sort?: WordsSortKey;
  order?: WordsSortOrder;
  enabled?: boolean;
  limit?: number;
  debounceMs?: number;
  refetchKey?: string;
}

export interface UseWordsQueryResult {
  items: WordItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  loadMore: () => void;
  retry: () => void;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Owns fetching, 300ms search debouncing, offset pagination, and stale-response cancellation
 * for the word list. Resets to offset 0 whenever filters, deck, or sort change.
 */
export const useWordsQuery = ({
  deckIds,
  allDecks,
  status,
  levels,
  q,
  sort,
  order,
  enabled = true,
  limit = DEFAULT_LIMIT,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  refetchKey,
}: UseWordsQueryParams): UseWordsQueryResult => {
  const trimmedQ = (q ?? '').trim();
  const [debouncedQ, setDebouncedQ] = useState(trimmedQ);

  const [items, setItems] = useState<WordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestIdRef = useRef(0);
  const lastFailedOffsetRef = useRef<number | null>(null);

  useEffect(() => {
    if (trimmedQ === debouncedQ) return;
    const timer = window.setTimeout(() => {
      setDebouncedQ(trimmedQ);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [trimmedQ, debouncedQ, debounceMs]);

  const hasDeckIds = deckIds !== undefined;
  const deckIdsKey = deckIds?.join(',') ?? '';
  const levelsKey = levels?.join(',') ?? '';

  const parsedDeckIds = useMemo(
    () => (hasDeckIds ? (deckIdsKey ? deckIdsKey.split(',') : []) : undefined),
    [hasDeckIds, deckIdsKey],
  );

  const parsedLevels = useMemo(
    () =>
      status === 'learning' && levelsKey
        ? levelsKey.split(',').map(Number)
        : undefined,
    [status, levelsKey],
  );

  // Never send sort=relevance without a query string (backend rejects with 422).
  const effectiveSort = sort === 'relevance' && !debouncedQ ? undefined : sort;

  const buildQuery = useCallback(
    (offset: number): WordsQuery => ({
      deckIds: parsedDeckIds,
      allDecks,
      status,
      levels: parsedLevels,
      q: debouncedQ || undefined,
      sort: effectiveSort,
      order,
      limit,
      offset,
    }),
    [parsedDeckIds, allDecks, status, parsedLevels, debouncedQ, effectiveSort, order, limit],
  );

  const fetchPage = useCallback(
    (offset: number, append: boolean) => {
      const reqId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setItems([]);
        setTotal(0);
        setLoading(true);
        setLoadingMore(false);
      }
      setError(null);
      lastFailedOffsetRef.current = null;

      getWords(buildQuery(offset))
        .then((response) => {
          if (reqId !== requestIdRef.current) return;
          setItems((prev) => (append ? [...prev, ...response.items] : response.items));
          setTotal(response.total);
          setLoading(false);
          setLoadingMore(false);
        })
        .catch((err) => {
          if (reqId !== requestIdRef.current) return;
          lastFailedOffsetRef.current = offset;
          setError(err instanceof Error ? err : new Error('Failed to load words'));
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [buildQuery],
  );

  useEffect(() => {
    void refetchKey;
    if (!enabled) {
      requestIdRef.current += 1;
      setItems([]);
      setTotal(0);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      lastFailedOffsetRef.current = null;
      return;
    }
    if (trimmedQ !== debouncedQ) {
      return;
    }
    fetchPage(0, false);
    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, trimmedQ, debouncedQ, fetchPage, refetchKey]);

  const loadMore = useCallback(() => {
    if (!enabled || loading || loadingMore || items.length >= total) return;
    fetchPage(items.length, true);
  }, [enabled, loading, loadingMore, items.length, total, fetchPage]);

  const retry = useCallback(() => {
    if (!enabled) return;
    const failedOffset = lastFailedOffsetRef.current;
    if (failedOffset !== null && failedOffset > 0) {
      fetchPage(failedOffset, true);
    } else {
      fetchPage(0, false);
    }
  }, [enabled, fetchPage]);

  return { items, total, loading, loadingMore, error, loadMore, retry };
};
