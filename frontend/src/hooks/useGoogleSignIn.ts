import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Google auth-code sign-in shared by the login modal and the welcome page.
 * Exchanges the Google code for a Dabia JWT and hands it to `onLoginSuccess`.
 */
export const useGoogleSignIn = (onLoginSuccess: (token: string) => void) => {
    const [error, setError] = useState<string | null>(null);

    const signIn = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: async (codeResponse) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: codeResponse.code }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Login failed details:', errorData);
                    throw new Error(errorData.detail || 'Login failed');
                }

                const data = await response.json();
                setError(null);
                onLoginSuccess(data.access_token);
            } catch (err) {
                console.error('Login error:', err);
                setError(err instanceof Error ? err.message : 'Failed to log in. Please try again.');
            }
        },
        onError: () => setError('Login failed. Please try again.'),
    });

    return { signIn: () => signIn(), error };
};
