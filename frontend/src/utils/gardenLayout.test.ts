import { describe, it, expect } from 'vitest';
import {
    FLOAT_MARGIN,
    WORD_GAP,
    buildGardenSeed,
    computeGardenBlobs,
    computeGardenLayout,
    computeWordMotion,
    estimateWordBox,
    type GardenLayoutInput,
} from './gardenLayout';

const SAMPLE_WORDS: GardenLayoutInput[] = [
    { id: '1', text: '花', reading: 'はな', fontSize: 30 },
    { id: '2', text: '食べる', reading: 'たべる', fontSize: 26 },
    { id: '3', text: '図書館', reading: 'としょかん', fontSize: 23 },
    { id: '4', text: '遅延', reading: 'ちえん', fontSize: 20 },
    { id: '5', text: 'コーヒー', reading: 'コーヒー', fontSize: 22 },
    { id: '6', text: '電車', reading: 'でんしゃ', fontSize: 26 },
    { id: '7', text: '水', reading: 'みず', fontSize: 18 },
    { id: '8', text: '映画', reading: 'えいが', fontSize: 20 },
    { id: '9', text: '高校', reading: 'こうこう', fontSize: 23 },
    { id: '10', text: '毎朝', reading: 'まいあさ', fontSize: 19 },
    { id: '11', text: '友達', reading: 'ともだち', fontSize: 21 },
    { id: '12', text: '山', reading: 'やま', fontSize: 18 },
];

