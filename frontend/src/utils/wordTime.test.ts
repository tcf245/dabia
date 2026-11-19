import { describe, expect, it } from 'vitest';
import { formatRelativeTime, formatShortDate } from './wordTime';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const at = (offsetSeconds: number) => new Date(NOW + offsetSeconds * 1000).toISOString();

describe('formatRelativeTime', () => {
    it('picks the largest fitting unit, past and future', () => {
        expect(formatRelativeTime(at(-3 * 86400), 'en-US', NOW)).toBe('3 days ago');
        expect(formatRelativeTime(at(2 * 60), 'en-US', NOW)).toBe('in 2 minutes');
        expect(formatRelativeTime(at(-5 * 3600), 'zh-CN', NOW)).toBe('5小时前');
    });

    it('never says "0 seconds": sub-second differences round away from zero', () => {
        expect(formatRelativeTime(new Date(NOW + 300).toISOString(), 'en-US', NOW)).toBe('in 1 second');
        expect(formatRelativeTime(new Date(NOW - 300).toISOString(), 'en-US', NOW)).toBe('1 second ago');
        expect(formatRelativeTime(new Date(NOW).toISOString(), 'en-US', NOW)).toBe('in 1 second');
    });
});

describe('formatShortDate', () => {
    it('formats month and day in the locale', () => {
        expect(formatShortDate('2026-12-18T00:00:00Z', 'en-US')).toMatch(/Dec 1[78]/);
    });
});
