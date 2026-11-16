import { createContext, useContext } from 'react';
import { DEFAULT_LANGUAGE, MESSAGES, type Messages } from './index';

export interface I18nValue {
    language: string;
    messages: Messages;
    /** Languages offered in the menu: a UI dictionary exists and the backend has card content for it. */
    languages: string[];
    setLanguage: (language: string) => void;
}

const outsideProvider = (language: string): I18nValue => ({
    language,
    messages: MESSAGES[language],
    languages: [language],
    setLanguage: () => { },
});

let fallback = outsideProvider(DEFAULT_LANGUAGE);

/** The language of components rendered without a provider: unit tests pick the language their assertions use. */
export const setFallbackLanguage = (language: string) => {
    fallback = outsideProvider(MESSAGES[language] ? language : DEFAULT_LANGUAGE);
};

export const I18nContext = createContext<I18nValue | null>(null);

/** Without a provider this is the fallback language: Chinese unless `setFallbackLanguage` changed it. */
export const useI18n = (): I18nValue => useContext(I18nContext) ?? fallback;
