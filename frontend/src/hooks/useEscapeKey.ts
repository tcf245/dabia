import { useEffect } from 'react';

/** Calls `onEscape` when the Escape key is pressed while `active` is true. */
export const useEscapeKey = (active: boolean, onEscape: () => void) => {
    useEffect(() => {
        if (!active) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onEscape();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [active, onEscape]);
};