describe('gardenLayout', () => {
    it.each([
        { width: 320, height: 260 },
        { width: 390, height: 260 },
        { width: 768, height: 300 },
        { width: 900, height: 300 },
    ])('keeps every word inside the safe rectangle with no overlaps across 100 seeds at $width x $height', ({ width, height }) => {
        for (let i = 0; i < 100; i++) {
            const placed = computeGardenLayout(width, height, SAMPLE_WORDS, `seed-${i}`);
            expect(placed.length).toBeGreaterThan(0);

            for (const box of placed) {
                expect(box.x - box.width / 2).toBeGreaterThanOrEqual(FLOAT_MARGIN - 1e-6);
                expect(box.x + box.width / 2).toBeLessThanOrEqual(width - FLOAT_MARGIN + 1e-6);
                expect(box.y - box.height / 2).toBeGreaterThanOrEqual(FLOAT_MARGIN - 1e-6);
                expect(box.y + box.height / 2).toBeLessThanOrEqual(height - FLOAT_MARGIN + 1e-6);
            }

            for (let a = 0; a < placed.length; a++) {
                for (let b = a + 1; b < placed.length; b++) {
                    const first = placed[a];
                    const second = placed[b];
                    const separatedX = Math.abs(first.x - second.x) >= (first.width + second.width) / 2 + WORD_GAP - 1e-6;
                    const separatedY = Math.abs(first.y - second.y) >= (first.height + second.height) / 2 + WORD_GAP - 1e-6;
                    expect(separatedX || separatedY).toBe(true);
                }
            }
        }
    });

    it('produces identical layouts for the same seed and different layouts for different seeds', () => {
        const first = computeGardenLayout(768, 300, SAMPLE_WORDS, '2026-11-19:cards');
        const repeat = computeGardenLayout(768, 300, SAMPLE_WORDS, '2026-11-19:cards');
        const nextDay = computeGardenLayout(768, 300, SAMPLE_WORDS, '2026-11-20:cards');

        expect(first).toEqual(repeat);
        expect(first).not.toEqual(nextDay);
    });

    it('drops words that cannot be placed without overlapping', () => {
        const crowded: GardenLayoutInput[] = Array.from({ length: 40 }, (_, idx) => ({
            id: `crowded-${idx}`,
            text: '図書館員',
            reading: 'としょかんいん',
            fontSize: 30,
        }));

        const placed = computeGardenLayout(320, 260, crowded, 'crowded-seed');
        expect(placed.length).toBeGreaterThan(0);
        expect(placed.length).toBeLessThan(crowded.length);

        for (let a = 0; a < placed.length; a++) {
            for (let b = a + 1; b < placed.length; b++) {
                const first = placed[a];
                const second = placed[b];
                const separatedX = Math.abs(first.x - second.x) >= (first.width + second.width) / 2 + WORD_GAP - 1e-6;
                const separatedY = Math.abs(first.y - second.y) >= (first.height + second.height) / 2 + WORD_GAP - 1e-6;
                expect(separatedX || separatedY).toBe(true);
            }
        }
    });

    it('handles empty inputs, zero dimensions, and oversized words safely', () => {
        expect(computeGardenLayout(768, 300, [], 'empty')).toEqual([]);
        expect(computeGardenLayout(0, 300, SAMPLE_WORDS, 'zero-w')).toEqual([]);
        expect(computeGardenLayout(768, 0, SAMPLE_WORDS, 'zero-h')).toEqual([]);

        const oversized: GardenLayoutInput[] = [
            { id: 'huge', text: 'とても長い日本語の単語テスト文字列', reading: 'reading', fontSize: 30 },
            { id: 'small', text: '花', reading: 'はな', fontSize: 20 },
        ];
        const placed = computeGardenLayout(200, 200, oversized, 'oversized');
        expect(placed.map((item) => item.id)).toEqual(['small']);
    });

    it('builds deterministic daily seeds from card ids and date', () => {
        const day1 = new Date(2026, 10, 19, 10, 0, 0);
        const day2 = new Date(2026, 10, 20, 10, 0, 0);
        const seed1 = buildGardenSeed(['a', 'b', 'c'], day1);
        const seed1Again = buildGardenSeed(['a', 'b', 'c'], day1);
        const seed2 = buildGardenSeed(['a', 'b', 'c'], day2);

        expect(seed1).toBe(seed1Again);
        expect(seed1).toContain('2026-11-19');
        expect(seed1).toContain('a,b,c');
        expect(seed1).not.toBe(seed2);
    });

    it('computes deterministic word motion and blob positions within spec bounds', () => {
        const motionA = computeWordMotion('card-1', 'seed-1');
        const motionARepeat = computeWordMotion('card-1', 'seed-1');
        expect(motionA).toEqual(motionARepeat);
        expect(Math.abs(motionA.dx)).toBeGreaterThanOrEqual(4);
        expect(Math.abs(motionA.dx)).toBeLessThanOrEqual(7);
        expect(Math.abs(motionA.dy)).toBeGreaterThanOrEqual(4);
        expect(Math.abs(motionA.dy)).toBeLessThanOrEqual(7);
        expect(Math.abs(motionA.rot)).toBeLessThanOrEqual(1.5);
        expect(motionA.dur).toBeGreaterThanOrEqual(6);
        expect(motionA.dur).toBeLessThanOrEqual(11);
        expect(motionA.delay).toBeLessThanOrEqual(0);
        expect(motionA.delay).toBeGreaterThanOrEqual(-motionA.dur);

        const blobs = computeGardenBlobs('seed-1');
        const blobsRepeat = computeGardenBlobs('seed-1');
        expect(blobs).toEqual(blobsRepeat);
        expect(blobs).toHaveLength(2);
    });

    it('estimates a smaller box when a word has no reading line', () => {
        const withReading = estimateWordBox({ text: '花', reading: 'はな', fontSize: 20 });
        const without = estimateWordBox({ text: '花', reading: undefined, fontSize: 20 });
        expect(without.height).toBe(withReading.height - 16);
        expect(estimateWordBox({ text: 'abc', reading: undefined, fontSize: 20 }).width)
            .toBeLessThan(estimateWordBox({ text: '花花花', reading: undefined, fontSize: 20 }).width);
    });

    it('places same-sized words in input order', () => {
        const twins: GardenLayoutInput[] = [
            { id: 'a', text: '花', fontSize: 20 },
            { id: 'b', text: '木', fontSize: 20 },
        ];
        const first = computeGardenLayout(600, 300, twins, 'seed').map((p) => p.id);
        expect(first.sort()).toEqual(['a', 'b']);
        expect(computeGardenLayout(600, 300, twins, 'seed')).toEqual(computeGardenLayout(600, 300, twins, 'seed'));
    });
});
