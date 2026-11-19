import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWordsQuery, type UseWordsQueryParams } from './useWordsQuery';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  getWords: vi.fn(),
}));

const makeItem = (id: string, word = `word-${id}`): api.WordItem => ({
  card_id: id,
  deck: { id: 'd1', name: 'eggrolls-JLPT10k-v3::1-N4+N5' },
  word,
  reading: 'よみ',
  hint: 'meaning',
  sentence: 'これはテストです。',
  sentence_furigana: null,
  sentence_translation: 'This is a test.',
  audio_url: null,
  sentence_audio_url: null,
  language: 'en',
  proficiency_level: 2,
  status: 'learning',
  first_seen_at: '2026-10-02T08:14:00Z',
  last_reviewed_at: '2026-11-16T12:01:33Z',
  next_review_at: '2026-11-20T12:03:03Z',
  review_count: 3,
  correct_count: 2,
  accuracy: 66.7,
  lapses_count: 1,
});

describe('useWordsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches page 1 on mount and appends subsequent pages on loadMore', async () => {
    const page1 = [makeItem('1'), makeItem('2')];
    const page2 = [makeItem('3')];

    vi.mocked(api.getWords)
      .mockResolvedValueOnce({ total: 3, limit: 2, offset: 0, items: page1 })
      .mockResolvedValueOnce({ total: 3, limit: 2, offset: 2, items: page2 });

    const { result } = renderHook(() =>
      useWordsQuery({ deckIds: ['d1'], status: 'learning', limit: 2 }),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.getWords).toHaveBeenCalledTimes(1);
    expect(api.getWords).toHaveBeenCalledWith(
      expect.objectContaining({
        deckIds: ['d1'],
        status: 'learning',
        limit: 2,
        offset: 0,
      }),
    );
    expect(result.current.items.map((i) => i.card_id)).toEqual(['1', '2']);
    expect(result.current.total).toBe(3);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    expect(api.getWords).toHaveBeenCalledTimes(2);
    expect(api.getWords).toHaveBeenLastCalledWith(
      expect.objectContaining({
        offset: 2,
        limit: 2,
      }),
    );
    expect(result.current.items.map((i) => i.card_id)).toEqual(['1', '2', '3']);
  });

  it('resets items to offset 0 when filters change', async () => {
    vi.mocked(api.getWords)
      .mockResolvedValueOnce({ total: 2, limit: 50, offset: 0, items: [makeItem('1')] })
      .mockResolvedValueOnce({ total: 1, limit: 50, offset: 0, items: [makeItem('2')] });

    const { result, rerender } = renderHook(
      (props: UseWordsQueryParams) => useWordsQuery(props),
      { initialProps: { deckIds: ['d1'], status: 'learning' } as UseWordsQueryParams },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ deckIds: ['d1'], status: 'mastered' });

    await waitFor(() => expect(result.current.items.map((i) => i.card_id)).toEqual(['2']));
    expect(api.getWords).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'mastered', offset: 0 }),
    );
  });

  it('ignores stale responses from earlier queries', async () => {
    let resolveFirst: (val: api.WordsListResponse) => void = () => {};
    let resolveSecond: (val: api.WordsListResponse) => void = () => {};

    vi.mocked(api.getWords)
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
      .mockReturnValueOnce(new Promise((r) => { resolveSecond = r; }));

    const { result, rerender } = renderHook(
      (props: UseWordsQueryParams) => useWordsQuery(props),
      { initialProps: { deckIds: ['d1'], status: 'learning' } as UseWordsQueryParams },
    );

    rerender({ deckIds: ['d2'], status: 'learning' });

    await act(async () => {
      resolveSecond({ total: 1, limit: 50, offset: 0, items: [makeItem('new')] });
    });

    expect(result.current.items.map((i) => i.card_id)).toEqual(['new']);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolveFirst({ total: 1, limit: 50, offset: 0, items: [makeItem('stale')] });
    });

    expect(result.current.items.map((i) => i.card_id)).toEqual(['new']);
  });

  it('debounces search query by 300ms and guards sort=relevance', async () => {
    vi.useFakeTimers();
    vi.mocked(api.getWords).mockResolvedValue({
      total: 0,
      limit: 50,
      offset: 0,
      items: [],
    });

    const { rerender } = renderHook(
      (props: UseWordsQueryParams) => useWordsQuery(props),
      { initialProps: { deckIds: ['d1'], status: 'learning', q: '' } as UseWordsQueryParams },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.getWords).toHaveBeenCalledTimes(1);

    rerender({ deckIds: ['d1'], status: 'learning', q: 't', sort: 'relevance' });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    rerender({ deckIds: ['d1'], status: 'learning', q: 'tab', sort: 'relevance' });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    // Neither intermediate keystroke nor invalid sort=relevance without q fired.
    expect(api.getWords).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(api.getWords).toHaveBeenCalledTimes(2);
    expect(api.getWords).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'tab', sort: 'relevance', offset: 0 }),
    );
  });

  it('supports retry after initial failure and after loadMore failure', async () => {
    vi.mocked(api.getWords)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ total: 2, limit: 1, offset: 0, items: [makeItem('1')] })
      .mockRejectedValueOnce(new Error('page2 boom'))
      .mockResolvedValueOnce({ total: 2, limit: 1, offset: 1, items: [makeItem('2')] });

    const { result } = renderHook(() =>
      useWordsQuery({ deckIds: ['d1'], status: 'learning', limit: 1 }),
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.items).toEqual([]);

    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.items.map((i) => i.card_id)).toEqual(['1']);

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.items.map((i) => i.card_id)).toEqual(['1']);

    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => i.card_id)).toEqual(['1', '2']);
  });

  it('does not fetch while disabled', () => {
    const { result } = renderHook(() =>
      useWordsQuery({ deckIds: ['d1'], status: 'learning', enabled: false }),
    );

    expect(api.getWords).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
  });
});
