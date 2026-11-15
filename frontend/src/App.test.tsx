import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { setFallbackLanguage } from './i18n/context';

// These assertions use the Chinese interface.
beforeEach(() => setFallbackLanguage('zh'));

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

    it('opens the login modal from the header and closes it by Escape, button or backdrop', () => {
        renderAt('/');
        const open = () => fireEvent.click(screen.getByRole('button', { name: '登录' }));

        open();
        const dialog = screen.getByRole('dialog', { name: '登录' });
        fireEvent.click(dialog);
        expect(screen.getByRole('dialog', { name: '登录' })).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        open();
        fireEvent.click(screen.getByRole('button', { name: '关闭' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        open();
        fireEvent.click(screen.getByRole('dialog').parentElement!);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
