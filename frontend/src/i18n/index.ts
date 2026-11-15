import { zh, type Messages } from './messages/zh';
import { en } from './messages/en';

export type { Messages } from './messages/zh';

/**
 * UI dictionaries by language code (lowercase BCP 47, the same codes the backend uses for card content).
 * To add a language: add `messages/<code>.ts` typed as `Messages`, register it here, and import its card content
 * on the backend (.ai/decisions/003-card-content-i18n.md). The menu shows a language once both exist.
 */
export const MESSAGES: Record<string, Messages> = { zh, en };
export const DEFAULT_LANGUAGE = 'zh';
export const STORAGE_KEY = 'dabia.language';

/** 'en-GB' -> 'en' when only 'en' has a dictionary; null when nothing matches. */
export const matchLanguage = (tag: string | null | undefined, available: string[] = Object.keys(MESSAGES)): string | null => {
    if (!tag) return null;
    const parts = tag.trim().toLowerCase().replace(/_/g, '-').split('-');
    for (let size = parts.length; size > 0; size--) {
        const candidate = parts.slice(0, size).join('-');
        if (available.includes(candidate)) return candidate;
    }
    return null;
};

const readStored = (): string | null => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

/** The saved choice first, then the browser's preferred languages, then Chinese. */
export const detectLanguage = (): string => {
    const preferred = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language];
    for (const tag of [readStored(), ...preferred]) {
        const match = matchLanguage(tag);
        if (match) return match;
    }
    return DEFAULT_LANGUAGE;
};

export const storeLanguage = (language: string) => {
    try {
        localStorage.setItem(STORAGE_KEY, language);
    } catch {
        // private mode or blocked storage: the choice just lasts for this visit
    }
};
