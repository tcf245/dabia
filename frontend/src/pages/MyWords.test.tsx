import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MyWords from './MyWords';
import * as api from '../services/api';
import { en } from '../i18n/messages/en';

vi.mock('../services/api', () => ({
  getWordsProgress: vi.fn(),
  getWords: vi.fn(),
  exportWords: vi.fn(),
}));

const LocationProbe = () => {
  const { search } = useLocation();
  return <div data-testid="location-search">{search}</div>;
};

const renderPage = (initialEntry = '/words') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MyWords />
      <LocationProbe />
    </MemoryRouter>,
  );

const makeWord = (id: string, word: string, overrides: Partial<api.WordItem> = {}): api.WordItem => ({
  card_id: id,
  deck: { id: 'd1', name: 'eggrolls-JLPT10k-v3::1-N4+N5' },
  word,
  reading: 'よみ',
  hint: `${word} meaning`,
  sentence: `${word}の例文です。`,
  sentence_furigana: `${word}[よみ]の[の]例文[れいぶん]です[です]。`,
  sentence_translation: `Sentence for ${word}.`,
  audio_url: null,
  sentence_audio_url: null,
  language: 'en',
  proficiency_level: 2,
  status: 'learning',
  first_seen_at: '2026-10-02T12:00:00Z',
  last_reviewed_at: '2026-11-16T12:00:00Z',
  next_review_at: '2026-11-20T12:00:00Z',
  review_count: 4,
  correct_count: 3,
  accuracy: 75,
  lapses_count: 1,
  ...overrides,
});

const multiDeckResponse: api.WordsProgressResponse = {
  decks: [
    {
      deck_id: 'd1',
      name: 'eggrolls-JLPT10k-v3::1-N4+N5',
      is_active: true,
      total: 1500,
      mastered: 320,
      learning: 292,
      not_started: 888,
      learning_by_level: { '1': 40, '2': 61, '3': 88, '4': 103 },
    },
    {
      deck_id: 'd2',
      name: 'dabia-jlpt::N2 Grammar',
      is_active: true,
      total: 200,
      mastered: 30,
      learning: 20,
      not_started: 150,
      learning_by_level: { '1': 5, '2': 5, '3': 5, '4': 5 },
    },
    {
      deck_id: 'd3',
      name: 'Custom Deck',
      is_active: false,
      total: 100,
      mastered: 50,
      learning: 10,
      not_started: 40,
      learning_by_level: { '1': 2, '2': 3, '3': 3, '4': 2 },
    },
  ],
  aggregate: {
    total: 1800,
    mastered: 400,
    learning: 322,
    not_started: 1078,
    learning_by_level: { '1': 47, '2': 69, '3': 96, '4': 110 },
  },
};

