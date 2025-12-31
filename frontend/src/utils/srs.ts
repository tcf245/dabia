/**
 * Spaced Repetition System (SRS) v3 State Machine Logic
 * Mirroring Backend: backend/dabia/core/scheduler.py
 */

export const PROFICIENCY_NEW = 1;
export const PROFICIENCY_HARD = 2;
export const PROFICIENCY_LEARNING = 3;
export const PROFICIENCY_EASY = 4;
export const PROFICIENCY_MASTERED = 5;

/**
 * Calculates the next proficiency level based on current level and result.
 * 
 * Transitions:
 * (L1, Correct) -> L5
 * (L1, Incorrect) -> L2
 * (L2, Correct) -> L3
 * (L2, Incorrect) -> L2
 * (L3, Correct) -> L4
 * (L3, Incorrect) -> L3
 * (L4, Correct) -> L5
 * (L4, Incorrect) -> L3
 * (L5, Correct) -> L5
 * (L5, Incorrect) -> L3
 */
export const calculateNextProficiency = (currentLevel: number, isCorrect: boolean): number => {
    // Treat level 0 or undefined as level 1 (New)
    const level = currentLevel || PROFICIENCY_NEW;

    if (level === PROFICIENCY_NEW) {
        return isCorrect ? PROFICIENCY_MASTERED : PROFICIENCY_HARD;
    }
    if (level === PROFICIENCY_HARD) {
        return isCorrect ? PROFICIENCY_LEARNING : PROFICIENCY_HARD;
    }
    if (level === PROFICIENCY_LEARNING) {
        return isCorrect ? PROFICIENCY_EASY : PROFICIENCY_LEARNING;
    }
    if (level === PROFICIENCY_EASY) {
        return isCorrect ? PROFICIENCY_MASTERED : PROFICIENCY_LEARNING;
    }
    if (level === PROFICIENCY_MASTERED) {
        return isCorrect ? PROFICIENCY_MASTERED : PROFICIENCY_LEARNING;
    }

    return level; // Fallback
};
