import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useGoogleLogin } from '@react-oauth/google';
import { useGoogleSignIn } from './useGoogleSignIn';

vi.mock('@react-oauth/google', () => ({ useGoogleLogin: vi.fn() }));

type LoginOptions = { onSuccess: (r: { code: string }) => Promise<void>; onError: () => void };

const setup = () => {
    let options!: LoginOptions;
    const trigger = vi.fn();
    (useGoogleLogin as Mock).mockImplementation((opts: LoginOptions) => {
        options = opts;
        return trigger;
    });
    const onLoginSuccess = vi.fn();
    const hook = renderHook(() => useGoogleSignIn(onLoginSuccess));
    return { hook, trigger, onLoginSuccess, options: () => options };
};

describe('useGoogleSignIn', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('uses the auth-code flow and opens Google sign-in', () => {
        const { hook, trigger } = setup();
        expect(useGoogleLogin).toHaveBeenCalledWith(expect.objectContaining({ flow: 'auth-code' }));
        hook.result.current.signIn();
        expect(trigger).toHaveBeenCalledTimes(1);
    });

    it('exchanges the Google code for a Dabia token', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ access_token: 'jwt-123' }), { status: 200 }),
        );
        const { onLoginSuccess, options } = setup();

        await act(() => options().onSuccess({ code: 'google-code' }));

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/v1\/auth\/login\/google$/),
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'google-code' }) }),
        );
        expect(onLoginSuccess).toHaveBeenCalledWith('jwt-123');
    });

    it('surfaces the backend error detail when the exchange fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Invalid code' }), { status: 400 }),
        );
        const { hook, onLoginSuccess, options } = setup();

        await act(() => options().onSuccess({ code: 'bad' }));

        expect(onLoginSuccess).not.toHaveBeenCalled();
        expect(hook.result.current.error).toBe('Invalid code');
    });

    it('falls back to a generic message when the error body is not JSON', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('oops', { status: 500 }));
        const { hook, options } = setup();

        await act(() => options().onSuccess({ code: 'x' }));

        expect(hook.result.current.error).toBe('Login failed');
    });

    it('reports a Google-side failure', () => {
        const { hook, options } = setup();
        act(() => options().onError());
        expect(hook.result.current.error).toBe('Login failed. Please try again.');
    });
});
