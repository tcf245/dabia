import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MESSAGES, STORAGE_KEY, detectLanguage, matchLanguage } from './index';
import { en } from './messages/en';
import { zh } from './messages/zh';
import { LanguageProvider, useI18n } from './LanguageProvider';
import LanguageSelect from '../components/LanguageSelect';
import * as api from '../services/api';

vi.mock('../services/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return { ...actual, getLanguages: vi.fn(), setContentLanguage: vi.fn() };
});

const setBrowserLanguages = (languages: string[]) => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0] ?? '');
};

/** Collects every key path of a dictionary, so two dictionaries can be compared key by key. */
const keyPaths = (value: unknown, prefix = ''): string[] =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
        : [prefix];

const Probe = () => {
    const { language, messages } = useI18n();
    return <p data-testid="probe">{language}:{messages.header.learn}</p>;
};

describe('language detection', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('matches a full tag, then its base language', () => {
        expect(matchLanguage('en-GB')).toBe('en');
        expect(matchLanguage('ZH_cn')).toBe('zh');
        expect(matchLanguage('fr-FR')).toBeNull();
        expect(matchLanguage('pt-BR', ['pt-br', 'pt'])).toBe('pt-br');
        expect(matchLanguage(null)).toBeNull();
    });

    it('follows the browser, then falls back to Chinese', () => {
        setBrowserLanguages(['fr-FR', 'en-US']);
        expect(detectLanguage()).toBe('en');
        setBrowserLanguages(['fr-FR']);
        expect(detectLanguage()).toBe('zh');
    });

    it('prefers the saved choice over the browser', () => {
        setBrowserLanguages(['en-US']);
        localStorage.setItem(STORAGE_KEY, 'zh');
        expect(detectLanguage()).toBe('zh');
    });
});

describe('dictionaries', () => {
    it('every language has exactly the keys of the Chinese dictionary', () => {
        for (const messages of Object.values(MESSAGES)) {
            expect(keyPaths(messages).sort()).toEqual(keyPaths(zh).sort());
            expect(messages.welcome.demoCards).toHaveLength(zh.welcome.demoCards.length);
            expect(messages.welcome.steps).toHaveLength(zh.welcome.steps.length);
            expect(messages.welcome.stages).toHaveLength(zh.welcome.stages.length);
        }
    });

    it('every message function renders a non-empty string in every language', () => {
        const calls: string[] = [];
        const walk = (node: unknown, path: string) => {
            if (typeof node === 'function') {
                const args = Array.from({ length: node.length }, (_, i) => (i === 0 ? 3 : i + 1));
                const text = (node as (...a: unknown[]) => unknown)(...args);
                expect(typeof text, path).toBe('string');
                expect((text as string).trim(), path).not.toBe('');
                expect(text as string, path).not.toMatch(/undefined|NaN|\[object/);
                calls.push(path);
            } else if (node && typeof node === 'object') {
                for (const [key, value] of Object.entries(node)) walk(value, `${path}.${key}`);
            }
        };
        walk(zh, 'zh');
        walk(en, 'en');
        expect(calls.length).toBeGreaterThan(0);
    });

    it('the English dictionary contains no Chinese', () => {
        const strings = JSON.stringify({ ...en, welcome: { ...en.welcome, demoCards: [] } });
        expect(strings).not.toMatch(/[一-鿿]/);
    });
});

describe('LanguageProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        (api.getLanguages as Mock).mockResolvedValue({ default: 'zh', languages: [{ code: 'zh', cards: 10 }, { code: 'en', cards: 10 }] });
    });
    afterEach(() => vi.restoreAllMocks());

    it('switches the whole interface, remembers the choice and asks for card content in that language', async () => {
        render(
            <LanguageProvider initialLanguage="zh">
                <LanguageSelect />
                <Probe />
            </LanguageProvider>,
        );
        expect(screen.getByTestId('probe')).toHaveTextContent(`zh:${zh.header.learn}`);
        expect(api.setContentLanguage).toHaveBeenLastCalledWith('zh');
        expect(document.documentElement.lang).toBe('zh-CN');

        fireEvent.click(await screen.findByRole('button', { name: zh.language.label }));
        fireEvent.click(await screen.findByText('English'));

        expect(screen.getByTestId('probe')).toHaveTextContent(`en:${en.header.learn}`);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
        expect(api.setContentLanguage).toHaveBeenLastCalledWith('en');
        expect(document.documentElement.lang).toBe('en-US');
    });

    it('offers only languages that also have card content', async () => {
        (api.getLanguages as Mock).mockResolvedValue({ default: 'zh', languages: [{ code: 'zh', cards: 10 }] });
        await act(async () => {
            render(
                <LanguageProvider initialLanguage="zh">
                    <LanguageSelect />
                </LanguageProvider>,
            );
        });
        await waitFor(() => expect(screen.queryByRole('button', { name: zh.language.label })).not.toBeInTheDocument());
    });

    it('offers every interface language when the language list cannot be loaded', async () => {
        (api.getLanguages as Mock).mockRejectedValue(new Error('offline'));
        await act(async () => {
            render(
                <LanguageProvider initialLanguage="en">
                    <LanguageSelect />
                </LanguageProvider>,
            );
        });
        fireEvent.click(screen.getByRole('button', { name: en.language.label }));
        expect(await screen.findByText('中文')).toBeInTheDocument();
    });
});
