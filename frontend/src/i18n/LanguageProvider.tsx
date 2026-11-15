import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MESSAGES, detectLanguage, storeLanguage } from './index';
import { I18nContext, type I18nValue } from './context';
import { getLanguages, setContentLanguage } from '../services/api';

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLanguage?: string }> = ({ children, initialLanguage }) => {
    const [language, setLanguageState] = useState(() => initialLanguage ?? detectLanguage());
    const [contentLanguages, setContentLanguages] = useState<string[] | null>(null);

    useEffect(() => {
        let active = true;
        getLanguages()
            .then((data) => active && setContentLanguages(data.languages.map((item) => item.code)))
            .catch(() => active && setContentLanguages(null)); // unknown: offer every UI dictionary
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        setContentLanguage(language);
        document.documentElement.lang = MESSAGES[language].locale;
    }, [language]);

    const setLanguage = useCallback((next: string) => {
        if (!MESSAGES[next]) return;
        storeLanguage(next);
        setLanguageState(next);
    }, []);

    const value = useMemo<I18nValue>(() => {
        const ui = Object.keys(MESSAGES);
        const offered = contentLanguages ? ui.filter((code) => contentLanguages.includes(code)) : ui;
        return {
            language,
            messages: MESSAGES[language],
            languages: offered.includes(language) ? offered : [language, ...offered],
            setLanguage,
        };
    }, [language, contentLanguages, setLanguage]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export { useI18n, setFallbackLanguage } from './context';
