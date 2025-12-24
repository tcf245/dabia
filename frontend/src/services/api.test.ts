import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as api from './api';

// Mock axios
vi.mock('axios', () => {
    return {
        default: {
            create: vi.fn().mockReturnValue({
                interceptors: {
                    request: { use: vi.fn(), eject: vi.fn() },
                    response: { use: vi.fn(), eject: vi.fn() }
                },
                get: vi.fn(),
                post: vi.fn(),
            })
        }
    };
});

// We need to access the mocked axios instance
const mockedAxiosInstance = vi.mocked(axios.create());

describe('API Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getDailySummary calls the correct endpoint', async () => {
        const mockStats = {
            to_learn_count: 5,
            learned_count: 10,
            reinforced_count: 5,
            total_answered: 20,
            total_time_seconds: 600,
            new_words_count: 2,
            accuracy: 80.0
        };

        // Mock the get implementation on the instance
        vi.mocked(mockedAxiosInstance.get).mockResolvedValueOnce({ data: mockStats });

        const result = await api.getDailySummary();

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith('/api/v1/stats/daily-summary');
        expect(result).toEqual(mockStats);
    });

    it('getProfileHeatmap calls the correct endpoint', async () => {
        const mockHeatmap = [{ date: '2023-01-01', count: 5, level: 2 }];
        vi.mocked(mockedAxiosInstance.get).mockResolvedValueOnce({ data: mockHeatmap });

        const result = await api.getProfileHeatmap();

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith('/api/v1/profile/heatmap');
        expect(result).toEqual(mockHeatmap);
    });

    it('getProfileGarden calls the correct endpoint', async () => {
        const mockGarden = [{ text: 'test', romaji: 'test', type: 'learned' }];
        vi.mocked(mockedAxiosInstance.get).mockResolvedValueOnce({ data: mockGarden });

        const result = await api.getProfileGarden();

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith('/api/v1/profile/garden');
        expect(result).toEqual(mockGarden);
    });

    it('getNextCard calls the correct endpoint', async () => {
        const mockResponse = { card: null, session_progress: { completed_today: 0, goal_today: 50 }, previous_card_id: null };
        vi.mocked(mockedAxiosInstance.post).mockResolvedValueOnce({ data: mockResponse });

        const result = await api.getNextCard();

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith('/api/v1/session/next-card', undefined);
        expect(result).toEqual(mockResponse);
    });

    it('getCard calls the correct endpoint', async () => {
        const mockCard = { card_id: '123' };
        vi.mocked(mockedAxiosInstance.get).mockResolvedValueOnce({ data: mockCard });

        const result = await api.getCard('123');

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith('/api/v1/cards/123');
        expect(result).toEqual(mockCard);
    });
});
