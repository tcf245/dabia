import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import Welcome from './Welcome';
import { deckLabel } from '../utils/decks';
import * as api from '../services/api';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

vi.mock('../services/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return { ...actual, getDecks: vi.fn() };
});

vi.mock('../hooks/useGoogleSignIn', () => ({ useGoogleSignIn: vi.fn() }));

const decks = [
    { id: 'n1', name: 'eggrolls-JLPT10k-v3::4-N1', description: '', count: 4084, difficulty: 'Expert', tags: ['JLPT N1'] },
    { id: 'g2', name: 'dabia-jlpt::N2 Grammar', description: '', count: 160, difficulty: 'Advanced', tags: ['JLPT N2', 'Grammar'] },
    { id: 'n5', name: 'eggrolls-JLPT10k-v3::1-N4+N5', description: '', count: 1568, difficulty: 'Beginner', tags: ['JLPT N4'] },
];

// Render and let the deck request settle so state updates stay inside act().
const renderWelcome = async (onLoginSuccess = vi.fn()) => {
    await act(async () => {
        render(<Welcome onLoginSuccess={onLoginSuccess} />);
    });
};

describe('Welcome', () => {
    const signIn = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useGoogleSignIn as Mock).mockReturnValue({ signIn, error: null });
        (api.getDecks as Mock).mockResolvedValue(decks);
    });

    it('explains the product and starts Google sign-in from the hero', async () => {
        await renderWelcome();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('忘记之前');
        fireEvent.click(screen.getAllByRole('button', { name: /使用 Google 登录/ })[0]);
        expect(signIn).toHaveBeenCalledTimes(1);
    });

    it('passes the login callback to the sign-in hook', async () => {
        const onLoginSuccess = vi.fn();
        await renderWelcome(onLoginSuccess);
        expect(useGoogleSignIn).toHaveBeenCalledWith(onLoginSuccess);
    });

    it('shows the five SRS stages with their review intervals', async () => {
        await renderWelcome();

        for (const stage of ['新词', '生疏', '学习中', '熟悉', '掌握']) {
            expect(screen.getByText(stage)).toBeInTheDocument();
        }
        for (const interval of ['90 秒后再来', '5 分钟后再来', '7 天后复习', '30 天后复习']) {
            expect(screen.getByText(interval)).toBeInTheDocument();
        }
    });

    it('lists live decks from easiest to hardest with card counts', async () => {
        await renderWelcome();
        expect(await screen.findByText('共 5,652 个单词，覆盖 JLPT 各级')).toBeInTheDocument();

        const labels = await screen.findAllByTestId('deck-label');
        expect(labels.map((el) => el.textContent)).toEqual(['N5–N4', 'N2 语法', 'N1']);
        expect(screen.getByText('4,084 词')).toBeInTheDocument();
        expect(screen.getByText('160 条语法')).toBeInTheDocument();
    });

    it('hides the deck list when decks cannot be loaded', async () => {
        (api.getDecks as Mock).mockRejectedValue(new Error('offline'));
        await renderWelcome();

        await waitFor(() => expect(api.getDecks).toHaveBeenCalled());
        expect(screen.queryByTestId('deck-label')).not.toBeInTheDocument();
    });

    it('shows sign-in errors', async () => {
        (useGoogleSignIn as Mock).mockReturnValue({ signIn, error: 'Login failed' });
        await renderWelcome();
        expect(screen.getAllByText('Login failed').length).toBeGreaterThan(0);
    });
});

describe('deckLabel', () => {
    it('turns deck names into short JLPT labels', async () => {
        expect(deckLabel('eggrolls-JLPT10k-v3::3-N2')).toBe('N2');
        expect(deckLabel('eggrolls-JLPT10k-v3::1-N4+N5')).toBe('N5–N4');
        expect(deckLabel('dabia-jlpt::N2 Grammar')).toBe('N2 Grammar');
        expect(deckLabel('Custom deck')).toBe('Custom deck');
    });
});
