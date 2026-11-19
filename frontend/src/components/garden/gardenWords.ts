import type { GardenWord } from '../../services/api';
import { hashString } from '../../utils/gardenLayout';

/** Colour and size per learning level: weaker words are warmer and larger. */
export const LEARNING_STYLE_BY_LEVEL: Record<number, { color: string; fontSize: number }> = {
    1: { color: '#B05030', fontSize: 30 },
    2: { color: '#D97757', fontSize: 26 },
    3: { color: '#E09074', fontSize: 23 },
    4: { color: '#E5A087', fontSize: 20 },
};

/** Keeps at most `maxWords`, about 8:6 learning to mastered, filling from the other group when one runs short. */
export function selectVisibleWords(words: readonly GardenWord[], maxWords: number): GardenWord[] {
    if (words.length <= maxWords) {
        return [...words];
    }

    const learning = words.filter((word) => word.type === 'review');
    const mastered = words.filter((word) => word.type === 'learned');

    const learningTarget = Math.ceil(maxWords * (8 / 14));
    const masteredTarget = maxWords - learningTarget;

    const pickedLearning = learning.slice(0, learningTarget);
    const pickedMastered = mastered.slice(0, masteredTarget);

    const remaining = maxWords - pickedLearning.length - pickedMastered.length;
    if (remaining > 0) {
        if (pickedLearning.length < learning.length) {
            pickedLearning.push(...learning.slice(pickedLearning.length, pickedLearning.length + remaining));
        } else if (pickedMastered.length < mastered.length) {
            pickedMastered.push(...mastered.slice(pickedMastered.length, pickedMastered.length + remaining));
        }
    }

    return [...pickedLearning, ...pickedMastered];
}

export function wordVisuals(word: GardenWord): { color: string; fontSize: number; isMastered: boolean } {
    if (word.type === 'learned') {
        return {
            color: '#2A2A29',
            fontSize: 18 + (hashString(word.card_id) % 5),
            isMastered: true,
        };
    }

    const style = LEARNING_STYLE_BY_LEVEL[word.level] ?? { color: '#D97757', fontSize: 24 };
    return { ...style, isMastered: false };
}
