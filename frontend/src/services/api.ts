import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export interface Card {
  card_id: string;
  sentence_template: string;
  target: CardTarget;
  reading: string; // Add this line
  audio_url: string | null;
  proficiency_level: number;
}

export interface SessionProgress {
  completed_today: number;
  goal_today: number;
}

export interface NextCardResponse {
  card: Card | null;
  session_progress: SessionProgress;
}

export const getNextCard = async (answer?: PreviousAnswer): Promise<NextCardResponse> => {
  const response = await api.post<NextCardResponse>('/api/v1/session/next-card', answer);
  return response.data;
};
