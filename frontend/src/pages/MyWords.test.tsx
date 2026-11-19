import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MyWords from './MyWords';
import * as api from '../services/api';
import { en } from '../i18n/messages/en';

vi.mock('../services/api', () => ({
  getWordsProgress: vi.fn(),
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
    vi.mocked(api.getWordsProgress).mockResolvedValue(multiDeckResponse);
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

  it('defaults to the first active deck and formats deck options cleanly', async () => {
    renderPage('/words');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('d1');
    expect(screen.getByText('Learned 612 / 1,500 words')).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'JLPT N5–N4' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'JLPT N2 Grammar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: en.words.allActiveDecks })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: en.words.otherDecks })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Custom Deck' })).toBeInTheDocument();
  });

  it('selects the deck specified in the ?deck= query parameter', async () => {
    renderPage('/words?deck=d3');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('d3');
    expect(screen.getByText('Learned 60 / 100 words')).toBeInTheDocument();
  });

  it('sums active decks only when ?deck=all is selected', async () => {
    renderPage('/words?deck=all');

    const select = (await screen.findByLabelText(en.words.deckLabel)) as HTMLSelectElement;
    expect(select.value).toBe('all');
    // Active decks d1 (612/1500) + d2 (50/200) = 662 / 1700, excluding d3 (100 total in response.aggregate)
    expect(screen.getByText('Learned 662 / 1,700 words')).toBeInTheDocument();
    expect(screen.getByText('38.9%')).toBeInTheDocument();

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
});
