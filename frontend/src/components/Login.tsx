import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

interface LoginProps {
    onLoginSuccess: (token: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
    const [error, setError] = useState<string | null>(null);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/login/google`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: tokenResponse.access_token }),
                });

                if (!response.ok) {
                    throw new Error('Login failed');
                }

                const data = await response.json();
                onLoginSuccess(data.access_token);
            } catch (err) {
                console.error('Login error:', err);
                setError('Failed to log in. Please try again.');
            }
        },
        onError: () => {
            setError('Login failed. Please try again.');
        },
    });

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-serif font-bold text-[#3d3929] tracking-tight">Welcome back</h1>
                <p className="text-[#83827d] text-base">Sign in to your account to continue</p>
            </div>

            <div className="w-full space-y-3">
                <button
                    onClick={() => login()}
                    className="w-full bg-white border border-[#dad9d4] rounded-lg py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-[#f5f4f0] transition-colors shadow-sm group"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.059 -13.144 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                        </g>
                    </svg>
                    <span className="text-[#3d3929] font-medium">Continue with Google</span>
                </button>

                {/* Placeholder for GitHub button if needed in future */}
                {/* <button className="w-full bg-white border border-[#dad9d4] rounded-lg py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-[#f5f4f0] transition-colors shadow-sm text-[#3d3929] font-medium">
                    <GithubIcon /> Continue with GitHub
                </button> */}
            </div>

            {error && (
                <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}

            <div className="flex items-center gap-4 w-full my-8">
                <div className="h-px bg-[#dad9d4] flex-1"></div>
                <span className="text-xs font-medium text-[#83827d] uppercase tracking-wider">New to Dabia?</span>
                <div className="h-px bg-[#dad9d4] flex-1"></div>
            </div>

            <button className="text-[#c96442] hover:text-[#a85335] font-medium text-sm transition-colors">
                Create an account
            </button>
        </div>
    );
};

export default Login;
