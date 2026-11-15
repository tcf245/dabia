import { renderHook, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEscapeKey } from './useEscapeKey';

describe('useEscapeKey', () => {
    it('calls the handler on Escape only while active', () => {
        const onEscape = vi.fn();
        const { rerender, unmount } = renderHook(({ active }) => useEscapeKey(active, onEscape), {
            initialProps: { active: true },
        });

        fireEvent.keyDown(window, { key: 'Enter' });
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onEscape).toHaveBeenCalledTimes(1);

        rerender({ active: false });
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onEscape).toHaveBeenCalledTimes(1);

        unmount();
    });
});
