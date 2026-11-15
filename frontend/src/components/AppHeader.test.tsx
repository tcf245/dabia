import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppHeader from './AppHeader';

const user = { sub: 'u1', name: 'Eric Tan', email: 'eric@example.com', picture: 'https://example.com/a.png' };

const renderHeader = (props: Partial<React.ComponentProps<typeof AppHeader>> = {}, path = '/') =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <AppHeader user={null} onLogin={vi.fn()} onLogout={vi.fn()} {...props} />
        </MemoryRouter>,
    );

describe('AppHeader', () => {
    it('shows only the brand and a login button when signed out', () => {
        const onLogin = vi.fn();
        renderHeader({ onLogin });

        expect(screen.getByRole('link', { name: /dabia/i })).toHaveAttribute('href', '/');
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '登录' }));
        expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('shows the main sections and marks the current one when signed in', () => {
        renderHeader({ user }, '/decks');

        const nav = screen.getByRole('navigation', { name: 'Main' });
        expect(within(nav).getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/');
        expect(within(nav).getByRole('link', { name: 'Decks' })).toHaveAttribute('aria-current', 'page');
        expect(within(nav).getByRole('link', { name: 'Learn' })).not.toHaveAttribute('aria-current');
        expect(within(nav).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    });

    it('opens an account menu with the user details and logs out', async () => {
        const onLogout = vi.fn();
        renderHeader({ user, onLogout });

        fireEvent.click(screen.getByRole('button', { name: /account menu/i }));

        expect(await screen.findByText('eric@example.com')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('falls back to an initial when the user has no picture', () => {
        renderHeader({ user: { sub: 'u2', email: 'kana@example.com' } });
        expect(screen.getByText('K')).toBeInTheDocument();
    });
});
