import axios from 'axios';

// Matches DailyStats schema from backend
export interface DailyStats {
    to_learn_count: number;
    learned_count: number;
    reinforced_count: number;
    total_answered: number;
    total_time_seconds: number;
    new_words_count: number;
    accuracy: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const getDailySummary = async (): Promise<DailyStats> => {
    const response = await axios.get(`${API_BASE_URL}/stats/daily-summary`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};
