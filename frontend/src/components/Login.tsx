import React from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import axios from 'axios';

interface LoginProps {
    onLoginSuccess: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const handleSuccess = async (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            try {
                // Send the token to your backend
                const response = await axios.post('http://localhost:8000/api/v1/auth/login/google', {
                    token: credentialResponse.credential,
                });

                const { access_token } = response.data;

                // Decode token to get user info (or fetch from a /me endpoint)
                // For now, let's just pass the token up.
                // In a real app, you might want to fetch user profile here.
                onLoginSuccess(access_token, {});

            } catch (error) {
                console.error('Login failed:', error);
                alert('Login failed. Please try again.');
            }
        }
    };

    const handleError = () => {
        console.log('Login Failed');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <h1 className="mb-6 text-2xl font-bold text-center text-gray-800">Welcome to Dabia</h1>
                <p className="mb-6 text-center text-gray-600">Sign in to track your progress</p>
                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={handleError}
                        useOneTap
                    />
                </div>
            </div>
        </div>
    );
};

export default Login;