describe('MyWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('token');
    vi.mocked(api.getWordsProgress).mockReset();
    vi.mocked(api.getWords).mockReset();
    vi.mocked(api.exportWords).mockReset();
    vi.mocked(api.getWordsProgress).mockResolvedValue(multiDeckResponse);
    vi.mocked(api.getWords).mockResolvedValue({
      total: 1,
      limit: 50,
      offset: 0,
      items: [makeWord('c1', '何')],
    });
    vi.mocked(api.exportWords).mockResolvedValue({ filename: 'dabia-words.csv' });
  });

  afterEach(() => {
    localStorage.removeItem('token');
  });

  it('renders a loading skeleton and requests progress with includeStudied once', async () => {
    let resolveFetch: (val: api.WordsProgressResponse) => void = () => {};
    vi.mocked(api.getWordsProgress).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderPage();

    const skeleton = screen.getByTestId('words-loading-skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(api.getWordsProgress).toHaveBeenCalledTimes(1);
    expect(api.getWordsProgress).toHaveBeenCalledWith({ includeStudied: true });

    resolveFetch(multiDeckResponse);
    await waitFor(() =>
      expect(screen.queryByTestId('words-loading-skeleton')).not.toBeInTheDocument(),
    );
  });

  it('defaults to the first active deck and Learning tab, fetching words with status=learning', async () => {
    renderPage('/words');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('d1');
    expect(screen.getByText('Learned 612 / 1,500 words')).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'JLPT N5–N4' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'JLPT N2 Grammar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: en.words.allActiveDecks })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: en.words.otherDecks })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Custom Deck' })).toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: /All/i });
    const learningTab = screen.getByRole('tab', { name: /Learning/i });
    const masteredTab = screen.getByRole('tab', { name: /Mastered/i });
    expect(learningTab).toHaveAttribute('aria-selected', 'true');
    expect(allTab).toHaveTextContent('612');
    expect(learningTab).toHaveTextContent('292');
    expect(masteredTab).toHaveTextContent('320');

    await waitFor(() =>
      expect(api.getWords).toHaveBeenCalledWith(
        expect.objectContaining({
          deckIds: ['d1'],
          status: 'learning',
          sort: 'last_reviewed',
          offset: 0,
        }),
      ),
    );
    expect(await screen.findByText('何')).toBeInTheDocument();
  });

  it('selects the deck specified in the ?deck= query parameter', async () => {
    renderPage('/words?deck=d3');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('d3');
    expect(screen.getByText('Learned 60 / 100 words')).toBeInTheDocument();
  });

  it('sums active decks only when ?deck=all is selected and sends active deck IDs to getWords', async () => {
    renderPage('/words?deck=all');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('all');
    // Active decks d1 (612/1500) + d2 (50/200) = 662 / 1700, excluding d3 (100 total in response.aggregate)
    expect(screen.getByText('Learned 662 / 1,700 words')).toBeInTheDocument();
    expect(screen.getByText('38.9%')).toBeInTheDocument();

    await waitFor(() =>
      expect(api.getWords).toHaveBeenCalledWith(
        expect.objectContaining({
          deckIds: ['d1', 'd2'],
          status: 'learning',
        }),
      ),
    );

    fireEvent.focus(screen.getByRole('button', { name: /learning/i }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('45');
    expect(tooltip).toHaveTextContent('66');
    expect(tooltip).toHaveTextContent('93');
    expect(tooltip).toHaveTextContent('108');
  });

  it('updates the URL query param and progress bar when switching decks', async () => {
    renderPage('/words');

    const select = await screen.findByLabelText(en.words.deckLabel);
    fireEvent.change(select, { target: { value: 'd2' } });

    expect(screen.getByTestId('location-search')).toHaveTextContent('?deck=d2');
    expect(screen.getByText('Learned 50 / 200 words')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByTestId('location-search')).toHaveTextContent('?deck=all');
    expect(screen.getByText('Learned 662 / 1,700 words')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.getWords).toHaveBeenLastCalledWith(
        expect.objectContaining({ deckIds: ['d1', 'd2'] }),
      ),
    );
  });

  it('hides All active decks when only one deck is active', async () => {
    vi.mocked(api.getWordsProgress).mockResolvedValueOnce({
      decks: [multiDeckResponse.decks[0], multiDeckResponse.decks[2]],
      aggregate: multiDeckResponse.aggregate,
    });

    renderPage('/words?deck=all');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('d1');
    expect(screen.queryByRole('option', { name: en.words.allActiveDecks })).not.toBeInTheDocument();
  });

  it('shows the no-active-decks state with a link to /decks when decks list is empty', async () => {
    vi.mocked(api.getWordsProgress).mockResolvedValueOnce({
      decks: [],
      aggregate: {
        total: 0,
        mastered: 0,
        learning: 0,
        not_started: 0,
        learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
      },
    });

    renderPage();

    expect(await screen.findByText(en.words.noActiveDecks)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.words.chooseDecks })).toHaveAttribute(
      'href',
      '/decks',
    );
  });

  it('shows 100% not-started bar and a link to / when a deck has zero learned words', async () => {
    vi.mocked(api.getWordsProgress).mockResolvedValueOnce({
      decks: [
        {
          deck_id: 'd-zero',
          name: 'eggrolls-JLPT10k-v3::2-N3',
          is_active: true,
          total: 300,
          mastered: 0,
          learning: 0,
          not_started: 300,
          learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
        },
      ],
      aggregate: {
        total: 300,
        mastered: 0,
        learning: 0,
        not_started: 300,
        learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
      },
    });

    renderPage();

    expect(await screen.findByText('Learned 0 / 300 words')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText(en.words.notStartedDeck)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.words.startLearning })).toHaveAttribute('href', '/');
    expect(api.getWords).not.toHaveBeenCalled();
  });

  it('falls back to the first studied deck when no decks are active', async () => {
    vi.mocked(api.getWordsProgress).mockResolvedValueOnce({
      decks: [multiDeckResponse.decks[2]],
      aggregate: multiDeckResponse.decks[2],
    });

    renderPage('/words');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('d3');
    expect(screen.getByText('Learned 60 / 100 words')).toBeInTheDocument();
  });

  it('shows an error message and retries loading when retry is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.getWordsProgress)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(multiDeckResponse);

    renderPage();

    expect(await screen.findByText(en.words.loadError)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: en.words.retry }));

    expect(await screen.findByText('Learned 612 / 1,500 words')).toBeInTheDocument();
    expect(api.getWordsProgress).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('updates URL, hides level chips, and refetches when switching status tabs', async () => {
    vi.mocked(api.getWords)
      .mockResolvedValueOnce({ total: 1, limit: 50, offset: 0, items: [makeWord('c1', '何')] })
      .mockResolvedValueOnce({ total: 0, limit: 50, offset: 0, items: [] });

    renderPage('/words?level=1,2');

    await screen.findByText('何');
    expect(screen.getByRole('button', { name: 'L1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'L2' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /Mastered/i }));

    expect(screen.getByTestId('location-search')).toHaveTextContent('status=mastered');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('level=');
    expect(screen.queryByRole('button', { name: 'L1' })).not.toBeInTheDocument();

    await waitFor(() =>
      expect(api.getWords).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'mastered', levels: undefined }),
      ),
    );
    expect(await screen.findByText(en.words.emptyMastered)).toBeInTheDocument();
  });

  it('multi-selects level chips on Learning tab and sends level filter', async () => {
    renderPage('/words');

    await screen.findByText('何');
    fireEvent.click(screen.getByRole('button', { name: 'L1' }));
    fireEvent.click(screen.getByRole('button', { name: 'L3' }));

    expect(screen.getByTestId('location-search')).toHaveTextContent('level=1%2C3');
    await waitFor(() =>
      expect(api.getWords).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'learning', levels: [1, 3] }),
      ),
    );
  });

  it('searches with q, switches sort to Best match, and shows clear-search empty state', async () => {
    vi.mocked(api.getWords)
      .mockResolvedValueOnce({ total: 1, limit: 50, offset: 0, items: [makeWord('c1', '何')] })
      .mockResolvedValueOnce({ total: 0, limit: 50, offset: 0, items: [] })
      .mockResolvedValueOnce({ total: 1, limit: 50, offset: 0, items: [makeWord('c1', '何')] });

    renderPage('/words');
    await screen.findByText('何');

    const input = screen.getByPlaceholderText(en.words.searchPlaceholder);
    fireEvent.change(input, { target: { value: 'missingword' } });

    const sortSelect = screen.getByLabelText(en.words.sortLabel) as HTMLSelectElement;
    expect(sortSelect.value).toBe('relevance');
    expect(screen.getByRole('option', { name: en.words.sort.relevance })).toBeInTheDocument();

    await waitFor(() =>
      expect(api.getWords).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'missingword', sort: 'relevance' }),
      ),
    );
    expect(await screen.findByText(en.words.emptySearch)).toBeInTheDocument();

    // Clear search from the empty state
    const clearButtons = screen.getAllByRole('button', { name: en.words.clearSearch });
    fireEvent.click(clearButtons[clearButtons.length - 1]);

    expect((screen.getByPlaceholderText(en.words.searchPlaceholder) as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('option', { name: en.words.sort.relevance })).not.toBeInTheDocument();
    expect(sortSelect.value).toBe('last_reviewed');
    await waitFor(() => expect(api.getWords).toHaveBeenCalledTimes(3));
  });

  it('expands only one word card at a time and closes on Escape', async () => {
    vi.mocked(api.getWords).mockResolvedValueOnce({
      total: 2,
      limit: 50,
      offset: 0,
      items: [makeWord('c1', '何'), makeWord('c2', '花')],
    });

    renderPage('/words');

    const card1Btn = (await screen.findByText('何')).closest('button')!;
    const card2Btn = screen.getByText('花').closest('button')!;

    fireEvent.click(card1Btn);
    expect(card1Btn).toHaveAttribute('aria-expanded', 'true');
    expect(card2Btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Sentence for 何.')).toBeInTheDocument();

    fireEvent.click(card2Btn);
    expect(card1Btn).toHaveAttribute('aria-expanded', 'false');
    expect(card2Btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Sentence for 何.')).not.toBeInTheDocument();
    expect(screen.getByText('Sentence for 花.')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(card2Btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('appends next offset when Load more is clicked and shows list error retry', async () => {
    vi.mocked(api.getWords)
      .mockResolvedValueOnce({
        total: 2,
        limit: 50,
        offset: 0,
        items: [makeWord('c1', '何')],
      })
      .mockRejectedValueOnce(new Error('list error'))
      .mockResolvedValueOnce({
        total: 2,
        limit: 50,
        offset: 1,
        items: [makeWord('c2', '花')],
      });

    renderPage('/words');

    expect(await screen.findByText('何')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: en.words.loadMore }));
    expect(await screen.findByText(en.words.listLoadError)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: en.words.retry }));
    expect(await screen.findByText('花')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 / 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.words.loadMore })).not.toBeInTheDocument();
  });

  it('updates sort query param and refetches when selecting a sort option, and manages audio in WordGrid', async () => {
    vi.mocked(api.getWords).mockResolvedValue({
      total: 1,
      limit: 50,
      offset: 0,
      items: [
        makeWord('c1', '何', {
          audio_url: 'https://cdn.example.com/w.mp3',
          sentence_audio_url: 'https://cdn.example.com/s.mp3',
        }),
      ],
    });

    renderPage('/words');
    const cardBtn = (await screen.findByText('何')).closest('button')!;

    fireEvent.click(cardBtn);
    fireEvent.click(screen.getByRole('button', { name: en.words.wordAudio }));
    expect(globalThis.playMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: en.words.sentenceAudio }));
    expect(globalThis.pauseMock).toHaveBeenCalled();
    expect(globalThis.playMock).toHaveBeenCalledTimes(2);

    const sortSelect = screen.getByLabelText(en.words.sortLabel) as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: 'level' } });
    expect(screen.getByTestId('location-search')).toHaveTextContent('sort=level');
    await waitFor(() =>
      expect(api.getWords).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'level' }),
      ),
    );
  });

  it('renders ExportButton when signed in with counts and passes the current list query', async () => {
    localStorage.setItem('token', 'test-token');
    vi.mocked(api.getWords).mockResolvedValue({
      total: 42,
      limit: 50,
      offset: 0,
      items: [makeWord('c1', '何')],
    });

    renderPage('/words?deck=d1&status=learning&level=1,2&q=nani&sort=relevance');
    await screen.findByText('何');

    const exportTrigger = screen.getByRole('button', { name: en.words.export.button });
    fireEvent.click(exportTrigger);

    // Current list: 42 (listTotal), current deck: 320 + 292 = 612, all decks: 612 + 50 + 60 = 722.
    expect(screen.getByText('JLPT N5–N4 · Learning · 42 words')).toBeInTheDocument();
    expect(screen.getByText('JLPT N5–N4 · 612 words')).toBeInTheDocument();
    expect(screen.getByText('722 words')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: en.words.export.confirm }));

    await waitFor(() =>
      expect(api.exportWords).toHaveBeenCalledWith({
        deckIds: ['d1'],
        status: 'learning',
        levels: [1, 2],
        q: 'nani',
        sort: 'relevance',
      }),
    );
  });

  it('renders Sign in to export when signed out and dispatches dabia:unauthorized', async () => {
    const unauthorizedHandler = vi.fn();
    window.addEventListener('dabia:unauthorized', unauthorizedHandler);

    try {
      renderPage('/words');
      await screen.findByText('何');

      const signInBtn = screen.getByRole('button', { name: en.words.export.signIn });
      fireEvent.click(signInBtn);

      expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
      expect(api.exportWords).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('dabia:unauthorized', unauthorizedHandler);
    }
  });
});
