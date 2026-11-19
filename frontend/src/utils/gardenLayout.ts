export const FLOAT_MARGIN = 8;
export const WORD_GAP = 12;
export const CANDIDATE_COUNT = 30;

export interface GardenLayoutInput {
    id: string;
    text: string;
    reading?: string | null;
    fontSize: number;
}

export interface WordBox {
    width: number;
    height: number;
}

export interface PlacedWord {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WordMotion {
    dx: number;
    dy: number;
    rot: number;
    dur: number;
    delay: number;
}

export interface GardenBlob {
    xPct: number;
    yPct: number;
}

/** FNV-1a 32-bit unsigned string hash. */
export function hashString(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/** Deterministic PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Build a daily seed combining card IDs and the local calendar date (YYYY-MM-DD). */
export function buildGardenSeed(cardIds: readonly string[], date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${cardIds.join(',')}|${year}-${month}-${day}`;
}

function estimateLineWidth(text: string, fontSize: number): number {
    let width = 0;
    for (const ch of Array.from(text)) {
        width += ch.charCodeAt(0) <= 0x7f ? fontSize * 0.6 : fontSize;
    }
    return width;
}

/** Estimate the visual bounding box of a word and its optional 10px reading line. */
export function estimateWordBox(word: Pick<GardenLayoutInput, 'text' | 'reading' | 'fontSize'>): WordBox {
    const wordWidth = estimateLineWidth(word.text, word.fontSize);
    const readingWidth = word.reading ? estimateLineWidth(word.reading, 10) : 0;
    return {
        width: Math.ceil(Math.max(wordWidth, readingWidth) + 8),
        height: Math.ceil(word.fontSize * 1.25 + (word.reading ? 16 : 0) + 4),
    };
}

function boxesOverlap(
    cx: number,
    cy: number,
    box: WordBox,
    other: PlacedWord,
    gap: number,
): boolean {
    return (
        Math.abs(cx - other.x) < (box.width + other.width) / 2 + gap &&
        Math.abs(cy - other.y) < (box.height + other.height) / 2 + gap
    );
}

function minEdgeDistance(cx: number, cy: number, box: WordBox, placed: readonly PlacedWord[]): number {
    let minDist = Infinity;
    for (const other of placed) {
        const dx = Math.max(0, Math.abs(cx - other.x) - (box.width + other.width) / 2);
        const dy = Math.max(0, Math.abs(cy - other.y) - (box.height + other.height) / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
            minDist = dist;
        }
    }
    return minDist;
}

/**
 * Place words largest-first using seeded best-candidate sampling inside the safe rectangle
 * (canvas inset by half the box plus FLOAT_MARGIN). Drops words that cannot fit without colliding.
 */
export function computeGardenLayout(
    width: number,
    height: number,
    words: readonly GardenLayoutInput[],
    seed: string,
): PlacedWord[] {
    if (width <= 0 || height <= 0 || words.length === 0) {
        return [];
    }

    const sorted = words
        .map((word, index) => ({
            word,
            index,
            box: estimateWordBox(word),
        }))
        .sort((a, b) => {
            const areaDiff = b.box.width * b.box.height - a.box.width * a.box.height;
            if (areaDiff !== 0) return areaDiff;
            const sizeDiff = b.word.fontSize - a.word.fontSize;
            if (sizeDiff !== 0) return sizeDiff;
            return a.index - b.index;
        });

    const rng = mulberry32(hashString(seed));
    const placed: PlacedWord[] = [];

    for (const { word, box } of sorted) {
        const minX = box.width / 2 + FLOAT_MARGIN;
        const maxX = width - box.width / 2 - FLOAT_MARGIN;
        const minY = box.height / 2 + FLOAT_MARGIN;
        const maxY = height - box.height / 2 - FLOAT_MARGIN;

        if (minX > maxX || minY > maxY) {
            continue;
        }

        if (placed.length === 0) {
            const x = minX + rng() * (maxX - minX);
            const y = minY + rng() * (maxY - minY);
            placed.push({ id: word.id, x, y, width: box.width, height: box.height });
            continue;
        }

        let bestX = 0;
        let bestY = 0;
        let bestScore = -1;

        for (let i = 0; i < CANDIDATE_COUNT; i++) {
            const cx = minX + rng() * (maxX - minX);
            const cy = minY + rng() * (maxY - minY);

            if (placed.some((other) => boxesOverlap(cx, cy, box, other, WORD_GAP))) {
                continue;
            }

            const score = minEdgeDistance(cx, cy, box, placed);
            if (score > bestScore) {
                bestScore = score;
                bestX = cx;
                bestY = cy;
            }
        }

        if (bestScore >= 0) {
            placed.push({ id: word.id, x: bestX, y: bestY, width: box.width, height: box.height });
        }
    }

    return placed;
}

/** Deterministic per-word drift parameters (4-7px loop, +/-1.5deg rotation, 6-11s period). */
export function computeWordMotion(wordId: string, seed: string): WordMotion {
    const rng = mulberry32(hashString(`${seed}:motion:${wordId}`));
    const sign = () => (rng() < 0.5 ? -1 : 1);
    const dx = sign() * (4 + rng() * 3);
    const dy = sign() * (4 + rng() * 3);
    const rot = sign() * (0.5 + rng() * 1.0);
    const dur = 6 + rng() * 5;
    const delay = -(rng() * dur);
    return { dx, dy, rot, dur, delay };
}

/** Deterministic positions (in %) for two soft radial background blobs. */
export function computeGardenBlobs(seed: string): [GardenBlob, GardenBlob] {
    const rng = mulberry32(hashString(`${seed}:blobs`));
    return [
        { xPct: 15 + rng() * 30, yPct: 20 + rng() * 60 },
        { xPct: 55 + rng() * 30, yPct: 20 + rng() * 60 },
    ];
}
