import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./pages/Welcome', () => ({ default: () => <div>welcome-page</div> }));
vi.mock('./pages/LearningSession', () => ({ default: () => <div>learning-session</div> }));
vi.mock('./components/Login', () => ({ default: () => null }));
vi.mock('jwt-decode', () => ({ jwtDecode: () => ({ sub: 'u1', name: 'Tester' }) }));

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <App />
        </MemoryRouter>,
    );

describe('App routing', () => {
    beforeEach(() => localStorage.clear());

    it('shows the welcome page to signed-out visitors', () => {
        renderAt('/');
        expect(screen.getByText('welcome-page')).toBeInTheDocument();
        expect(screen.queryByText('learning-session')).not.toBeInTheDocument();
    });

    it('goes straight to the learning session when signed in', () => {
        localStorage.setItem('token', 'header.payload.signature');
        renderAt('/');
        expect(screen.getByText('learning-session')).toBeInTheDocument();
        expect(screen.queryByText('welcome-page')).not.toBeInTheDocument();
    });
});
