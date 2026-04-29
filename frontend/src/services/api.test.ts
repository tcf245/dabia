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
        // We don't use vi.clearAllMocks() here because we need to inspect 
        // calls made during the initial import of the api service (like interceptors.use)
        mockApi.get.mockClear();
        mockApi.post.mockClear();
        mockApi.put.mockClear();
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

    it('getCardGrammar calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { card_id: '123', annotations: [] } });
        await apiService.getCardGrammar('123');
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/cards/123/grammar');
    });

    describe('interceptors', () => {
        let requestInterceptor: any;
        let responseInterceptor: any;
        let responseErrorInterceptor: any;

        beforeEach(() => {
            // Find the interceptors
            requestInterceptor = mockApi.interceptors.request.use.mock.calls[0][0];
            const responseSuccess = mockApi.interceptors.response.use.mock.calls[0][0];
            const responseError = mockApi.interceptors.response.use.mock.calls[0][1];
            responseInterceptor = responseSuccess;
            responseErrorInterceptor = responseError;
        });

        it('adds Authorization header if token exists', () => {
            vi.stubGlobal('localStorage', {
                getItem: vi.fn().mockReturnValue('fake-token'),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            });

            const config = { headers: {} } as any;
            const updatedConfig = requestInterceptor(config);

            expect(updatedConfig.headers.Authorization).toBe('Bearer fake-token');
        });

        it('saves refresh token from header', () => {
            const setItemMock = vi.fn();
            vi.stubGlobal('localStorage', {
                getItem: vi.fn(),
                setItem: setItemMock,
                removeItem: vi.fn(),
            });

            const response = {
                headers: { 'x-refresh-token': 'new-token' },
                data: {}
            };
            responseInterceptor(response);

            expect(setItemMock).toHaveBeenCalledWith('token', 'new-token');
        });

        it('handles 401 by clearing token and dispatching event', async () => {
            const removeItemMock = vi.fn();
            const dispatchEventMock = vi.fn();
            vi.stubGlobal('localStorage', {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: removeItemMock,
            });
            vi.stubGlobal('dispatchEvent', dispatchEventMock);

            const error = {
                response: { status: 401 }
            };

            await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
            expect(removeItemMock).toHaveBeenCalledWith('token');
            expect(dispatchEventMock).toHaveBeenCalled();
            expect(dispatchEventMock.mock.calls[0][0].type).toBe('dabia:unauthorized');
        });
    });
});
