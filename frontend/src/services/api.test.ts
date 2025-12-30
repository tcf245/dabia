import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as apiService from './api';

vi.mock('axios', () => {
    const mockAxios = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        }
    };
    return {
        default: {
            create: vi.fn().mockReturnValue(mockAxios)
        }
    };
});

// Access the mocked axios instance
const mockApi: any = (axios.create as any)();

describe('api service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getDecks calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: [{ id: '1', name: 'Deck 1' }] });
        const result = await apiService.getDecks();
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/decks/');
        expect(result).toEqual([{ id: '1', name: 'Deck 1' }]);
    });

    it('getDeckSettings calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { active_deck_ids: ['1'] } });
        const result = await apiService.getDeckSettings();
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/decks/settings');
        expect(result).toEqual({ active_deck_ids: ['1'] });
    });

    it('updateDeckSettings calls correct endpoint', async () => {
        const settings = { active_deck_ids: ['1', '2'] };
        mockApi.put.mockResolvedValueOnce({ data: settings });
        const result = await apiService.updateDeckSettings(settings);
        expect(mockApi.put).toHaveBeenCalledWith('/api/v1/decks/settings', settings);
        expect(result).toEqual(settings);
    });

    it('getDailySummary calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { accuracy: 90 } });
        const result = await apiService.getDailySummary();
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/stats/daily-summary');
        expect(result).toEqual({ accuracy: 90 });
    });

    it('getProfileHeatmap calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: [] });
        await apiService.getProfileHeatmap();
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/heatmap');
    });

    it('getProfileGarden calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: [] });
        await apiService.getProfileGarden();
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/garden');
    });

    it('getNextCard calls correct endpoint', async () => {
        mockApi.post.mockResolvedValueOnce({ data: { card: null } });
        await apiService.getNextCard();
        expect(mockApi.post).toHaveBeenCalledWith('/api/v1/session/next-card', undefined);
    });

    it('getCard calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { card_id: '123' } });
        await apiService.getCard('123');
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/cards/123');
    });
});
