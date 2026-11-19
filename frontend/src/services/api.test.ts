import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { Mock } from 'vitest';
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
interface MockAxiosInstance {
    get: Mock;
    post: Mock;
    put: Mock;
    interceptors: { request: { use: Mock }; response: { use: Mock } };
}
const mockApi = (axios.create as unknown as () => MockAxiosInstance)();

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
        expect(mockApi.post).toHaveBeenCalledWith('/api/v1/session/next-card', undefined, { params: undefined });
    });

    it('getCard calls correct endpoint', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { card_id: '123' } });
        await apiService.getCard('123');
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/cards/123', { params: undefined });
    });

    it('asks for card content in the chosen language', async () => {
        mockApi.post.mockResolvedValueOnce({ data: {} });
        mockApi.get.mockResolvedValueOnce({ data: {} });
        apiService.setContentLanguage('en');
        await apiService.getNextCard();
        await apiService.getCard('123');
        apiService.setContentLanguage(null);
        expect(mockApi.post).toHaveBeenCalledWith('/api/v1/session/next-card', undefined, { params: { lang: 'en' } });
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/cards/123', { params: { lang: 'en' } });
    });

    it('lists the languages that have card content', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { default: 'zh', languages: [{ code: 'zh', cards: 1 }] } });
        const result = await apiService.getLanguages();
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/languages');
        expect(result.languages[0].code).toBe('zh');
    });

    it('getWordsProgress sends repeated deck_id entries and include_studied', async () => {
        const payload: apiService.WordsProgressResponse = {
            decks: [],
            aggregate: {
                total: 0,
                mastered: 0,
                learning: 0,
                not_started: 0,
                learning_by_level: { '1': 0, '2': 0, '3': 0, '4': 0 },
            },
        };
        mockApi.get.mockResolvedValueOnce({ data: payload });

        const result = await apiService.getWordsProgress({
            deckIds: ['d1', 'd2'],
            includeStudied: true,
        });

        expect(result).toEqual(payload);
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/words/progress', {
            params: expect.any(URLSearchParams),
        });
        const [{ params }] = mockApi.get.mock.calls[0].slice(1) as [{ params: URLSearchParams }];
        expect(params.toString()).toBe('deck_id=d1&deck_id=d2&include_studied=true');
    });

    it('getWordsProgress handles empty params cleanly', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { decks: [], aggregate: {} } });

        await apiService.getWordsProgress();

        const [{ params }] = mockApi.get.mock.calls[0].slice(1) as [{ params: URLSearchParams }];
        expect(params.toString()).toBe('');
    });

    it('getWords sends repeated deck_id and level, filters, paging, and content language', async () => {
        const payload: apiService.WordsListResponse = {
            total: 1,
            limit: 50,
            offset: 0,
            items: [],
        };
        mockApi.get.mockResolvedValueOnce({ data: payload });

        apiService.setContentLanguage('en');
        const result = await apiService.getWords({
            deckIds: ['d1', 'd2'],
            allDecks: false,
            status: 'learning',
            levels: [1, 3],
            q: 'taberu',
            sort: 'relevance',
            order: 'desc',
            limit: 50,
            offset: 100,
        });
        apiService.setContentLanguage(null);

        expect(result).toEqual(payload);
        expect(mockApi.get).toHaveBeenCalledWith('/api/v1/words', {
            params: expect.any(URLSearchParams),
        });
        const [{ params }] = mockApi.get.mock.calls[0].slice(1) as [{ params: URLSearchParams }];
        expect(params.getAll('deck_id')).toEqual(['d1', 'd2']);
        expect(params.get('all_decks')).toBe('false');
        expect(params.get('status')).toBe('learning');
        expect(params.getAll('level')).toEqual(['1', '3']);
        expect(params.get('q')).toBe('taberu');
        expect(params.get('sort')).toBe('relevance');
        expect(params.get('order')).toBe('desc');
        expect(params.get('limit')).toBe('50');
        expect(params.get('offset')).toBe('100');
        expect(params.get('lang')).toBe('en');
    });

    it('getWords handles empty query cleanly', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { total: 0, limit: 50, offset: 0, items: [] } });

        await apiService.getWords();

        const [{ params }] = mockApi.get.mock.calls[0].slice(1) as [{ params: URLSearchParams }];
        expect(params.toString()).toBe('');
    });

    describe('interceptors', () => {
        type RequestConfig = { headers: Record<string, string> };
        type Response = { headers: Record<string, string>; data: unknown };
        let requestInterceptor: (config: RequestConfig) => RequestConfig;
        let responseInterceptor: (response: Response) => Response;
        let responseErrorInterceptor: (error: unknown) => Promise<never>;

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

            const config: RequestConfig = { headers: {} };
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
