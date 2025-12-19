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

export const getNextCard = async (answer?: PreviousAnswer): Promise<NextCardResponse> => {
  const response = await api.post<NextCardResponse>('/api/v1/session/next-card', answer);
  return response.data;
};

export const getCard = async (cardId: string): Promise<Card> => {
  const response = await api.get<Card>(`/api/v1/cards/${cardId}`);
  return response.data;
};

// Profile types
export interface HeatmapDay {
  date: string;
  count: number;
  level: number; // 0-4
}

export interface GardenWord {
  text: string;
  romaji: string | null;
  type: 'review' | 'learned';
}

export const getProfileHeatmap = async (): Promise<HeatmapDay[]> => {
  const response = await api.get<HeatmapDay[]>('/api/v1/profile/heatmap');
  return response.data;
}

export const getProfileGarden = async (): Promise<GardenWord[]> => {
  const response = await api.get<GardenWord[]>('/api/v1/profile/garden');
  return response.data;
}
