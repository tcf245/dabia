import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle silent token refresh and unauthorized errors
api.interceptors.response.use(
  (response) => {
    // Check for refresh token in headers
    const refreshToken = response.headers['x-refresh-token'];
    if (refreshToken) {
      console.log("Token refreshed silently.");
      localStorage.setItem('token', refreshToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized! Triggering session expiry event.");
      localStorage.removeItem('token');
      // Dispatch a custom event instead of hard redirect
      window.dispatchEvent(new CustomEvent('dabia:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Learner language for card content (hint and sentence translation); set by the LanguageProvider.
let contentLanguage: string | null = null;
export const setContentLanguage = (language: string | null) => {
  contentLanguage = language;
};
const languageParams = () => (contentLanguage ? { lang: contentLanguage } : undefined);

// Define types for API requests and responses
export interface PreviousAnswer {
  cardId: string;
  isCorrect: boolean;
  responseTimeMs: number;
}

export interface CardTarget {
  word: string;
  hint: string | null;
}

export interface DeckInfo {
  id: string;
  name: string;
}

export interface Card {
  card_id: string;
  deck: DeckInfo;
  sentence_template: string;
  target: CardTarget;
  reading: string | null;
  audio_url: string | null;
  sentence: string | null;
  sentence_furigana: string | null;
  sentence_translation: string | null;
  sentence_audio_url: string | null;
  proficiency_level: number;
  /** Language the hint was served in, after the backend's fallback (e.g. 'zh' for an untranslated card). */
  language?: string;
}

export interface SessionProgress {
  completed_today: number;
  goal_today: number;
}

export interface NextCardResponse {
  card: Card | null;
  session_progress: SessionProgress;
  previous_card_id: string | null;
}

export interface DailyStats {
  to_learn_count: number;
  learned_count: number;
  reinforced_count: number;
  total_answered: number;
  total_time_seconds: number;
  new_words_count: number;
  accuracy: number;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  count: number;
  difficulty: string;
  tags: string[];
}

export interface DeckSettings {
  active_deck_ids: string[];
}

export const getDecks = async (): Promise<Deck[]> => {
  const response = await api.get<Deck[]>('/api/v1/decks/');
  return response.data;
};

export const getDeckSettings = async (): Promise<DeckSettings> => {
  const response = await api.get<DeckSettings>('/api/v1/decks/settings');
  return response.data;
};

export const updateDeckSettings = async (settings: DeckSettings): Promise<DeckSettings> => {
  const response = await api.put<DeckSettings>('/api/v1/decks/settings', settings);
  return response.data;
};

export const getNextCard = async (answer?: PreviousAnswer): Promise<NextCardResponse> => {
  const response = await api.post<NextCardResponse>('/api/v1/session/next-card', answer, { params: languageParams() });
  return response.data;
};

export const getCard = async (cardId: string): Promise<Card> => {
  const response = await api.get<Card>(`/api/v1/cards/${cardId}`, { params: languageParams() });
  return response.data;
};

// Profile types
export interface HeatmapDay {
  date: string;
  count: number;
  level: number; // 0-4
}

export interface GardenWord {
  card_id: string;
  text: string;
  reading: string | null;
  /** @deprecated Alias of reading; kept for one release. */
  romaji?: string | null;
  hint: string | null;
  level: number;
  type: 'review' | 'learned';
}

export const getProfileHeatmap = async (): Promise<HeatmapDay[]> => {
  const response = await api.get<HeatmapDay[]>('/api/v1/profile/heatmap');
  return response.data;
}

export const getProfileGarden = async (): Promise<GardenWord[]> => {
  const response = await api.get<GardenWord[]>('/api/v1/profile/garden', { params: languageParams() });
  return response.data;
}

export const getDailySummary = async (): Promise<DailyStats> => {
  const response = await api.get<DailyStats>('/api/v1/stats/daily-summary');
  return response.data;
};

export interface LanguageInfo {
  code: string;
  cards: number;
}

export interface LanguagesResponse {
  default: string;
  languages: LanguageInfo[];
}

/** Learner languages that have card content. Public, so the welcome page can use it before sign-in. */
export const getLanguages = async (): Promise<LanguagesResponse> => {
  const response = await api.get<LanguagesResponse>('/api/v1/languages');
  return response.data;
};

export interface ProgressCounts {
  total: number;
  mastered: number;
  learning: number;
  not_started: number;
  learning_by_level: Record<string, number>;
}

export interface DeckProgress extends ProgressCounts {
  deck_id: string;
  name: string;
  is_active: boolean;
}

export interface WordsProgressResponse {
  decks: DeckProgress[];
  aggregate: ProgressCounts;
}

export const getWordsProgress = async (
  params: { deckIds?: string[]; includeStudied?: boolean } = {},
): Promise<WordsProgressResponse> => {
  const search = new URLSearchParams();
  for (const id of params.deckIds ?? []) {
    search.append('deck_id', id);
  }
  if (params.includeStudied !== undefined) {
    search.set('include_studied', String(params.includeStudied));
  }
  const response = await api.get<WordsProgressResponse>('/api/v1/words/progress', {
    params: search,
  });
  return response.data;
};

export type WordStatus = 'learning' | 'mastered';
export type WordsStatusFilter = 'all' | 'learning' | 'mastered';
export type WordsSortKey =
  | 'relevance'
  | 'last_reviewed'
  | 'next_review'
  | 'level'
  | 'first_seen'
  | 'lapses';
export type WordsSortOrder = 'asc' | 'desc';

export interface WordItem {
  card_id: string;
  deck: DeckInfo;
  word: string;
  reading: string | null;
  hint: string | null;
  sentence: string | null;
  sentence_furigana: string | null;
  sentence_translation: string | null;
  audio_url: string | null;
  sentence_audio_url: string | null;
  language: string;
  proficiency_level: number;
  status: WordStatus;
  first_seen_at: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  review_count: number;
  correct_count: number;
  accuracy: number | null;
  lapses_count: number;
}

export interface WordsListResponse {
  total: number;
  limit: number;
  offset: number;
  items: WordItem[];
}

export interface WordsQuery {
  deckIds?: string[];
  allDecks?: boolean;
  status?: WordsStatusFilter;
  levels?: number[];
  q?: string;
  sort?: WordsSortKey;
  order?: WordsSortOrder;
  limit?: number;
  offset?: number;
}

export type WordsExportQuery = Omit<WordsQuery, 'limit' | 'offset'>;

const buildWordsFilterParams = (query: WordsExportQuery): URLSearchParams => {
  const search = new URLSearchParams();
  for (const id of query.deckIds ?? []) {
    search.append('deck_id', id);
  }
  if (query.allDecks !== undefined) {
    search.set('all_decks', String(query.allDecks));
  }
  if (query.status !== undefined) {
    search.set('status', query.status);
  }
  for (const level of query.levels ?? []) {
    search.append('level', String(level));
  }
  const trimmedQ = query.q?.trim();
  if (trimmedQ) {
    search.set('q', trimmedQ);
  }
  if (query.sort !== undefined) {
    search.set('sort', query.sort);
  }
  if (query.order !== undefined) {
    search.set('order', query.order);
  }
  const lang = languageParams()?.lang;
  if (lang) {
    search.set('lang', lang);
  }
  return search;
};

export const getWords = async (query: WordsQuery = {}): Promise<WordsListResponse> => {
  const search = buildWordsFilterParams(query);
  if (query.limit !== undefined) {
    search.set('limit', String(query.limit));
  }
  if (query.offset !== undefined) {
    search.set('offset', String(query.offset));
  }
  const response = await api.get<WordsListResponse>('/api/v1/words', {
    params: search,
  });
  return response.data;
};

const DEFAULT_EXPORT_FILENAME = 'dabia-words.csv';

const getResponseHeader = (headers: unknown, name: string): string | undefined => {
  if (!headers || typeof headers !== 'object') return undefined;
  const maybeGet = (headers as { get?: (key: string) => unknown }).get;
  if (typeof maybeGet === 'function') {
    const value = maybeGet.call(headers, name);
    if (typeof value === 'string') return value;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() === target && typeof value === 'string') {
      return value;
    }
  }
  return undefined;
};

const parseExportFilename = (contentDisposition?: string): string => {
  if (!contentDisposition) return DEFAULT_EXPORT_FILENAME;

  const starMatch = contentDisposition.match(
    /filename\*\s*=\s*(?:UTF-8''|[^']*'[^']*')([^;\r\n]+)/i,
  );
  if (starMatch?.[1]) {
    const raw = starMatch[1].trim().replace(/^"(.*)"$/, '$1');
    try {
      const decoded = decodeURIComponent(raw).trim();
      if (decoded) return decoded;
    } catch {
      // Fall through to plain filename parsing when percent-encoding is malformed.
    }
  }

  const plainMatch = contentDisposition.match(
    /(?:^|[;\s])filename\s*=\s*(?:"([^"]+)"|([^;\r\n]+))/i,
  );
  const plain = (plainMatch?.[1] ?? plainMatch?.[2])?.trim();
  return plain || DEFAULT_EXPORT_FILENAME;
};

/** Downloads the user's learned words matching `query` as a UTF-8 CSV file. */
export const exportWords = async (
  query: WordsExportQuery = {},
): Promise<{ filename: string }> => {
  const search = buildWordsFilterParams(query);
  const response = await api.get<Blob>('/api/v1/words/export', {
    params: search,
    responseType: 'blob',
  });
  const contentDisposition = getResponseHeader(response.headers, 'content-disposition');
  const filename = parseExportFilename(contentDisposition);
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
  return { filename };
};


